import cv2 as cv
import numpy as np
import os
from flask import Flask, Response, jsonify, make_response, request
from flask_cors import CORS
from flask_socketio import SocketIO
from werkzeug.utils import secure_filename
import threading
import time
import contextlib
from pathlib import Path

print("Importing Ultralytics...", flush=True)
from ultralytics import YOLO
from anomaly import AnomalyConfig, CrowdSurgeDetector
from benchmark import BenchmarkConfig, BenchmarkRunner
from cameras import CameraRegistry, compute_file_hash
from comparison import BaselineComparisonTracker
from density import DensityConfig, DensityEstimator
from deployment import resolve_deployment_profile
from metrics import MetricsConfig, MetricsTracker
from modeling import ModelConfig, ModelResolver, PerformanceTracker, current_timestamp_ms
from processing import AdaptiveFrameRateController, AdaptiveProcessingConfig
print("Ultralytics imported", flush=True)

# ---------------- APP SETUP ----------------
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ---------------- LOAD MODEL ----------------
deployment_profile = resolve_deployment_profile(os.getenv("CROWDGUARD_DEPLOYMENT_MODE"))
model_config = ModelConfig(
    selected_model=os.getenv("CROWDGUARD_MODEL", deployment_profile.preferred_model),
    metrics_window_size=deployment_profile.metrics_window_size,
)
model_selection = ModelResolver(base_dir=BASE_DIR, config=model_config).resolve()

print("Loading YOLO model...", flush=True)
model = YOLO(model_selection.resolved_path)
print(
    f"YOLO model loaded from {model_selection.resolved_path} "
    f"(requested={model_selection.requested_model}, active={model_selection.active_model})",
    flush=True,
)

# ---------------- GLOBAL STATE ----------------
alerts_store = []
alerts_lock = threading.Lock()
alert_id_counter = 0
high_density_events = 0

HIGH_ENTRY_FRAMES = 5
HIGH_EXIT_FRAMES = 8
MAX_ALERT_HISTORY = 100
train_state = {
    "status": "idle",
    "progress": 0,
    "message": "Idle - waiting to start training",
}
training_lock = threading.Lock()
uploads_dir = BASE_DIR / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
density_config = DensityConfig()
anomaly_config = AnomalyConfig()
adaptive_processing_config = AdaptiveProcessingConfig(
    min_interval_seconds=deployment_profile.min_interval_seconds,
    max_interval_seconds=deployment_profile.max_interval_seconds,
    stable_streak_for_slowdown=deployment_profile.stable_streak_for_slowdown,
)
metrics_config = MetricsConfig()
benchmark_config = BenchmarkConfig()
benchmark_runner = BenchmarkRunner(
    base_dir=BASE_DIR,
    model=model,
    density_estimator=DensityEstimator(config=density_config),
    config=benchmark_config,
)
camera_registry = CameraRegistry(base_dir=BASE_DIR)
DEFAULT_CAMERA_ID = camera_registry.first_camera_id()


def initialize_camera_state(camera_state):
    camera_state.density_estimator = DensityEstimator(config=density_config)
    camera_state.surge_detector = CrowdSurgeDetector(config=anomaly_config)
    camera_state.frame_rate_controller = AdaptiveFrameRateController(config=adaptive_processing_config)
    camera_state.performance_tracker = PerformanceTracker(window_size=model_config.metrics_window_size)
    camera_metrics_config = MetricsConfig(
        metrics_log_path=f"metrics_{camera_state.config.camera_id}.json",
        ground_truth_counts_path=metrics_config.ground_truth_counts_path,
        rolling_window_size=metrics_config.rolling_window_size,
    )
    camera_state.metrics_tracker = MetricsTracker(base_dir=BASE_DIR, config=camera_metrics_config)
    camera_state.comparison_tracker = BaselineComparisonTracker(window_size=120)
    camera_state.processing_started = False


def start_camera_processing(camera_state):
    if camera_state.processing_started:
        return
    camera_state.active = True
    camera_state.processing_started = True
    socketio.start_background_task(detection_loop, camera_state)


def update_default_camera(preferred_camera_id=None):
    global DEFAULT_CAMERA_ID

    if preferred_camera_id and camera_registry.get(preferred_camera_id) is not None:
        DEFAULT_CAMERA_ID = preferred_camera_id
    else:
        DEFAULT_CAMERA_ID = camera_registry.first_camera_id()


def build_cors_preflight_response():
    response = make_response("", 204)
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("Access-Control-Request-Headers", "Content-Type")
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("Access-Control-Request-Headers", "Content-Type")
    return response


for camera_state in camera_registry.all():
    initialize_camera_state(camera_state)


def next_alert_id():
    global alert_id_counter
    alert_id_counter += 1
    return f"alert-{int(time.time() * 1000)}-{alert_id_counter}"


def active_alerts(camera_id=None):
    with alerts_lock:
        alerts = [dict(alert) for alert in alerts_store if alert.get("status") == "active"]
        if camera_id is None:
            return alerts
        return [alert for alert in alerts if alert.get("camera_id") == camera_id]


def broadcast_alert_snapshot():
    socketio.emit("alerts_snapshot", {
        "alerts": list(alerts_store),
        "active_alerts_count": len(active_alerts()),
        "total_events": high_density_events,
    })


def create_high_density_alert(camera_state, count, zones):
    global high_density_events

    alert = {
        "id": next_alert_id(),
        "camera_id": camera_state.config.camera_id,
        "camera_name": camera_state.config.display_name,
        "time": time.strftime("%H:%M:%S"),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "type": "critical",
        "title": f"High density threshold reached: {count} people",
        "message": f"Zone distribution: {zones}",
        "severity": "high",
        "action": True,
        "status": "active",
        "response": "pending",
        "people_count": count,
        "peak_people_count": count,
        "zones": list(zones),
    }

    with alerts_lock:
        alerts_store.insert(0, alert)
        del alerts_store[MAX_ALERT_HISTORY:]
        camera_state.active_alert_id = alert["id"]

    high_density_events += 1
    socketio.emit("new_alert", alert)
    broadcast_alert_snapshot()


def create_surge_alert(camera_state, count, zones, anomaly_result):

    alert = {
        "id": next_alert_id(),
        "camera_id": camera_state.config.camera_id,
        "camera_name": camera_state.config.display_name,
        "time": time.strftime("%H:%M:%S"),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "type": "SURGE_ALERT",
        "title": f"Crowd surge detected: +{anomaly_result.count_delta} people",
        "message": (
            f"Sudden increase observed with delta={anomaly_result.count_delta} "
            f"and velocity={anomaly_result.velocity:.2f} people/sec."
        ),
        "severity": "high",
        "action": True,
        "status": "active",
        "response": "pending",
        "people_count": count,
        "peak_people_count": count,
        "zones": list(zones),
        "count_delta": anomaly_result.count_delta,
        "velocity": round(anomaly_result.velocity, 3),
    }

    with alerts_lock:
        alerts_store.insert(0, alert)
        del alerts_store[MAX_ALERT_HISTORY:]
        camera_state.active_surge_alert_id = alert["id"]

    socketio.emit("new_alert", alert)
    broadcast_alert_snapshot()


def update_active_alert(camera_state, count, zones):
    if not camera_state.active_alert_id:
        return

    with alerts_lock:
        alert = next((item for item in alerts_store if item["id"] == camera_state.active_alert_id), None)
        if alert is None or alert.get("status") != "active":
            camera_state.active_alert_id = None
            return

        peak_people_count = max(alert.get("peak_people_count", 0), count)
        changed = peak_people_count != alert.get("peak_people_count") or alert.get("people_count") != count or alert.get("zones") != list(zones)

        alert["people_count"] = count
        alert["peak_people_count"] = peak_people_count
        alert["zones"] = list(zones)
        alert["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        alert["message"] = f"Zone distribution: {zones}"
        alert["title"] = f"High density threshold reached: {peak_people_count} people"

    if changed:
        socketio.emit("alert_updated", alert)


def update_active_surge_alert(camera_state, count, zones, anomaly_result):
    if not camera_state.active_surge_alert_id:
        return

    with alerts_lock:
        alert = next((item for item in alerts_store if item["id"] == camera_state.active_surge_alert_id), None)
        if alert is None or alert.get("status") != "active":
            camera_state.active_surge_alert_id = None
            return

        peak_people_count = max(alert.get("peak_people_count", 0), count)
        changed = (
            peak_people_count != alert.get("peak_people_count")
            or alert.get("people_count") != count
            or alert.get("zones") != list(zones)
            or alert.get("count_delta") != anomaly_result.count_delta
            or alert.get("velocity") != round(anomaly_result.velocity, 3)
        )

        alert["people_count"] = count
        alert["peak_people_count"] = peak_people_count
        alert["zones"] = list(zones)
        alert["count_delta"] = anomaly_result.count_delta
        alert["velocity"] = round(anomaly_result.velocity, 3)
        alert["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        alert["message"] = (
            f"Sudden increase observed with delta={anomaly_result.count_delta} "
            f"and velocity={anomaly_result.velocity:.2f} people/sec."
        )
        alert["title"] = f"Crowd surge detected: +{anomaly_result.count_delta} people"

    if changed:
        socketio.emit("alert_updated", alert)


def resolve_active_alert(camera_state, count, zones):
    if not camera_state.active_alert_id:
        return

    with alerts_lock:
        alert = next((item for item in alerts_store if item["id"] == camera_state.active_alert_id), None)
        if alert is None or alert.get("status") != "active":
            camera_state.active_alert_id = None
            return

        alert["status"] = "resolved"
        alert["resolved_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        alert["updated_at"] = alert["resolved_at"]
        alert["people_count"] = count
        alert["zones"] = list(zones)
        alert["message"] = f"Density returned below the high threshold. Final zone distribution: {zones}"
        camera_state.active_alert_id = None

    socketio.emit("alert_updated", alert)
    broadcast_alert_snapshot()


def resolve_active_surge_alert(camera_state, count, zones):
    if not camera_state.active_surge_alert_id:
        return

    with alerts_lock:
        alert = next((item for item in alerts_store if item["id"] == camera_state.active_surge_alert_id), None)
        if alert is None or alert.get("status") != "active":
            camera_state.active_surge_alert_id = None
            return

        alert["status"] = "resolved"
        alert["resolved_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        alert["updated_at"] = alert["resolved_at"]
        alert["people_count"] = count
        alert["zones"] = list(zones)
        alert["message"] = (
            "Crowd surge condition cleared after the count stabilized. "
            f"Final zone distribution: {zones}"
        )
        camera_state.active_surge_alert_id = None

    socketio.emit("alert_updated", alert)
    broadcast_alert_snapshot()

# ---------------- PREPROCESS ----------------
def preprocess_frame(frame):
    frame = cv.resize(frame, (640, 480))
    lab = cv.cvtColor(frame, cv.COLOR_BGR2LAB)
    l, a, b = cv.split(lab)
    l = cv.createCLAHE(2.0, (8, 8)).apply(l)
    frame = cv.merge((l, a, b))
    return cv.cvtColor(frame, cv.COLOR_LAB2BGR)

# ---------------- DETECTION LOOP ----------------
def detection_loop(camera_state):
    cap = cv.VideoCapture(camera_state.config.source)
    if not cap.isOpened():
        print(f"Failed to open video source for {camera_state.config.camera_id}: {camera_state.config.source}", flush=True)
        return

    print(f"Detection loop started for {camera_state.config.camera_id}", flush=True)

    while cap.isOpened() and camera_state.active:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv.CAP_PROP_POS_FRAMES, 0)
            camera_state.frame_index = 0
            continue

        frame = preprocess_frame(frame)
        h, w, _ = frame.shape

        # Run YOLO
        inference_start_ms = current_timestamp_ms()
        results = model(frame, conf=0.4, iou=0.5, verbose=False)[0]
        inference_latency_ms = current_timestamp_ms() - inference_start_ms

        # Heatmap buffer
        heatmap = np.zeros((h, w), dtype=np.float32)
        person_centers = []

        count = 0

        zones = [0, 0, 0, 0]
        if results.boxes:
            for box in results.boxes:
                if int(box.cls[0]) == 0:  # person class
                    x1, y1, x2, y2 = map(int, box.xyxy[0])

                    # head-level center (better for crowds)
                    cx = int((x1 + x2) / 2)
                    cy = y1 + int((y2 - y1) * 0.2)

                    person_centers.append((cx, cy))
                    count += 1
                    
                    # Quadrant assignment
                    if cx < 320 and cy < 240:
                        zones[0] += 1
                    elif cx >= 320 and cy < 240:
                        zones[1] += 1
                    elif cx < 320 and cy >= 240:
                        zones[2] += 1
                    else:
                        zones[3] += 1

        # ---------------- CALCULATE ZONES ----------------
        zones = [0, 0, 0, 0]
        for cx, cy in person_centers:
            if cx < w / 2 and cy < h / 2:
                zones[0] += 1
            elif cx >= w / 2 and cy < h / 2:
                zones[1] += 1
            elif cx < w / 2 and cy >= h / 2:
                zones[2] += 1
            else:
                zones[3] += 1

        # ---------------- BUILD HEATMAP ----------------
        for (cx, cy) in person_centers:
            cv.circle(heatmap, (cx, cy), 12, 1.0, -1)

        heatmap = cv.GaussianBlur(heatmap, (0, 0), 10)
        heatmap = cv.normalize(heatmap, None, 0, 255, cv.NORM_MINMAX)
        heatmap = heatmap.astype(np.uint8)


        heatmap_color = cv.applyColorMap(
            np.uint8(heatmap * 255),
            cv.COLORMAP_TURBO
        )
        gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        frame = cv.cvtColor(gray, cv.COLOR_GRAY2BGR)


        # Overlay heatmap
        frame = cv.addWeighted(frame, 0.85, heatmap_color, 0.15, 0)

        # Draw person points
        for (cx, cy) in person_centers:
            cv.circle(frame, (cx, cy), 4, (0, 255, 0), -1)

        density_result = camera_state.density_estimator.compute(
            person_centers=person_centers,
            person_count=count,
            frame_shape=(h, w),
        )
        density = density_result.label
        anomaly_result = camera_state.surge_detector.update(current_count=count, timestamp=time.time())
        processing_interval = camera_state.frame_rate_controller.update(
            people_count=count,
            smoothed_density=density_result.smoothed_weighted_density,
        )
        camera_state.performance_tracker.record(
            latency_ms=inference_latency_ms,
            timestamp=time.perf_counter(),
            detection_count=count,
        )
        performance_snapshot = camera_state.performance_tracker.snapshot()
        camera_state.metrics_tracker.record(
            frame_index=camera_state.frame_index,
            people_count=count,
            density_label=density,
            weighted_density=density_result.weighted_density,
            smoothed_weighted_density=density_result.smoothed_weighted_density,
            processing_fps=camera_state.frame_rate_controller.current_fps,
            inference_latency_ms=inference_latency_ms,
        )
        metrics_summary = camera_state.metrics_tracker.summary()
        camera_state.comparison_tracker.record(
            frame_index=camera_state.frame_index,
            people_count=count,
            baseline_label=density_result.baseline_label,
            improved_label=density_result.label,
            baseline_score=density_result.baseline_density_score,
            improved_score=density_result.smoothed_weighted_density,
            adaptive_thresholds=density_result.adaptive_thresholds,
        )
        comparison_summary = camera_state.comparison_tracker.summary()

        if density == "HIGH":
            camera_state.high_entry_streak += 1
            camera_state.high_exit_streak = 0
        else:
            camera_state.high_exit_streak += 1
            camera_state.high_entry_streak = 0

        if camera_state.current_density_state != "HIGH" and camera_state.high_entry_streak >= HIGH_ENTRY_FRAMES:
            camera_state.current_density_state = "HIGH"
            create_high_density_alert(camera_state, count, zones)
        elif camera_state.current_density_state == "HIGH":
            update_active_alert(camera_state, count, zones)

        if camera_state.current_density_state == "HIGH" and camera_state.high_exit_streak >= HIGH_EXIT_FRAMES:
            camera_state.current_density_state = density
            resolve_active_alert(camera_state, count, zones)

        if anomaly_result.is_anomaly and not camera_state.active_surge_alert_id:
            create_surge_alert(camera_state, count, zones, anomaly_result)
        elif anomaly_result.is_anomaly:
            update_active_surge_alert(camera_state, count, zones, anomaly_result)
        elif camera_state.active_surge_alert_id and camera_state.surge_detector.should_clear():
            resolve_active_surge_alert(camera_state, count, zones)

        # HUD
        cv.putText(
            frame,
            f"People: {count} | Density: {density}",
            (10, 30),
            cv.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 0, 255),
            2
        )

        with camera_state.frame_lock:
            camera_state.latest_frame = frame.copy()

        # Store latest zones
        camera_state.latest_zones[:] = zones

        # Push real-time data to frontend
        socketio.emit("crowd_update", {
            "camera_id": camera_state.config.camera_id,
            "camera_name": camera_state.config.display_name,
            "deployment_mode": deployment_profile.name,
            "people_count": count,
            "density": density,
<<<<<<< HEAD
            "baseline_density": density_result.baseline_label,
            "weighted_density": round(density_result.weighted_density, 6),
            "smoothed_weighted_density": round(density_result.smoothed_weighted_density, 6),
            "density_smoothing_alpha": density_config.smoothing_alpha,
            "baseline_density_score": round(density_result.baseline_density_score, 6),
            "adaptive_density_thresholds": [round(value, 6) for value in density_result.adaptive_thresholds],
            "adaptive_threshold_window": density_config.adaptive_threshold_window,
            "perspective_zones": density_result.perspective_zone_counts,
            "perspective_zone_score": [round(score, 3) for score in density_result.perspective_zone_score],
            "surge_alert_active": camera_state.active_surge_alert_id is not None,
            "count_delta": anomaly_result.count_delta,
            "count_velocity": round(anomaly_result.velocity, 3),
            "processing_interval_seconds": round(processing_interval, 3),
            "processing_fps": round(camera_state.frame_rate_controller.current_fps, 2),
            "model_name": model_selection.active_model,
            "requested_model": model_selection.requested_model,
            "model_fallback_used": model_selection.fallback_used,
            "inference_latency_ms": round(inference_latency_ms, 2),
            "measured_fps": performance_snapshot["measured_fps"],
            "average_latency_ms": performance_snapshot["latency_ms"],
        socketio.emit("crowd_update", {
            "camera_id": camera_state.config.camera_id,
            "camera_name": camera_state.config.display_name,
            "deployment_mode": deployment_profile.name,
            "people_count": count,
            "density": density,
            "baseline_density": density_result.baseline_label,
            "weighted_density": round(density_result.weighted_density, 6),
            "smoothed_weighted_density": round(density_result.smoothed_weighted_density, 6),
            "density_smoothing_alpha": density_config.smoothing_alpha,
            "baseline_density_score": round(density_result.baseline_density_score, 6),
            "adaptive_density_thresholds": [round(value, 6) for value in density_result.adaptive_thresholds],
            "adaptive_threshold_window": density_config.adaptive_threshold_window,
            "perspective_zones": density_result.perspective_zone_counts,
            "perspective_zone_score": [round(score, 3) for score in density_result.perspective_zone_score],
            "surge_alert_active": camera_state.active_surge_alert_id is not None,
            "count_delta": anomaly_result.count_delta,
            "count_velocity": round(anomaly_result.velocity, 3),
            "processing_interval_seconds": round(processing_interval, 3),
            "processing_fps": round(camera_state.frame_rate_controller.current_fps, 2),
            "model_name": model_selection.active_model,
            "requested_model": model_selection.requested_model,
            "model_fallback_used": model_selection.fallback_used,
            "inference_latency_ms": round(inference_latency_ms, 2),
            "measured_fps": performance_snapshot["measured_fps"],
            "average_latency_ms": performance_snapshot["latency_ms"],
            "average_detection_count": performance_snapshot["average_detection_count"],
            "accuracy_available": performance_snapshot["accuracy_available"],
            "metrics": metrics_summary,
            "density_comparison": comparison_summary,
            "zones": zones,
            "alerts_count": len(active_alerts(camera_state.config.camera_id)),
            "high_density_events": high_density_events
        })
        })

        camera_state.frame_index += 1
        time.sleep(processing_interval)

    cap.release()

# ---------------- VIDEO STREAM ----------------
def generate_frames(camera_id=None):
    target_camera_id = camera_id or DEFAULT_CAMERA_ID
    if not target_camera_id:
        return
    camera_state = camera_registry.get(target_camera_id)
    if camera_state is None:
        return
    while True:
        with camera_state.frame_lock:
            if camera_state.latest_frame is None:
                time.sleep(0.1)
                continue
            _, buffer = cv.imencode(".jpg", camera_state.latest_frame)

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() + b"\r\n"
        )

@app.route("/video")
def video():
    if DEFAULT_CAMERA_ID is None:
        return jsonify({"error": "no camera nodes available"}), 404
    return Response(
        generate_frames(DEFAULT_CAMERA_ID),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/video/<camera_id>")
def video_by_camera(camera_id):
    if camera_registry.get(camera_id) is None:
        return jsonify({"error": "camera not found"}), 404
    return Response(
        generate_frames(camera_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/")
def index():
    return {
        "status": "ok",
        "video_url": "/video" if DEFAULT_CAMERA_ID else None,
        "default_camera_id": DEFAULT_CAMERA_ID,
        "cameras": camera_registry.serialize(),
        "socketio_async_mode": socketio.async_mode,
        "deployment": {
            "mode": deployment_profile.name,
            "preferred_model": deployment_profile.preferred_model,
            "benchmark_enabled": deployment_profile.benchmark_enabled,
            "notes": deployment_profile.notes,
        },
        "model": {
            "requested_model": model_selection.requested_model,
            "active_model": model_selection.active_model,
            "resolved_path": model_selection.resolved_path,
            "fallback_used": model_selection.fallback_used,
        },
    }


@app.route("/api/model", methods=["GET"])
def get_model_info():
    return jsonify({
        "deployment_mode": deployment_profile.name,
        "requested_model": model_selection.requested_model,
        "active_model": model_selection.active_model,
        "resolved_path": model_selection.resolved_path,
        "fallback_used": model_selection.fallback_used,
        "available_models": list(model_config.available_models),
        "accuracy_available": False,
        "notes": "Accuracy comparison requires benchmark labels or ground-truth annotations.",
    })


@app.route("/api/deployment", methods=["GET"])
def get_deployment_info():
    return jsonify({
        "mode": deployment_profile.name,
        "preferred_model": deployment_profile.preferred_model,
        "metrics_window_size": model_config.metrics_window_size,
        "benchmark_enabled": deployment_profile.benchmark_enabled,
        "adaptive_processing": {
            "min_interval_seconds": adaptive_processing_config.min_interval_seconds,
            "max_interval_seconds": adaptive_processing_config.max_interval_seconds,
            "stable_streak_for_slowdown": adaptive_processing_config.stable_streak_for_slowdown,
        },
        "notes": deployment_profile.notes,
    })


@app.route("/api/cameras", methods=["GET"])
def get_cameras():
    return jsonify({
        "default_camera_id": DEFAULT_CAMERA_ID,
        "cameras": camera_registry.serialize(),
    })


@app.route("/api/cameras/upload", methods=["POST", "OPTIONS"])
def upload_camera_video():
    if request.method == "OPTIONS":
        return build_cors_preflight_response()

    uploaded_file = request.files.get("video")
    if uploaded_file is None or not uploaded_file.filename:
        return jsonify({"error": "video file is required"}), 400

    filename = secure_filename(uploaded_file.filename)
    if not filename:
        return jsonify({"error": "invalid filename"}), 400

    extension = Path(filename).suffix.lower()
    allowed_extensions = {".mp4", ".avi", ".mov", ".mkv"}
    if extension not in allowed_extensions:
        return jsonify({"error": "unsupported video format"}), 400

    target_path = uploads_dir / filename
    stem = Path(filename).stem
    duplicate_index = 1
    while target_path.exists():
        target_path = uploads_dir / f"{stem}_{duplicate_index}{extension}"
        duplicate_index += 1

    uploaded_file.save(target_path)
    uploaded_file_hash = compute_file_hash(target_path)
    duplicate_camera = camera_registry.find_duplicate_managed_camera(uploaded_file_hash)
    if duplicate_camera is not None:
        with contextlib.suppress(OSError):
            target_path.unlink()
        return jsonify({
            "error": "duplicate video upload detected",
            "camera_id": duplicate_camera.config.camera_id,
            "display_name": duplicate_camera.config.display_name,
            "source": duplicate_camera.config.source,
        }), 409

    display_name = request.form.get("display_name") or Path(target_path.name).stem.replace("_", " ").title()
    camera_state = camera_registry.ensure_camera(source=str(target_path), display_name=display_name, managed=True)
    camera_registry.set_file_hash(camera_state.config.camera_id, uploaded_file_hash)
    if camera_state.density_estimator is None:
        initialize_camera_state(camera_state)
    start_camera_processing(camera_state)
    camera_registry.persist()

    if DEFAULT_CAMERA_ID is None:
        update_default_camera(camera_state.config.camera_id)

    return jsonify({
        "status": "uploaded",
        "camera_id": camera_state.config.camera_id,
        "display_name": camera_state.config.display_name,
        "source": camera_state.config.source,
        "managed": camera_state.config.managed,
        "default_camera_id": DEFAULT_CAMERA_ID,
    })


@app.route("/api/cameras/<camera_id>", methods=["PATCH", "OPTIONS"])
def update_camera(camera_id):
    if request.method == "OPTIONS":
        return build_cors_preflight_response()

    camera_state = camera_registry.get(camera_id)
    if camera_state is None:
        return jsonify({"error": "camera not found"}), 404

    payload = request.get_json(silent=True) or {}
    display_name = (payload.get("display_name") or "").strip()
    if not display_name:
        return jsonify({"error": "display_name is required"}), 400

    updated_state = camera_registry.update_display_name(camera_id, display_name)
    if updated_state is None:
        return jsonify({"error": "camera not found"}), 404

    if updated_state.config.managed:
        camera_registry.persist()

    return jsonify({
        "status": "updated",
        "camera": {
            "camera_id": updated_state.config.camera_id,
            "display_name": updated_state.config.display_name,
            "source": updated_state.config.source,
            "managed": updated_state.config.managed,
        },
    })


@app.route("/api/cameras/<camera_id>", methods=["DELETE", "OPTIONS"])
def delete_camera(camera_id):
    if request.method == "OPTIONS":
        return build_cors_preflight_response()

    camera_state = camera_registry.get(camera_id)
    if camera_state is None:
        return jsonify({"error": "camera not found"}), 404

    if not camera_state.config.managed:
        return jsonify({"error": "only uploaded camera nodes can be removed"}), 403

    removed_state = camera_registry.remove(camera_id)
    if removed_state is None:
        return jsonify({"error": "camera not found"}), 404
    removed_state.active = False
    removed_state.processing_started = False

    source_path = Path(removed_state.config.source)
    with contextlib.suppress(OSError):
        if source_path.exists():
            source_path.unlink()

    metrics_path = BASE_DIR / f"metrics_{camera_id}.json"
    with contextlib.suppress(OSError):
        if metrics_path.exists():
            metrics_path.unlink()

    update_default_camera()
    camera_registry.persist()

    with alerts_lock:
        for alert in alerts_store:
            if alert.get("camera_id") == camera_id and alert.get("status") == "active":
                alert["status"] = "removed"
                alert["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
                alert["message"] = "Camera node was removed from the system."

    broadcast_alert_snapshot()
    return jsonify({
        "status": "deleted",
        "camera_id": camera_id,
        "default_camera_id": DEFAULT_CAMERA_ID,
        "cameras": camera_registry.serialize(),
    })


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    camera_id = request.args.get("camera_id") or DEFAULT_CAMERA_ID
    camera_state = camera_registry.get(camera_id)
    if camera_state is None:
        return jsonify({"error": "camera not found"}), 404
    summary = camera_state.metrics_tracker.summary()
    return jsonify({
        **summary,
        "camera_id": camera_id,
        "metrics_log_path": str(BASE_DIR / f"metrics_{camera_id}.json"),
        "ground_truth_counts_path": str(BASE_DIR / metrics_config.ground_truth_counts_path),
    })


@app.route("/api/benchmark", methods=["GET", "POST"])
def benchmark():
    if not deployment_profile.benchmark_enabled:
        return jsonify({
            "error": "benchmark mode disabled in current deployment profile",
            "deployment_mode": deployment_profile.name,
        }), 403

    if request.method == "GET":
        return jsonify({
            "deployment_mode": deployment_profile.name,
            "input_folder": str(BASE_DIR / benchmark_config.input_folder),
            "output_folder": str(BASE_DIR / benchmark_config.output_folder),
            "available_videos": benchmark_runner.list_videos(),
            "allowed_extensions": list(benchmark_config.allowed_extensions),
        })

    payload = request.get_json(silent=True) or {}
    input_folder = payload.get("input_folder")
    result = benchmark_runner.run(input_folder=input_folder)
    return jsonify(result)


@app.route("/api/comparison", methods=["GET"])
def get_comparison():
    camera_id = request.args.get("camera_id") or DEFAULT_CAMERA_ID
    camera_state = camera_registry.get(camera_id)
    if camera_state is None:
        return jsonify({"error": "camera not found"}), 404
    summary = camera_state.comparison_tracker.summary()
    return jsonify(summary)

@app.route('/api/zones', methods=['GET'])
def get_zones():
    if DEFAULT_CAMERA_ID is None:
        return jsonify({
            'camera_id': None,
            'zones': [],
            'total_people': 0,
        })
    camera_state = camera_registry.get(DEFAULT_CAMERA_ID)
    return jsonify({
        'camera_id': DEFAULT_CAMERA_ID,
        'zones': camera_state.latest_zones if camera_state else [0, 0, 0, 0],
        'total_people': sum(camera_state.latest_zones) if camera_state else 0
    })


@app.route('/api/cameras/<camera_id>/zones', methods=['GET'])
def get_camera_zones(camera_id):
    camera_state = camera_registry.get(camera_id)
    if camera_state is None:
        return jsonify({'error': 'camera not found'}), 404
    return jsonify({
        'camera_id': camera_id,
        'zones': camera_state.latest_zones,
        'total_people': sum(camera_state.latest_zones)
    })

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    status = request.args.get('status')
    camera_id = request.args.get('camera_id')
    with alerts_lock:
        if status:
            filtered_alerts = [alert for alert in alerts_store if alert.get('status') == status]
        else:
            filtered_alerts = list(alerts_store)
        if camera_id:
            filtered_alerts = [alert for alert in filtered_alerts if alert.get('camera_id') == camera_id]
        active_count = sum(1 for alert in alerts_store if alert.get('status') == 'active')
        if camera_id:
            active_count = sum(1 for alert in alerts_store if alert.get('status') == 'active' and alert.get('camera_id') == camera_id)

    return jsonify({
        'alerts': filtered_alerts,
        'alerts_count': len(filtered_alerts),
        'active_alerts_count': active_count,
        'total_events': high_density_events,
    })

@app.route('/api/alerts/<alert_id>/action', methods=['POST'])
def alert_action(alert_id):
    payload = request.get_json() or {}
    action = payload.get('action')

    with alerts_lock:
        alert = next((item for item in alerts_store if item['id'] == alert_id), None)
        if alert is None:
            return jsonify({'error': 'alert not found'}), 404

        if action == 'dispatch':
            if alert.get('status') != 'active':
                return jsonify({'error': 'only active alerts can be dispatched'}), 409
            alert['response'] = 'dispatched'
            alert['dispatched_at'] = time.strftime("%Y-%m-%d %H:%M:%S")
            alert['updated_at'] = alert['dispatched_at']
            updated_alert = dict(alert)

        elif action == 'ignore':
            alert['status'] = 'ignored'
            alert['ignored_at'] = time.strftime("%Y-%m-%d %H:%M:%S")
            alert['updated_at'] = alert['ignored_at']
            camera_state = camera_registry.get(alert.get('camera_id', ''))
            if camera_state and camera_state.active_alert_id == alert_id:
                camera_state.active_alert_id = None
            if camera_state and camera_state.active_surge_alert_id == alert_id:
                camera_state.active_surge_alert_id = None
            updated_alert = dict(alert)
        else:
            return jsonify({'error': 'invalid action'}), 400

    socketio.emit('alert_updated', updated_alert)
    broadcast_alert_snapshot()
    return jsonify({'status': 'ok', 'alert': updated_alert})

@app.route('/api/training', methods=['GET', 'POST'])
def training():
    if request.method == 'GET':
        return jsonify(train_state)

    payload = request.get_json() or {}
    action = payload.get('action')

    if action == 'start':
        with training_lock:
            if train_state['status'] == 'running':
                return jsonify({'status': 'running', 'message': 'Training already running'}), 409
            train_state.update({'status': 'running', 'progress': 0, 'message': 'Initializing training'})

        socketio.start_background_task(run_training)
        return jsonify({'status': 'running', 'message': 'Training started'})

    if action == 'stop':
        with training_lock:
            if train_state['status'] != 'running':
                return jsonify({'status': train_state['status'], 'message': 'No active training to stop'}), 409
            train_state['status'] = 'stopping'
            train_state['message'] = 'Stopping training...'
        return jsonify({'status': 'stopping', 'message': 'Training stop request accepted'})

    return jsonify({'error': 'invalid action'}), 400


def run_training():
    global train_state
    print('AI training job started', flush=True)

    for pct in range(1, 11):
        with training_lock:
            if train_state['status'] == 'stopping':
                train_state.update({'status': 'stopped', 'progress': pct * 10, 'message': 'Training interrupted'})
                socketio.emit('training_update', train_state)
                return
            train_state.update({'status': 'running', 'progress': pct * 10, 'message': f'Training {pct*10}% complete'})

        socketio.emit('training_update', train_state)
        time.sleep(1)

    with training_lock:
        train_state.update({'status': 'completed', 'progress': 100, 'message': 'Training complete'})

    socketio.emit('training_update', train_state)
    print('AI training job completed', flush=True)

# ---------------- SOCKET EVENTS ----------------
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    broadcast_alert_snapshot()

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# ---------------- MAIN ----------------
if __name__ == "__main__":
    print(
        f"Deployment mode: {deployment_profile.name} "
        f"(preferred_model={deployment_profile.preferred_model})",
        flush=True,
    )
    print(f"Starting server with async mode: {socketio.async_mode}", flush=True)
    for camera_state in camera_registry.all():
        start_camera_processing(camera_state)
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)

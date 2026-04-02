import cv2 as cv
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
import threading
import time
from pathlib import Path

print("Importing Ultralytics...", flush=True)
from ultralytics import YOLO
print("Ultralytics imported", flush=True)

# ---------------- APP SETUP ----------------
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ---------------- LOAD MODEL ----------------
print("Loading YOLO model...", flush=True)
model = YOLO(str(BASE_DIR / "best.pt"))   # your trained model
print(f"YOLO model loaded from {BASE_DIR / 'best.pt'}", flush=True)

# ---------------- GLOBAL STATE ----------------
latest_frame = None
lock = threading.Lock()
latest_zones = [0, 0, 0, 0]
alerts_store = []
alerts_lock = threading.Lock()
alert_id_counter = 0
high_density_events = 0
current_density_state = "LOW"
high_entry_streak = 0
high_exit_streak = 0
active_alert_id = None

HIGH_ENTRY_FRAMES = 5
HIGH_EXIT_FRAMES = 8
MAX_ALERT_HISTORY = 100
train_state = {
    "status": "idle",
    "progress": 0,
    "message": "Idle - waiting to start training",
}
training_lock = threading.Lock()


def next_alert_id():
    global alert_id_counter
    alert_id_counter += 1
    return f"alert-{int(time.time() * 1000)}-{alert_id_counter}"


def active_alerts():
    with alerts_lock:
        return [dict(alert) for alert in alerts_store if alert.get("status") == "active"]


def broadcast_alert_snapshot():
    socketio.emit("alerts_snapshot", {
        "alerts": list(alerts_store),
        "active_alerts_count": len(active_alerts()),
        "total_events": high_density_events,
    })


def create_high_density_alert(count, zones):
    global high_density_events, active_alert_id

    alert = {
        "id": next_alert_id(),
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
        active_alert_id = alert["id"]

    high_density_events += 1
    socketio.emit("new_alert", alert)
    broadcast_alert_snapshot()


def update_active_alert(count, zones):
    global active_alert_id

    if not active_alert_id:
        return

    with alerts_lock:
        alert = next((item for item in alerts_store if item["id"] == active_alert_id), None)
        if alert is None or alert.get("status") != "active":
            active_alert_id = None
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


def resolve_active_alert(count, zones):
    global active_alert_id

    if not active_alert_id:
        return

    with alerts_lock:
        alert = next((item for item in alerts_store if item["id"] == active_alert_id), None)
        if alert is None or alert.get("status") != "active":
            active_alert_id = None
            return

        alert["status"] = "resolved"
        alert["resolved_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        alert["updated_at"] = alert["resolved_at"]
        alert["people_count"] = count
        alert["zones"] = list(zones)
        alert["message"] = f"Density returned below the high threshold. Final zone distribution: {zones}"
        active_alert_id = None

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

# ---------------- DENSITY LOGIC ----------------
def get_density(count):
    if count < 25:
        return "LOW"
    elif count < 50:
        return "MEDIUM"
    else:
        return "HIGH"

# ---------------- DETECTION LOOP ----------------
def detection_loop():
    global latest_frame, current_density_state, high_entry_streak, high_exit_streak

    cap = cv.VideoCapture(str(BASE_DIR / "data" / "road_show.mp4"))  # or 0 for webcam
    if not cap.isOpened():
        print(f"Failed to open video source: {BASE_DIR / 'data' / 'crowd_vid.mp4'}", flush=True)
        return

    cap = cv.VideoCapture("data/road_show.mp4")  # or 0 for webcam

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            cap.set(cv.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = preprocess_frame(frame)
        h, w, _ = frame.shape

        # Run YOLO
        results = model(frame, conf=0.4, iou=0.5, verbose=False)[0]

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

        # Density
        density = get_density(count)

        if density == "HIGH":
            high_entry_streak += 1
            high_exit_streak = 0
        else:
            high_exit_streak += 1
            high_entry_streak = 0

        if current_density_state != "HIGH" and high_entry_streak >= HIGH_ENTRY_FRAMES:
            current_density_state = "HIGH"
            create_high_density_alert(count, zones)
        elif current_density_state == "HIGH":
            update_active_alert(count, zones)

        if current_density_state == "HIGH" and high_exit_streak >= HIGH_EXIT_FRAMES:
            current_density_state = density
            resolve_active_alert(count, zones)

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

        with lock:
            latest_frame = frame.copy()

        # Store latest zones
        latest_zones[:] = zones

        # Push real-time data to frontend
        socketio.emit("crowd_update", {
            "people_count": count,
            "density": density,
            "zones": zones
        })

        time.sleep(0.04)  # ~25 FPS

    cap.release()

# ---------------- VIDEO STREAM ----------------
def generate_frames():
    while True:
        with lock:
            if latest_frame is None:
                time.sleep(0.1)
                continue
            _, buffer = cv.imencode(".jpg", latest_frame)

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" +
            buffer.tobytes() + b"\r\n"
        )

@app.route("/video")
def video():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/")
def index():
    return {
        "status": "ok",
        "video_url": "/video",
        "socketio_async_mode": socketio.async_mode
    }

@app.route('/api/zones', methods=['GET'])
def get_zones():
    return jsonify({
        'zones': latest_zones,
        'total_people': sum(latest_zones)
    })

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    status = request.args.get('status')
    with alerts_lock:
        if status:
            filtered_alerts = [alert for alert in alerts_store if alert.get('status') == status]
        else:
            filtered_alerts = list(alerts_store)
        active_count = sum(1 for alert in alerts_store if alert.get('status') == 'active')

    return jsonify({
        'alerts': filtered_alerts,
        'alerts_count': len(filtered_alerts),
        'active_alerts_count': active_count,
        'total_events': high_density_events,
    })

@app.route('/api/alerts/<alert_id>/action', methods=['POST'])
def alert_action(alert_id):
    global active_alert_id
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
            if active_alert_id == alert_id:
                active_alert_id = None
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
    print(f"Starting server with async mode: {socketio.async_mode}", flush=True)
    socketio.start_background_task(detection_loop)
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)

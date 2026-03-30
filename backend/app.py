import cv2 as cv
import numpy as np
from flask import Flask, Response
from flask_cors import CORS
from flask_socketio import SocketIO
from ultralytics import YOLO
import threading
import time

# ---------------- APP SETUP ----------------
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ---------------- LOAD MODEL ----------------
model = YOLO("best.pt")   # your trained model
print("✅ YOLO model loaded")

# ---------------- GLOBAL STATE ----------------
latest_frame = None
lock = threading.Lock()

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
    global latest_frame

    cap = cv.VideoCapture("data/crowd_video.mp4")  # or 0 for webcam

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

        if results.boxes:
            for box in results.boxes:
                if int(box.cls[0]) == 0:  # person class
                    x1, y1, x2, y2 = map(int, box.xyxy[0])

                    # head-level center (better for crowds)
                    cx = int((x1 + x2) / 2)
                    cy = y1 + int((y2 - y1) * 0.2)

                    person_centers.append((cx, cy))
                    count += 1

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

        # Push real-time data to frontend
        socketio.emit("crowd_update", {
            "people_count": count,
            "density": density
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

# ---------------- MAIN ----------------
if __name__ == "__main__":
    threading.Thread(target=detection_loop, daemon=True).start()
    socketio.run(app, host="0.0.0.0", port=5000)

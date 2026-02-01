import cv2
import numpy as np
from ultralytics import YOLO

# Load model once
try:
    model = YOLO("best.onnx",task='detect')
    print("✅ ONNX model loaded")
except:
    model = YOLO("best.pt",task='detect')
    print("⚠ PyTorch model loaded")


def get_density(count):
    if count < 10:
        return "LOW"
    elif count < 25:
        return "MEDIUM"
    else:
        return "HIGH"


def detect_people(frame):
    frame_resized = cv2.resize(frame, (256, 192))
    results = model(frame_resized, verbose=False)

    person_count = 0

    for r in results:
        if r.boxes is None:
            continue
        classes = r.boxes.cls.cpu().numpy()
        for cls in classes:
            if int(cls) == 0:  # person
                person_count += 1

    density = get_density(person_count)
    return person_count, density

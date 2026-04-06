# CrowdGuard

Real-time crowd monitoring system with research-grade density estimation, anomaly detection, adaptive processing, multi-camera support, and experiment-ready benchmarking.

## Overview

CrowdGuard is a full-stack crowd analytics platform built for both operational monitoring and academic experimentation. It combines YOLOv8-based person detection with:

- perspective-aware weighted density estimation
- temporal smoothing
- adaptive density thresholding
- crowd surge detection
- adaptive frame-rate processing
- benchmark export to JSON/CSV
- baseline vs improved comparison
- multi-camera video-node management
- dynamic React dashboard with Socket.IO telemetry

The project is suitable for:

- real-time crowd monitoring demos
- smart surveillance research
- experimental evaluation for project reports and IEEE-style papers

## Key Features

- Real-time person detection using YOLOv8
- Crowd counting and 4-zone occupancy analysis
- Perspective-aware density estimation
- Exponential smoothing for temporal stability
- Dynamic density thresholding
- Surge alert detection from rapid count changes
- Adaptive frame processing based on scene stability
- Model selection between `crowdguard_best`, `yolov8n`, and `yolov8m`
- Standard and edge deployment profiles
- Multi-camera support with recorded-video upload
- Persistent uploaded camera registry
- Duplicate video detection by content hash
- Offline benchmark mode with JSON and CSV export
- Baseline versus improved comparison summaries

## Repository Structure

```text
crowdGaurd/
├── backend/
│   ├── app.py
│   ├── density.py
│   ├── anomaly.py
│   ├── processing.py
│   ├── modeling.py
│   ├── metrics.py
│   ├── benchmark.py
│   ├── comparison.py
│   ├── cameras.py
│   ├── deployment.py
│   ├── uploads/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/useCrowdData.js
│   │   └── components/
├── DESIGN.md
├── METHODOLOGY.md
└── EXPERIMENTS.md
```

## Technology Stack

### Backend

- Python
- Flask
- Flask-CORS
- Flask-SocketIO
- OpenCV
- NumPy
- Ultralytics YOLOv8

### Frontend

- React
- Vite
- Socket.IO client
- Lucide icons

## Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- GPU optional, CPU supported

### Backend Setup

From the project root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

From the project root:

```powershell
cd frontend
npm install
```

## Running the Project

### Start Backend

From `backend/`:

```powershell
python app.py
```

Backend default address:

- `http://127.0.0.1:5000`

### Start Frontend

From `frontend/`:

```powershell
npm run dev
```

Frontend default address is typically:

- `http://127.0.0.1:5173`

## Environment Variables

### Deployment Mode

```powershell
$env:CROWDGUARD_DEPLOYMENT_MODE="standard"
```

Supported values:

- `standard`
- `edge`

### Model Selection

```powershell
$env:CROWDGUARD_MODEL="crowdguard_best"
```

Supported values:

- `crowdguard_best`
- `yolov8n`
- `yolov8m`

Example:

```powershell
$env:CROWDGUARD_DEPLOYMENT_MODE="edge"
$env:CROWDGUARD_MODEL="yolov8n"
python app.py
```

## How to Use

### 1. Open the Dashboard

The dashboard shows:

- total occupancy
- density state
- camera inventory
- active alerts
- video stream
- count history chart
- zone occupancy chart

### 2. Add a Camera Node

Go to the Cameras tab and:

1. optionally enter a display name
2. choose a recorded video file
3. click `Upload Video`

Supported formats:

- `.mp4`
- `.avi`
- `.mov`
- `.mkv`

The upload API will:

- save the video in `backend/uploads`
- create a managed camera node
- persist it across backend restarts
- start a background processing loop

### 3. Manage Camera Nodes

From the Cameras tab you can:

- select a camera node
- rename a camera node
- remove an uploaded camera node

Duplicate uploads are detected using a SHA-256 file hash, so the same video content cannot be added twice accidentally.

### 4. Monitor Alerts

Alerts can be viewed and managed from:

- Dashboard
- Alerts tab

Supported operator actions:

- dispatch
- ignore

Alert types currently include:

- high-density alert
- `SURGE_ALERT`

### 5. Use Benchmark Mode

Benchmark mode is available in standard deployment mode.

Check benchmark availability:

```powershell
curl http://127.0.0.1:5000/api/benchmark
```

Run benchmark:

```powershell
curl -X POST http://127.0.0.1:5000/api/benchmark -H "Content-Type: application/json" -d "{}"
```

Results are exported into:

- `backend/benchmark_results`

## API Overview

### System

- `GET /`
- `GET /video`
- `GET /video/<camera_id>`

### Cameras

- `GET /api/cameras`
- `POST /api/cameras/upload`
- `PATCH /api/cameras/<camera_id>`
- `DELETE /api/cameras/<camera_id>`
- `GET /api/cameras/<camera_id>/zones`

### Model and Deployment

- `GET /api/model`
- `GET /api/deployment`

### Metrics and Evaluation

- `GET /api/metrics`
- `GET /api/comparison`
- `GET /api/benchmark`
- `POST /api/benchmark`

### Alerts

- `GET /api/alerts`
- `POST /api/alerts/<alert_id>/action`

### Training

- `GET /api/training`
- `POST /api/training`

## Core Algorithms

### Perspective-Aware Density

The system divides the frame into vertical perspective bands and applies configurable weights to each band before computing density.

### Temporal Smoothing

The improved density score is smoothed using exponential smoothing:

`S_t = αD_t + (1 - α)S_(t-1)`

### Adaptive Thresholding

Thresholds are computed from recent smoothed-density history using rolling mean and standard deviation.

### Surge Detection

Surge alerts are triggered when count delta or count velocity exceeds configured thresholds.

## Research Documentation

For full technical details, see:

- [DESIGN.md](/abs/path/d:/crowdGaurd/DESIGN.md)
- [METHODOLOGY.md](/abs/path/d:/crowdGaurd/METHODOLOGY.md)
- [EXPERIMENTS.md](/abs/path/d:/crowdGaurd/EXPERIMENTS.md)

## Example Evaluation Workflow

1. Start backend in standard mode
2. Upload or register one or more recorded videos
3. Observe live telemetry
4. Prepare frame-count annotations if needed
5. Run benchmark mode
6. Export JSON/CSV results
7. Use comparison and metrics APIs for analysis

## Known Limitations

- perspective modeling is heuristic, not calibrated
- count metrics are not full box-level mAP metrics
- predictive crowd forecasting is not yet integrated
- the training page is a control scaffold, not a full retraining pipeline

## Troubleshooting

### Upload preflight issue

If video upload fails in the browser, make sure the backend is restarted after code changes and confirm the log shows:

```text
OPTIONS /api/cameras/upload ... 204
POST /api/cameras/upload ... 200
```

### No video shown

Check:

- backend is running on port `5000`
- uploaded camera node exists in `/api/cameras`
- selected camera has an active `/video/<camera_id>` stream

### Benchmark not available

Benchmark is disabled in edge mode. Use:

```powershell
$env:CROWDGUARD_DEPLOYMENT_MODE="standard"
```

## License / Usage Note

Add your preferred project license here if you plan to publish or distribute the repository.


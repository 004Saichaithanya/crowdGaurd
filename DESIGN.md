# CrowdGuard Technical Design and Research Documentation

## 1. Project Overview

CrowdGuard is a full-stack real-time intelligent crowd monitoring system designed for research-grade crowd analytics, operational monitoring, and experimental evaluation. The system combines deep-learning-based person detection with real-time density estimation, temporal stabilization, anomaly detection, adaptive processing, benchmarking support, and multi-camera orchestration.

The project is implemented as:

- Backend: Python, Flask, Flask-SocketIO, OpenCV, Ultralytics YOLOv8
- Frontend: React, Socket.IO client, dashboard-oriented operator UI
- Communication: REST APIs for state/configuration and WebSocket-style telemetry for live updates

The system began as a standard crowd counting and threshold-alert application and has been extended into a research-oriented architecture with explicit baseline/improved comparison, experiment export, and deployment profiles.

## 2. Research Motivation

Conventional crowd monitoring systems often rely on simple crowd count thresholds or naive density approximations such as:

`density = person_count / frame_area`

That approach is often unstable and visually misleading because:

- people at different depths occupy different image areas due to perspective distortion
- instantaneous count values fluctuate frame to frame
- fixed thresholds do not adapt to scene context
- sudden surges are not captured by static density labels alone
- many prototypes lack reproducible benchmarking and baseline comparison support

CrowdGuard addresses these shortcomings through:

- perspective-aware weighted density estimation
- temporal smoothing of density trajectories
- adaptive density thresholding
- crowd surge anomaly detection
- adaptive frame-rate control
- benchmarking and metrics export
- baseline versus improved analysis support

These enhancements make the system suitable for research reporting, comparative experiments, and paper writing.

## 3. System Objectives

The current system is designed to satisfy five core technical objectives:

1. Real-time person detection and crowd analytics from video streams
2. Improved density estimation beyond count-only baselines
3. Stable temporal behavior for operational alerts
4. Experiment-friendly logging and benchmarking for evaluation
5. Production-oriented operator experience with dynamic multi-camera control

## 4. High-Level Architecture

The system is divided into two major layers.

### 4.1 Backend Responsibilities

The backend is responsible for:

- loading and running the YOLOv8 detection model
- video frame acquisition and preprocessing
- person counting and zone occupancy computation
- perspective-aware density estimation
- temporal smoothing and adaptive thresholding
- crowd surge detection
- adaptive processing interval control
- metrics logging
- benchmark execution on video folders
- baseline versus improved comparison tracking
- multi-camera lifecycle management
- upload, rename, delete, and persistence of recorded-video camera nodes
- WebSocket telemetry emission and REST API serving

Primary backend entry point:

- [backend/app.py](/abs/path/d:/crowdGaurd/backend/app.py)

### 4.2 Frontend Responsibilities

The frontend is responsible for:

- rendering live system telemetry
- consuming Socket.IO live updates
- displaying streaming video and operational KPIs
- camera node selection and management
- operator alert handling
- chart-based visualization of count and zone occupancy
- AI training controls

Primary frontend entry points:

- [frontend/src/App.jsx](/abs/path/d:/crowdGaurd/frontend/src/App.jsx)
- [frontend/src/hooks/useCrowdData.js](/abs/path/d:/crowdGaurd/frontend/src/hooks/useCrowdData.js)

## 5. Backend Module Architecture

The backend is intentionally modular. Each research feature is encapsulated as a dedicated module rather than embedded directly inside the detection loop.

### 5.1 Core Application Layer

- [backend/app.py](/abs/path/d:/crowdGaurd/backend/app.py)

This file performs:

- backend initialization
- model loading
- deployment profile selection
- camera registry initialization
- alert lifecycle management
- video-frame generation
- main detection loop
- API route registration
- WebSocket event broadcasting

It acts as the orchestration layer and delegates algorithmic responsibilities to the modules below.

### 5.2 Perspective-Aware Density Module

- [backend/density.py](/abs/path/d:/crowdGaurd/backend/density.py)

This module implements:

- perspective-zone counting
- weighted density scoring
- exponential smoothing
- adaptive density thresholding
- baseline and improved density outputs

This is the primary research-contribution module of the project.

### 5.3 Crowd Surge / Anomaly Module

- [backend/anomaly.py](/abs/path/d:/crowdGaurd/backend/anomaly.py)

This module detects abrupt increases in occupancy using:

- count delta threshold
- rate-of-change threshold
- clear-streak logic for alert resolution

### 5.4 Adaptive Processing Module

- [backend/processing.py](/abs/path/d:/crowdGaurd/backend/processing.py)

This module controls adaptive frame processing frequency based on scene stability.

### 5.5 Model Selection and Performance Module

- [backend/modeling.py](/abs/path/d:/crowdGaurd/backend/modeling.py)

This module provides:

- config-based model selection
- fallback handling
- runtime latency/FPS tracking

### 5.6 Metrics Module

- [backend/metrics.py](/abs/path/d:/crowdGaurd/backend/metrics.py)

This module logs per-frame records and computes:

- precision
- recall
- F1-score
- average detection count

### 5.7 Benchmark Module

- [backend/benchmark.py](/abs/path/d:/crowdGaurd/backend/benchmark.py)

This module supports dataset-style offline evaluation on a folder of videos and exports results to JSON/CSV.

### 5.8 Baseline Comparison Module

- [backend/comparison.py](/abs/path/d:/crowdGaurd/backend/comparison.py)

This module tracks and summarizes baseline versus improved density behavior.

### 5.9 Camera Management Module

- [backend/cameras.py](/abs/path/d:/crowdGaurd/backend/cameras.py)

This module supports:

- camera registry abstraction
- persistent uploaded camera nodes
- multi-camera runtime state
- camera metadata updates
- duplicate upload detection using SHA-256 file hashes

### 5.10 Deployment Profiles Module

- [backend/deployment.py](/abs/path/d:/crowdGaurd/backend/deployment.py)

This module supports:

- standard profile
- edge profile
- profile-specific defaults for model and processing behavior

## 6. Frontend Architecture

The frontend follows a centralized state-consumption pattern through a single application data hook.

### 6.1 Application Shell

- [frontend/src/components/Layout.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/Layout.jsx)
- [frontend/src/components/Sidebar.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/Sidebar.jsx)
- [frontend/src/components/TopNavbar.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/TopNavbar.jsx)

These components provide:

- navigation between views
- deployment/model/camera status visibility
- active alert visibility
- backend connection state

### 6.2 Central Data Hook

- [frontend/src/hooks/useCrowdData.js](/abs/path/d:/crowdGaurd/frontend/src/hooks/useCrowdData.js)

This hook is the frontend state backbone. It manages:

- Socket.IO connection lifecycle
- live telemetry ingestion
- REST synchronization
- alert state
- training state
- camera inventory state
- camera upload, rename, delete flows
- active camera selection
- chart history buffering

### 6.3 Main Views

- [frontend/src/components/Dashboard.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/Dashboard.jsx)
- [frontend/src/components/CamerasView.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/CamerasView.jsx)
- [frontend/src/components/ZonesTab.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/ZonesTab.jsx)
- [frontend/src/components/AlertsTab.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/AlertsTab.jsx)
- [frontend/src/components/AiTrainingTab.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/AiTrainingTab.jsx)

### 6.4 Visualization Components

- [frontend/src/components/VideoFeed.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/VideoFeed.jsx)
- [frontend/src/components/charts/CrowdFlowChart.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/charts/CrowdFlowChart.jsx)
- [frontend/src/components/charts/ZoneOccupancyChart.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/charts/ZoneOccupancyChart.jsx)

These components are fully dynamic and no longer rely on synthetic telemetry values.

## 7. End-to-End Processing Pipeline

The main runtime pipeline for each camera node is:

1. Acquire video frame
2. Resize and preprocess frame
3. Run YOLOv8 person detection
4. Extract head-level person centers
5. Compute zone occupancy
6. Generate density heatmap overlay
7. Compute baseline and improved density metrics
8. Apply temporal smoothing and adaptive thresholds
9. Detect anomaly or surge conditions
10. Adjust frame-processing interval
11. Update performance and metrics trackers
12. Update comparison tracker
13. Update alert lifecycle
14. Emit live telemetry to frontend
15. Serve latest MJPEG frame to video stream endpoint

This pipeline is executed independently for each active camera.

## 8. Frame Preprocessing

The preprocessing stage in [backend/app.py](/abs/path/d:/crowdGaurd/backend/app.py) performs:

- resizing to `640 x 480`
- conversion to LAB color space
- CLAHE enhancement on the luminance channel
- reconstruction back to BGR

This improves local contrast and can help improve robustness under difficult lighting.

## 9. Person Detection

Person detection is performed using Ultralytics YOLOv8.

Current inference settings in the main loop:

- confidence threshold: `0.4`
- IoU threshold: `0.5`
- target class: `person` only

Only class `0` detections are counted as people. For each valid detection, the system computes a head-biased center point:

- `cx = (x1 + x2) / 2`
- `cy = y1 + 0.2 * (y2 - y1)`

This center selection is more appropriate for dense crowd scenes than a full-box center because foot positions can be unreliable under partial occlusion.

## 10. Spatial Zone Occupancy

The system computes standard operational zones by dividing the frame into four quadrants:

- top-left
- top-right
- bottom-left
- bottom-right

These zones are used for:

- dashboard occupancy visualization
- alert context
- operator interpretation

This quadrant zoning is distinct from the perspective bands used in density estimation.

## 11. Research Contribution: Perspective-Aware Density Estimation

The improved density estimator is implemented in [backend/density.py](/abs/path/d:/crowdGaurd/backend/density.py).

### 11.1 Motivation

Naive density from count alone assumes each detected person contributes equally to congestion. In monocular scenes, this is not ideal because people farther from the camera occupy fewer pixels and may indicate tighter physical packing.

### 11.2 Perspective Band Partitioning

The frame is partitioned vertically into three perspective bands using normalized height edges:

- near band: `0.00 to 0.33`
- mid band: `0.33 to 0.66`
- far band: `0.66 to 1.00`

Current weights:

- near: `1.5`
- mid: `1.0`
- far: `0.7`

These values are configurable through `DensityConfig`.

Note:
The exact interpretation of near/far depends on the camera orientation. In this codebase, the weighted contribution is governed by vertical image bands, not explicit metric-depth calibration. For a paper, this can be described as a perspective-aware heuristic rather than a geometrically calibrated depth model.

### 11.3 Weighted Density Computation

Let:

- `c_i` be the count in perspective band `i`
- `w_i` be the corresponding perspective weight

Then:

`weighted_people = Σ(c_i * w_i)`

`weighted_density = weighted_people / normalized_frame_area`

The normalized frame area is referenced against a fixed baseline resolution:

`frame_area_reference = 640 * 480`

This allows the density score to remain scale-consistent across different frame sizes.

### 11.4 Baseline Density

The project intentionally preserves a baseline method:

- baseline count thresholds: `(25, 50)`
- improved weighted density thresholds: `(0.00009, 0.00016)` before adaptation

This baseline retention is essential for comparative research and ablation reporting.

## 12. Temporal Stability via Exponential Smoothing

Temporal smoothing is implemented through:

`smooth_t = α * current_t + (1 - α) * smooth_(t-1)`

Current smoothing parameter:

- `alpha = 0.35`

Benefits:

- reduces jitter in density labels
- decreases spurious alert oscillations
- improves temporal coherence of the system state

This is implemented by `DensitySmoother` and used inside `DensityEstimator`.

## 13. Dynamic Thresholding

The system no longer relies purely on static thresholds. Instead, it maintains a rolling density history and computes adaptive thresholds using the recent distribution of smoothed density values.

Current settings:

- rolling window: `60`
- medium threshold multiplier: `0.8 * std`
- high threshold multiplier: `1.6 * std`

Procedure:

1. Compute rolling mean of recent smoothed density
2. Compute rolling standard deviation
3. Derive adaptive medium/high thresholds from mean plus scaled standard deviation
4. Enforce lower bounds so thresholds never fall below the original baseline thresholds

Benefits:

- adapts to scene-specific operating conditions
- makes alerting less brittle
- supports long-duration surveillance across varying crowd regimes

## 14. Crowd Surge / Anomaly Detection

Crowd surge detection is implemented in [backend/anomaly.py](/abs/path/d:/crowdGaurd/backend/anomaly.py).

An anomaly is triggered when either condition holds:

- `current_count - previous_count >= count_delta_threshold`
- `count_velocity >= velocity_threshold`

Current defaults:

- count delta threshold: `8`
- velocity threshold: `10.0 people/sec`
- clear streak: `5 frames`

This produces a separate alert type:

- `SURGE_ALERT`

This is important from a research perspective because crowd safety is not only about static density but also about rapid crowd accumulation.

## 15. Alerting Strategy

The system supports multiple alert types:

- high-density alerts
- surge alerts

High-density state uses hysteresis-style temporal confirmation:

- entry streak threshold: `5 frames`
- exit streak threshold: `8 frames`

This prevents unstable frame-level label fluctuations from instantly toggling alerts.

Alert states include:

- active
- resolved
- ignored
- removed

Operator actions supported:

- dispatch
- ignore

## 16. Adaptive Frame Processing

Adaptive frame processing is implemented in [backend/processing.py](/abs/path/d:/crowdGaurd/backend/processing.py).

Current default interval range:

- minimum interval: `0.04 s`
- maximum interval: `0.12 s`

Scene stability is determined from:

- absolute count delta
- absolute smoothed-density delta

Current stability criteria:

- count delta threshold: `2`
- density delta threshold: `0.00001`

Behavior:

- stable scene for long enough: increase interval, reducing compute cost
- dynamic scene: decrease interval, increasing responsiveness

This improves runtime efficiency while preserving sensitivity during fast scene changes.

## 17. Model Selection and Comparison Support

The system supports runtime model selection via [backend/modeling.py](/abs/path/d:/crowdGaurd/backend/modeling.py).

Supported logical model names:

- `crowdguard_best`
- `yolov8n`
- `yolov8m`

Key properties:

- config-based selection
- automatic fallback if requested weights are missing
- runtime latency and FPS tracking

This supports performance studies such as:

- lightweight model versus stronger model trade-off
- throughput-latency analysis
- deployment-aware model selection

## 18. Performance Monitoring

The performance tracker computes rolling statistics over a configurable window:

- average latency in milliseconds
- measured FPS
- average detection count

These values are emitted in live telemetry and can be used in:

- dashboard reporting
- benchmark comparisons
- model efficiency tables

## 19. Multi-Camera Architecture

The current system supports multiple independent camera nodes.

Each camera has isolated runtime state, including:

- latest frame buffer
- zone counts
- density estimator
- anomaly detector
- frame-rate controller
- metrics tracker
- comparison tracker
- active alert IDs
- frame index

This isolation avoids state leakage across video sources and enables realistic multi-stream evaluation.

## 20. Camera Lifecycle Management

The camera subsystem currently supports:

- startup with zero configured cameras
- camera discovery from persisted uploads
- upload of recorded videos as camera nodes
- duplicate upload detection
- rename/edit metadata
- camera deletion
- default camera reassignment

Uploaded cameras are persisted in:

- [backend/uploads/cameras.json](/abs/path/d:/crowdGaurd/backend/uploads/cameras.json)

Duplicate detection uses SHA-256 hashing of the uploaded video file.

## 21. Benchmark Mode

Benchmark mode is implemented in [backend/benchmark.py](/abs/path/d:/crowdGaurd/backend/benchmark.py).

Capabilities:

- iterate through a folder of input videos
- run the same detection and density logic offline
- export JSON and CSV results

Per-frame exported fields include:

- video name
- frame index
- people count
- baseline density label
- improved density label
- baseline density score
- weighted density
- smoothed weighted density
- adaptive thresholds
- perspective-zone counts
- inference latency

This structure is especially useful for:

- preparing result tables
- plotting quantitative trends
- running baseline versus improved evaluations

## 22. Metrics and Evaluation Support

The metrics system in [backend/metrics.py](/abs/path/d:/crowdGaurd/backend/metrics.py) logs per-frame records and supports count-based evaluation if ground-truth annotations are provided.

Ground-truth file format:

- JSON mapping frame index to crowd count

Example:

```json
{
  "0": 12,
  "1": 13,
  "2": 11
}
```

Current computed metrics:

- precision
- recall
- F1-score
- average detection count

Important note for academic reporting:

These metrics are count-based, not bounding-box detection metrics such as mAP. They are still valid for crowd-counting style evaluation, but the distinction should be stated clearly in a paper.

## 23. Baseline versus Improved Comparison

The comparison tracker in [backend/comparison.py](/abs/path/d:/crowdGaurd/backend/comparison.py) retains explicit side-by-side outputs between:

- baseline count-based density classification
- improved perspective-aware smoothed adaptive classification

Reported statistics include:

- frames compared
- agreement rate
- baseline high frames
- improved high frames
- label-shift frames
- recent comparison table

This is valuable for:

- ablation studies
- comparative tables
- discussion of model behavior under dense or transitional scenes

## 24. Deployment Profiles

The project supports two deployment profiles:

### 24.1 Standard Profile

- preferred model: `crowdguard_best`
- metrics window: `120`
- processing interval range: `0.04 to 0.12 s`
- benchmark mode: enabled

This is the research-grade mode and should be used for experiments.

### 24.2 Edge Profile

- preferred model: `yolov8n`
- metrics window: `45`
- processing interval range: `0.08 to 0.20 s`
- benchmark mode: disabled

This profile is designed for lower-resource environments and demonstrates deployment adaptability.

## 25. REST API Surface

The backend exposes the following major endpoints.

### 25.1 System and Streaming

- `GET /`
- `GET /video`
- `GET /video/<camera_id>`

### 25.2 Deployment and Model

- `GET /api/deployment`
- `GET /api/model`

### 25.3 Cameras

- `GET /api/cameras`
- `POST /api/cameras/upload`
- `PATCH /api/cameras/<camera_id>`
- `DELETE /api/cameras/<camera_id>`
- `GET /api/cameras/<camera_id>/zones`

### 25.4 Metrics and Evaluation

- `GET /api/metrics`
- `GET /api/comparison`
- `GET /api/benchmark`
- `POST /api/benchmark`

### 25.5 Alerts

- `GET /api/alerts`
- `POST /api/alerts/<alert_id>/action`

### 25.6 Training

- `GET /api/training`
- `POST /api/training`

## 26. WebSocket Telemetry

Live telemetry is emitted primarily through the `crowd_update` event.

Representative fields include:

- `camera_id`
- `camera_name`
- `people_count`
- `density`
- `baseline_density`
- `weighted_density`
- `smoothed_weighted_density`
- `adaptive_density_thresholds`
- `perspective_zones`
- `count_delta`
- `count_velocity`
- `processing_interval_seconds`
- `processing_fps`
- `model_name`
- `inference_latency_ms`
- `average_latency_ms`
- `metrics`
- `density_comparison`
- `zones`
- `alerts_count`
- `high_density_events`

Additional events:

- `new_alert`
- `alert_updated`
- `alerts_snapshot`
- `training_update`

## 27. Frontend Operator Workflow

The operator workflow currently supported by the interface is:

1. Open dashboard and inspect system state
2. Switch to Cameras tab
3. Upload recorded video or select an existing camera node
4. Observe live feed, density state, zone occupancy, and crowd history
5. Review or act on alerts
6. Rename or remove managed camera nodes
7. Inspect training state if needed

The interface uses real backend data only and has been cleaned of dummy operational telemetry.

## 28. Data Persistence and Logging

The system persists several forms of data:

- camera registry metadata
- uploaded video files
- per-camera metrics logs
- benchmark exports

Examples:

- [backend/uploads/cameras.json](/abs/path/d:/crowdGaurd/backend/uploads/cameras.json)
- [backend/metrics_camera-1.json](/abs/path/d:/crowdGaurd/backend/metrics_camera-1.json)
- [backend/metrics_camera-2.json](/abs/path/d:/crowdGaurd/backend/metrics_camera-2.json)

This persistence supports reproducibility and post-hoc analysis.

## 29. Novel and Strong Technical Points for IEEE Framing

The strongest paper-oriented contributions of the current implementation are:

1. A perspective-aware weighted density estimator integrated into a real-time detection pipeline
2. Temporal stabilization via exponential smoothing for reliable crowd-state transitions
3. Adaptive thresholding based on recent density history
4. Explicit crowd surge detection using count delta and rate of change
5. Adaptive frame processing to balance responsiveness and computational cost
6. Built-in baseline versus improved comparison support
7. Benchmark-ready offline evaluation export
8. Multi-camera architecture with dynamic video-source management
9. Configurable deployment profiles demonstrating practical deployment flexibility

## 30. Suggested IEEE Paper Contribution Statement

A suitable paper-level positioning statement for this project is:

“This work presents CrowdGuard, a real-time intelligent crowd monitoring system that extends conventional person-counting pipelines with perspective-aware density estimation, temporal smoothing, adaptive thresholding, and crowd surge detection. Unlike count-only systems, CrowdGuard provides a baseline-aware and experiment-ready framework with real-time WebSocket telemetry, benchmark-mode evaluation, and multi-camera operational support.”

## 31. Suggested Experimental Design

To write a strong evaluation section, the following experiments are recommended.

### 31.1 Baseline versus Improved Density Classification

Compare:

- baseline count-threshold method
- perspective-aware smoothed adaptive method

Report:

- agreement rate
- label-shift frequency
- number of high-density frames
- visual qualitative examples

### 31.2 Temporal Stability Analysis

Compare:

- unsmoothed weighted density
- smoothed weighted density

Report:

- number of label oscillations
- alert toggling frequency
- transition smoothness over time

### 31.3 Anomaly Detection Evaluation

Construct or select sequences with abrupt crowd increases and measure:

- detection success
- alert delay
- false positives during normal motion

### 31.4 Runtime Efficiency

Compare models and deployment modes using:

- average latency
- measured FPS
- processing interval
- average detection count

### 31.5 Multi-Scenario Generalization

Evaluate across:

- open spaces
- street processions
- event gatherings
- drone-like viewpoints if available

## 32. Suggested Paper Structure

The current implementation supports the following IEEE paper structure well:

1. Introduction
2. Related Work
3. System Architecture
4. Proposed Density Estimation and Alerting Method
5. Experimental Setup
6. Results and Discussion
7. Limitations
8. Conclusion and Future Work

## 33. Suggested Mathematical Formulation Section

The following equations are directly aligned with the implemented system.

### 33.1 Weighted Density

`D_w = (Σ_i c_i * w_i) / A_n`

Where:

- `c_i` is count in perspective band `i`
- `w_i` is band weight
- `A_n` is normalized frame area

### 33.2 Temporal Smoothing

`S_t = α D_t + (1 - α) S_(t-1)`

Where:

- `D_t` is current weighted density
- `S_t` is smoothed density
- `α` is smoothing factor

### 33.3 Surge Velocity

`V_t = (C_t - C_(t-1)) / Δt`

Where:

- `C_t` is current count
- `C_(t-1)` is previous count
- `Δt` is elapsed time

### 33.4 Adaptive Thresholds

`T_med = max(T_med_base, μ + k_1σ)`

`T_high = max(T_high_base, μ + k_2σ)`

Where:

- `μ` is rolling mean of smoothed density
- `σ` is rolling standard deviation
- `k_1` and `k_2` are tuning factors

## 34. Limitations

The current system is strong, but several limitations should be acknowledged honestly in any paper.

1. Perspective awareness is heuristic rather than camera-calibrated
2. Metrics are count-based and do not yet include full detection mAP
3. Benchmark mode operates on monocular video rather than synchronized sensor fusion
4. The training interface is currently a control scaffold, not a full training pipeline
5. Predictive crowd forecasting is not yet integrated
6. The system does not currently perform tracking-by-identity across frames

These do not weaken the contribution if presented clearly; instead, they define future work.

## 35. Future Work

Strong future work directions include:

- calibrated homography-based or geometry-aware density estimation
- trajectory-aware motion prediction
- predictive congestion alerts
- full detection and tracking evaluation
- edge-device benchmarking on actual embedded hardware
- camera-fusion or cross-camera handoff
- spatiotemporal graph modeling of crowd behavior

## 36. Reproducibility Guidance

For reproducible use:

1. Document the selected model and deployment profile
2. Freeze density, anomaly, and processing parameters
3. Preserve benchmark exports and metrics logs
4. Maintain a fixed ground-truth count JSON for labeled tests
5. Report both baseline and improved outputs

## 37. Project Strength Summary

CrowdGuard is no longer a basic demo system. In its current form, it is a modular, multi-camera, real-time crowd analytics platform with explicit research features. Its major strengths are:

- modular backend architecture
- real-time operator dashboard
- configurable and extensible analytics pipeline
- preserved baseline for scientific comparison
- experiment-ready logging and export support
- practical deployment flexibility
- dynamic, production-oriented camera management

## 38. Key Source Files

Core backend:

- [backend/app.py](/abs/path/d:/crowdGaurd/backend/app.py)
- [backend/density.py](/abs/path/d:/crowdGaurd/backend/density.py)
- [backend/anomaly.py](/abs/path/d:/crowdGaurd/backend/anomaly.py)
- [backend/processing.py](/abs/path/d:/crowdGaurd/backend/processing.py)
- [backend/modeling.py](/abs/path/d:/crowdGaurd/backend/modeling.py)
- [backend/metrics.py](/abs/path/d:/crowdGaurd/backend/metrics.py)
- [backend/benchmark.py](/abs/path/d:/crowdGaurd/backend/benchmark.py)
- [backend/comparison.py](/abs/path/d:/crowdGaurd/backend/comparison.py)
- [backend/cameras.py](/abs/path/d:/crowdGaurd/backend/cameras.py)
- [backend/deployment.py](/abs/path/d:/crowdGaurd/backend/deployment.py)

Core frontend:

- [frontend/src/App.jsx](/abs/path/d:/crowdGaurd/frontend/src/App.jsx)
- [frontend/src/hooks/useCrowdData.js](/abs/path/d:/crowdGaurd/frontend/src/hooks/useCrowdData.js)
- [frontend/src/components/Dashboard.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/Dashboard.jsx)
- [frontend/src/components/CamerasView.jsx](/abs/path/d:/crowdGaurd/frontend/src/components/CamerasView.jsx)

## 39. Recommended Next Documentation Artifacts

For a full thesis or IEEE submission package, the next most useful artifacts would be:

1. A paper-style `EXPERIMENTS.md` with dataset protocol and result tables
2. A `README.md` focused on installation and usage
3. A methodology section draft in IEEE format
4. Architecture diagrams exported as figures
5. A parameter table listing all defaults used in experiments


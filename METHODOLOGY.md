# CrowdGuard Methodology

## Abstract

This document presents the methodology of CrowdGuard, a real-time intelligent crowd monitoring system designed for crowd analytics, anomaly-aware surveillance, and experimental evaluation. The system combines deep-learning-based person detection with perspective-aware density estimation, temporal smoothing, adaptive thresholding, crowd surge detection, adaptive frame processing, and multi-camera operational support. The methodology is structured in a form suitable for direct adaptation into an IEEE paper.

## 1. Introduction

Real-time crowd monitoring is critical in public safety, transportation hubs, religious gatherings, demonstrations, stadiums, and smart-city surveillance. Conventional crowd-monitoring pipelines often depend on raw person counts or static crowd thresholds, which can be unreliable under perspective distortion, dynamic illumination, transient motion, and scene-specific context shifts.

CrowdGuard addresses these limitations by introducing a modular methodology that augments person detection with perspective-aware density modeling, temporal stabilization, and anomaly-aware alerting. The approach is designed not only for operational use, but also for reproducible research evaluation through benchmark export, baseline comparison, and metrics logging.

## 2. Problem Definition

The objective is to estimate and monitor crowd condition from monocular video in real time while producing stable and actionable system outputs. Given a video stream, the system must:

1. detect people in each frame
2. estimate crowd state more robustly than count-only methods
3. suppress unstable frame-to-frame fluctuations
4. detect sudden crowd surges
5. adapt computational effort to scene stability
6. support comparative evaluation of baseline and improved methods

Formally, for each frame `t`, the system receives an image `I_t` and outputs:

- detected person count `C_t`
- zone occupancy `Z_t`
- baseline density label `B_t`
- improved density label `D_t`
- anomaly state `A_t`
- operational alert state `L_t`

## 3. System Architecture

The methodology is implemented through a two-layer architecture.

### 3.1 Backend Processing Layer

The backend performs:

- frame acquisition
- image preprocessing
- YOLOv8-based person detection
- zone and density computation
- temporal smoothing
- anomaly detection
- adaptive processing control
- alert management
- telemetry broadcasting

### 3.2 Frontend Visualization Layer

The frontend performs:

- live visualization
- operator interaction
- camera-node management
- alert action handling
- dynamic chart rendering

The backend and frontend communicate through:

- REST APIs for state and configuration
- Socket.IO for real-time telemetry

## 4. Video Processing Pipeline

For each active camera stream, the processing pipeline is:

1. capture frame
2. resize frame to `640 x 480`
3. apply contrast enhancement using CLAHE in LAB color space
4. perform YOLOv8 inference
5. extract person detections only
6. compute head-biased person centers
7. estimate zone occupancy
8. compute baseline and improved density metrics
9. apply temporal smoothing
10. apply adaptive thresholding
11. detect surge anomalies
12. adapt processing rate
13. update metrics and comparison records
14. emit results to the frontend

This design supports both single-camera and multi-camera operation.

## 5. Person Detection Model

Person detection is performed with Ultralytics YOLOv8. The implementation supports configurable model selection among:

- a project-specific `crowdguard_best`
- `yolov8n`
- `yolov8m`

Only the `person` class is retained for downstream analytics. Let each detection bounding box be represented by:

`b_i = (x1_i, y1_i, x2_i, y2_i)`

Instead of using the geometric center of the box, CrowdGuard computes a head-biased center:

`cx_i = (x1_i + x2_i) / 2`

`cy_i = y1_i + 0.2 * (y2_i - y1_i)`

This choice is motivated by the fact that lower body regions are more likely to be occluded in dense crowds.

## 6. Spatial Occupancy Estimation

For operational visualization, the frame is divided into four quadrants:

- Zone 1: top-left
- Zone 2: top-right
- Zone 3: bottom-left
- Zone 4: bottom-right

If a person center `(cx_i, cy_i)` falls inside a quadrant, that zone count is incremented. The resulting vector:

`Z_t = [z_1, z_2, z_3, z_4]`

is used for operator awareness and contextual alert messaging.

## 7. Baseline Density Estimation

The baseline approach retained in the system is count-threshold-based classification. Let `C_t` denote the number of detected persons in frame `t`. The baseline density label is defined by:

- `LOW`, if `C_t < T_1`
- `MEDIUM`, if `T_1 <= C_t < T_2`
- `HIGH`, if `C_t >= T_2`

where the current thresholds are:

- `T_1 = 25`
- `T_2 = 50`

This baseline is deliberately preserved for comparison with the proposed improved methodology.

## 8. Proposed Perspective-Aware Density Estimation

### 8.1 Motivation

In monocular surveillance, the apparent image scale of a person depends on perspective. A count-only approach ignores this and treats every detection equally. CrowdGuard improves upon this by weighting detections according to vertical image bands that approximate perspective variation.

### 8.2 Perspective Partitioning

Let the frame height be `H`. The frame is divided into three normalized vertical bands:

- Band 1: `[0.00, 0.33)`
- Band 2: `[0.33, 0.66)`
- Band 3: `[0.66, 1.00)`

For each person center `(cx_i, cy_i)`, the normalized vertical coordinate is:

`y_i = cy_i / H`

The detection is assigned to one perspective band according to `y_i`.

### 8.3 Weighted Density Score

Let:

- `c_i` be the count in perspective band `i`
- `w_i` be the corresponding weight

The weighted crowd score is:

`P_t = Σ_i (c_i * w_i)`

Current default weights are:

- `w_1 = 1.5`
- `w_2 = 1.0`
- `w_3 = 0.7`

To account for varying frame sizes, CrowdGuard normalizes using a reference area:

`A_ref = 640 * 480`

If the current frame area is `A_t`, the normalized density score is:

`D_t_raw = P_t / A_t_norm`

where `A_t_norm` is the area normalization term based on the current frame and reference area.

### 8.4 Improved Density Classification

The improved density score is mapped to labels using weighted-density thresholds:

- `LOW`, if `D_t_raw < θ_1`
- `MEDIUM`, if `θ_1 <= D_t_raw < θ_2`
- `HIGH`, if `D_t_raw >= θ_2`

with default thresholds:

- `θ_1 = 0.00009`
- `θ_2 = 0.00016`

## 9. Temporal Smoothing

Instantaneous density values are often noisy due to transient detections and frame-level fluctuations. To improve temporal stability, CrowdGuard applies exponential smoothing:

`S_t = α D_t_raw + (1 - α) S_(t-1)`

where:

- `S_t` is the smoothed density at time `t`
- `D_t_raw` is the current raw weighted density
- `α` is the smoothing coefficient

The current implementation uses:

- `α = 0.35`

This step reduces spurious density oscillation and improves the stability of alert transitions.

## 10. Adaptive Thresholding

Static thresholds may be inappropriate across heterogeneous scenes. CrowdGuard therefore computes adaptive density thresholds from recent smoothed-density history.

Let the rolling history of recent smoothed densities be:

`H_t = {S_(t-n+1), ..., S_t}`

From this history, the system computes:

- mean `μ_t`
- standard deviation `σ_t`

The adaptive thresholds are defined as:

`T_med(t) = max(θ_1, μ_t + k_1σ_t)`

`T_high(t) = max(θ_2, μ_t + k_2σ_t)`

where:

- `k_1 = 0.8`
- `k_2 = 1.6`

This ensures that thresholds remain scene-aware while never falling below the original baseline levels.

## 11. High-Density Alert Logic

The system avoids immediate alert triggering from single-frame spikes by using entry and exit streaks.

Let the current improved density label be `D_t`.

High-density entry occurs when:

- `D_t = HIGH` for at least `N_enter` consecutive frames

High-density resolution occurs when:

- `D_t != HIGH` for at least `N_exit` consecutive frames

Current defaults:

- `N_enter = 5`
- `N_exit = 8`

This hysteresis-like design improves operational reliability.

## 12. Crowd Surge / Anomaly Detection

Beyond static density state, CrowdGuard identifies sudden changes in crowd size.

Let:

- `C_t` be the current count
- `C_(t-1)` be the previous count
- `Δt` be elapsed time

The count jump is:

`ΔC_t = C_t - C_(t-1)`

The count velocity is:

`V_t = ΔC_t / Δt`

An anomaly is declared if:

- `ΔC_t >= τ_c`, or
- `V_t >= τ_v`

where current thresholds are:

- `τ_c = 8`
- `τ_v = 10.0 persons/sec`

This produces a distinct `SURGE_ALERT`, allowing the system to recognize rapid accumulation even before sustained high-density conditions are reached.

## 13. Adaptive Frame Processing

To balance computational efficiency and responsiveness, CrowdGuard adjusts the frame-processing interval according to scene stability.

Let:

- `Δcount = |C_t - C_(t-1)|`
- `Δdensity = |S_t - S_(t-1)|`

A frame is considered stable if:

- `Δcount <= 2`
- `Δdensity <= 0.00001`

If the scene remains stable for a sufficient streak, the processing interval is increased. If instability is detected, the interval is reduced. This results in:

- lower compute usage in calm scenes
- higher responsiveness in dynamic scenes

## 14. Runtime Performance Monitoring

CrowdGuard maintains a rolling performance window to measure:

- inference latency
- measured FPS
- average detection count

These values are included in the telemetry stream and can be used in runtime performance tables or deployment trade-off analysis.

## 15. Multi-Camera Methodology

Each camera is represented by an isolated runtime state containing:

- latest frame
- density estimator
- anomaly detector
- adaptive processing controller
- metrics tracker
- comparison tracker
- alert references

This ensures that density history, smoothing state, anomaly state, and metrics are not mixed across streams.

## 16. Camera Source Management

CrowdGuard supports a zero-camera startup state and dynamic addition of recorded-video camera nodes through upload.

Camera-node management includes:

- upload of `.mp4`, `.avi`, `.mov`, `.mkv`
- duplicate detection by SHA-256 hash
- persistent camera registry
- camera rename
- camera deletion

This is operationally useful and also supports repeatable experiment setup.

## 17. Benchmark Methodology

For offline experimental evaluation, the system includes a benchmark mode that processes a folder of videos and exports JSON and CSV records.

For each frame, the system logs:

- count
- baseline density
- improved density
- weighted score
- smoothed score
- adaptive thresholds
- perspective-zone counts
- inference latency

This benchmark mode reuses the same model and density logic as the live system, ensuring methodological consistency.

## 18. Evaluation Metrics

When frame-level ground-truth crowd counts are available, CrowdGuard computes count-based:

- precision
- recall
- F1-score

Let:

- `TP = min(predicted_count, true_count)`
- `FP = max(predicted_count - true_count, 0)`
- `FN = max(true_count - predicted_count, 0)`

Then:

`Precision = TP / (TP + FP)`

`Recall = TP / (TP + FN)`

`F1 = 2 * Precision * Recall / (Precision + Recall)`

These are count-level metrics rather than box-level detection metrics.

## 19. Baseline versus Improved Comparison

The methodology explicitly retains both:

- baseline density output
- improved density output

This enables:

- ablation studies
- agreement-rate analysis
- shift analysis between baseline and improved decisions

The comparison module records:

- baseline label
- improved label
- baseline score
- improved score
- adaptive thresholds

## 20. Deployment Methodology

The system supports two deployment profiles.

### 20.1 Standard Profile

This profile is intended for research and full telemetry operation:

- preferred model: `crowdguard_best`
- larger metrics window
- benchmark mode enabled
- faster processing defaults

### 20.2 Edge Profile

This profile is intended for constrained environments:

- preferred model: `yolov8n`
- shorter metrics window
- benchmark disabled
- slower but lighter processing defaults

This demonstrates deployment adaptability, which is useful for practical research impact.

## 21. Methodological Strengths

The strongest features of the methodology are:

1. modular decomposition of analytics tasks
2. preservation of a baseline for direct comparison
3. integration of temporal stability into decision-making
4. explicit anomaly detection beyond density labels
5. benchmark-ready and export-ready evaluation support
6. practical operator-oriented multi-camera support

## 22. Methodological Limitations

The following limitations should be acknowledged in any paper:

1. perspective weighting is heuristic rather than geometry-calibrated
2. evaluation metrics are count-based rather than mAP-based
3. no explicit multi-object tracking identity model is used
4. predictive forecasting is not yet part of the operational pipeline
5. the training interface is a control scaffold rather than a full retraining workflow

These are appropriate future-work directions rather than flaws in the current contribution framing.

## 23. Recommended IEEE Paper Mapping

This methodology can be mapped into an IEEE paper as follows:

- Section III: System Architecture
- Section IV: Proposed Method
- Section V: Experimental Setup
- Section VI: Results and Discussion

The key novelty should be framed around:

- perspective-aware weighted density
- temporal stability and adaptive thresholding
- surge-aware crowd monitoring
- real-time research-grade system integration


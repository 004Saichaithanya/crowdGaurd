# CrowdGuard Experiments and Result Templates

## 1. Purpose

This document defines an experiment protocol for CrowdGuard and provides templates for reporting results in a form suitable for an IEEE-style research paper.

The experiments are designed to evaluate:

- baseline versus improved density estimation
- temporal stability
- anomaly detection
- model/runtime efficiency
- deployment behavior
- multi-camera usability

## 2. Experimental Objectives

The current implementation supports the following research questions.

### RQ1

Does perspective-aware weighted density estimation provide more meaningful crowd-state assessment than count-only baseline density?

### RQ2

Does temporal smoothing reduce unstable density-label fluctuations?

### RQ3

Can surge detection identify rapid increases in crowd size that static density thresholds may miss?

### RQ4

How does adaptive frame processing affect latency and responsiveness?

### RQ5

How do different model choices and deployment profiles affect runtime behavior?

## 3. Experimental Assets

### 3.1 Video Sources

Use one or more crowd videos representing different scenarios:

- sparse pedestrian scenes
- moderate occupancy public scenes
- dense gathering scenes
- abrupt crowd surge scenes
- elevated or drone-style viewpoints if available

### 3.2 Camera Inputs

Camera inputs can be created through:

- persistent uploaded recorded-video nodes in the Cameras tab
- benchmark folder input for offline evaluation

### 3.3 Ground Truth

For count-based evaluation, provide:

- frame-indexed ground-truth count annotations in JSON

Suggested file:

- `backend/data/ground_truth_counts.json`

## 4. Experimental Modes

### 4.1 Live Monitoring Mode

Used to observe:

- real-time alerts
- density transitions
- multi-camera behavior
- operator UX behavior

### 4.2 Benchmark Mode

Used to generate reproducible offline records through:

- `GET /api/benchmark`
- `POST /api/benchmark`

Outputs include:

- JSON benchmark export
- CSV benchmark export

## 5. Core Variables

### 5.1 Independent Variables

- density method: baseline vs improved
- smoothing: off vs on
- thresholding: static vs adaptive
- model: `crowdguard_best`, `yolov8n`, `yolov8m`
- deployment mode: standard vs edge
- scene type

### 5.2 Dependent Variables

- crowd-state label
- number of high-density frames
- alert count
- alert delay
- label oscillation count
- inference latency
- measured FPS
- precision
- recall
- F1-score

## 6. Experiment 1: Baseline vs Improved Density

### Objective

To compare count-based baseline density against perspective-aware smoothed adaptive density.

### Procedure

1. Run the same video sequence through CrowdGuard.
2. Record both baseline and improved density outputs.
3. Extract comparison summaries from:
   - `/api/comparison`
   - benchmark JSON/CSV export
4. Compare frequency and timing of `HIGH` labels.

### Metrics

- agreement rate
- baseline high frames
- improved high frames
- label shift frames

### Result Table Template

| Video / Scenario | Frames Compared | Agreement Rate | Baseline High Frames | Improved High Frames | Label Shift Frames | Notes |
|---|---:|---:|---:|---:|---:|---|
| Scene A |  |  |  |  |  |  |
| Scene B |  |  |  |  |  |  |
| Scene C |  |  |  |  |  |  |

## 7. Experiment 2: Temporal Stability

### Objective

To quantify the effect of exponential smoothing on density-state stability.

### Procedure

1. Collect raw weighted density and smoothed weighted density over time.
2. Measure label transitions under both forms.
3. Compare oscillation frequency around threshold boundaries.

### Metrics

- number of label transitions
- number of `LOW-MEDIUM-HIGH` reversals
- alert toggling frequency
- average stabilization delay

### Result Table Template

| Video / Scenario | Raw Label Transitions | Smoothed Label Transitions | Reduction (%) | Raw Alert Toggles | Smoothed Alert Toggles | Notes |
|---|---:|---:|---:|---:|---:|---|
| Scene A |  |  |  |  |  |  |
| Scene B |  |  |  |  |  |  |
| Scene C |  |  |  |  |  |  |

## 8. Experiment 3: Surge / Anomaly Detection

### Objective

To evaluate the effectiveness of the crowd surge detector in identifying abrupt increases in occupancy.

### Procedure

1. Select videos with visible rapid count increases.
2. Mark approximate surge onset frames manually.
3. Compare detector output with expected surge windows.

### Metrics

- true surge detections
- false surge detections
- missed surges
- average detection delay

### Result Table Template

| Video / Scenario | True Surges | Detected Surges | False Positives | Missed Surges | Avg Detection Delay (frames/sec) | Notes |
|---|---:|---:|---:|---:|---:|---|
| Scene A |  |  |  |  |  |  |
| Scene B |  |  |  |  |  |  |
| Scene C |  |  |  |  |  |  |

## 9. Experiment 4: Model Runtime Comparison

### Objective

To compare model options in terms of latency and throughput.

### Procedure

1. Run the same input under each model configuration.
2. Record telemetry from:
   - `/api/model`
   - live `crowd_update`
   - benchmark exports

### Metrics

- average inference latency
- measured FPS
- average detection count
- fallback usage

### Result Table Template

| Model | Deployment Mode | Avg Inference Latency (ms) | Measured FPS | Avg Detection Count | Fallback Used | Notes |
|---|---|---:|---:|---:|---|---|
| crowdguard_best | standard |  |  |  |  |  |
| yolov8n | standard |  |  |  |  |  |
| yolov8m | standard |  |  |  |  |  |
| yolov8n | edge |  |  |  |  |  |

## 10. Experiment 5: Deployment Profile Comparison

### Objective

To evaluate standard versus edge deployment profiles.

### Procedure

1. Run the same scene in standard mode.
2. Run the same scene in edge mode.
3. Compare runtime telemetry and alert behavior.

### Metrics

- average latency
- measured FPS
- processing interval
- alert responsiveness
- benchmark availability

### Result Table Template

| Profile | Preferred Model | Min Interval (s) | Max Interval (s) | Avg Latency (ms) | Avg FPS | Alert Responsiveness | Notes |
|---|---|---:|---:|---:|---:|---|---|
| standard |  |  |  |  |  |  |  |
| edge |  |  |  |  |  |  |  |

## 11. Experiment 6: Count-Based Evaluation

### Objective

To quantify crowd-counting performance using ground-truth frame counts.

### Procedure

1. Prepare `ground_truth_counts.json`.
2. Run the system on the labeled video.
3. Collect `/api/metrics` output.

### Metrics

- precision
- recall
- F1-score
- average detection count
- labeled frames

### Result Table Template

| Video / Scenario | Logged Frames | Labeled Frames | Precision | Recall | F1-score | Avg Detection Count |
|---|---:|---:|---:|---:|---:|---:|
| Scene A |  |  |  |  |  |  |
| Scene B |  |  |  |  |  |  |
| Scene C |  |  |  |  |  |  |

## 12. Experiment 7: Multi-Camera Operational Evaluation

### Objective

To assess the behavior of the system under multiple active camera nodes.

### Procedure

1. Upload multiple recorded videos.
2. Confirm each has isolated state.
3. Compare per-camera telemetry and alerts.

### Metrics

- camera startup success
- per-camera telemetry isolation
- per-camera alert isolation
- camera-switch latency
- camera management success rate

### Result Table Template

| Number of Cameras | Startup Success | Feed Availability | Alert Isolation | Telemetry Isolation | Camera Switching Success | Notes |
|---:|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |

## 13. Ablation Study Suggestions

To strengthen the methodology section, include ablations such as:

- baseline count-only density
- weighted density without smoothing
- weighted density with smoothing but no adaptive thresholds
- full proposed method

### Ablation Table Template

| Method Variant | Perspective Weighting | Smoothing | Adaptive Thresholding | Surge Detection | Agreement Rate | Label Stability | Runtime Cost | Notes |
|---|---|---|---|---|---:|---:|---:|---|
| Baseline | No | No | No | No |  |  |  |  |
| Weighted Only | Yes | No | No | No |  |  |  |  |
| Weighted + Smooth | Yes | Yes | No | No |  |  |  |  |
| Full CrowdGuard | Yes | Yes | Yes | Yes |  |  |  |  |

## 14. Qualitative Analysis Template

Use frame-level screenshots and describe:

- scenes where baseline underestimates or overestimates crowd condition
- scenes where smoothing prevents false state oscillation
- scenes where surge detection triggers before sustained high-density state

### Qualitative Figure Template

| Figure ID | Scenario | Baseline Label | Improved Label | Surge Alert | Key Observation |
|---|---|---|---|---|---|
| Fig. 1 |  |  |  |  |  |
| Fig. 2 |  |  |  |  |  |
| Fig. 3 |  |  |  |  |  |

## 15. Recommended Experimental Reporting Language

Useful paper phrasing:

- “The proposed perspective-aware density estimator reduced label volatility compared with the count-based baseline.”
- “Adaptive thresholding improved contextual robustness in long-duration scenes with changing occupancy regimes.”
- “Crowd surge detection enabled earlier recognition of abrupt occupancy growth than static density classification alone.”
- “The edge deployment profile provided a lower-cost operational mode at the expense of reduced benchmark capability and lower temporal responsiveness.”

## 16. Threats to Validity

When writing the paper, include the following validity considerations:

- the current perspective model is heuristic
- metrics are count-based, not box-level AP
- performance results depend on hardware and model availability
- scene diversity of the evaluation dataset affects generalizability

## 17. Checklist for Running Experiments

Before running experiments:

1. verify backend starts in standard mode
2. confirm model selection and resolved weights
3. clear or archive previous benchmark outputs
4. confirm ground-truth JSON format if using metrics
5. fix the deployment profile for each reported experiment
6. record parameter settings used in the study

## 18. Parameter Reporting Template

| Parameter | Symbol | Value |
|---|---|---:|
| Smoothing factor | `α` | 0.35 |
| Count surge threshold | `τ_c` | 8 |
| Velocity surge threshold | `τ_v` | 10.0 |
| Baseline threshold 1 | `T_1` | 25 |
| Baseline threshold 2 | `T_2` | 50 |
| Weighted density threshold 1 | `θ_1` | 0.00009 |
| Weighted density threshold 2 | `θ_2` | 0.00016 |
| Adaptive medium multiplier | `k_1` | 0.8 |
| Adaptive high multiplier | `k_2` | 1.6 |

## 19. Final Output Artifacts

For each experimental run, archive:

- benchmark JSON
- benchmark CSV
- per-camera metrics logs
- screenshots of representative UI states
- a parameter snapshot
- the selected deployment mode and model


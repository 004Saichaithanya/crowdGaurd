import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Sequence


@dataclass(frozen=True)
class ModelConfig:
    selected_model: str = "crowdguard_best"
    available_models: Sequence[str] = ("crowdguard_best", "yolov8n", "yolov8m")
    model_paths: Dict[str, str] = field(default_factory=lambda: {
        "crowdguard_best": "best.pt",
        "yolov8n": "yolov8n.pt",
        "yolov8m": "yolov8m.pt",
    })
    fallback_model: str = "crowdguard_best"
    metrics_window_size: int = 120


@dataclass(frozen=True)
class ModelSelectionResult:
    requested_model: str
    active_model: str
    resolved_path: str
    fallback_used: bool


class ModelResolver:
    def __init__(self, base_dir: Path, config: ModelConfig | None = None) -> None:
        self.base_dir = base_dir
        self.config = config or ModelConfig()

    def resolve(self, requested_model: str | None = None) -> ModelSelectionResult:
        requested = requested_model or self.config.selected_model
        candidate = requested if requested in self.config.available_models else self.config.fallback_model

        resolved_path, fallback_used = self._resolve_path(candidate)
        active_model = candidate

        if resolved_path is None:
            active_model = self.config.fallback_model
            resolved_path, fallback_used = self._resolve_path(active_model, force_existing=False)
            fallback_used = True

        return ModelSelectionResult(
            requested_model=requested,
            active_model=active_model,
            resolved_path=resolved_path,
            fallback_used=fallback_used or active_model != requested,
        )

    def _resolve_path(self, model_name: str, force_existing: bool = True) -> tuple[str | None, bool]:
        configured_path = self.config.model_paths.get(model_name)
        if not configured_path:
            return None, True

        candidate_path = Path(configured_path)
        if not candidate_path.is_absolute():
            candidate_path = self.base_dir / candidate_path

        if candidate_path.exists():
            return str(candidate_path), False

        if force_existing:
            return None, True

        return str(candidate_path), True


class PerformanceTracker:
    def __init__(self, window_size: int = 120) -> None:
        self.window_size = max(window_size, 1)
        self.frame_latencies_ms: List[float] = []
        self.frame_timestamps: List[float] = []
        self.detection_counts: List[int] = []

    def record(self, latency_ms: float, timestamp: float, detection_count: int) -> None:
        self.frame_latencies_ms.append(latency_ms)
        self.frame_timestamps.append(timestamp)
        self.detection_counts.append(detection_count)

        self.frame_latencies_ms = self.frame_latencies_ms[-self.window_size:]
        self.frame_timestamps = self.frame_timestamps[-self.window_size:]
        self.detection_counts = self.detection_counts[-self.window_size:]

    def snapshot(self) -> dict:
        average_latency_ms = (
            sum(self.frame_latencies_ms) / len(self.frame_latencies_ms)
            if self.frame_latencies_ms else 0.0
        )
        average_detection_count = (
            sum(self.detection_counts) / len(self.detection_counts)
            if self.detection_counts else 0.0
        )

        elapsed = (
            self.frame_timestamps[-1] - self.frame_timestamps[0]
            if len(self.frame_timestamps) > 1 else 0.0
        )
        measured_fps = (
            (len(self.frame_timestamps) - 1) / elapsed
            if elapsed > 0 and len(self.frame_timestamps) > 1 else 0.0
        )

        return {
            "latency_ms": round(average_latency_ms, 2),
            "measured_fps": round(measured_fps, 2),
            "average_detection_count": round(average_detection_count, 2),
            "accuracy_available": False,
        }


def current_timestamp_ms() -> float:
    return time.perf_counter() * 1000.0

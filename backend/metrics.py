import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List


@dataclass(frozen=True)
class MetricsConfig:
    metrics_log_path: str = "metrics_log.json"
    ground_truth_counts_path: str = "data/ground_truth_counts.json"
    rolling_window_size: int = 120


@dataclass(frozen=True)
class FrameMetricsRecord:
    frame_index: int
    people_count: int
    density_label: str
    weighted_density: float
    smoothed_weighted_density: float
    processing_fps: float
    inference_latency_ms: float
    ground_truth_count: int | None = None
    true_positive: int = 0
    false_positive: int = 0
    false_negative: int = 0


class MetricsTracker:
    def __init__(self, base_dir: Path, config: MetricsConfig | None = None) -> None:
        self.base_dir = base_dir
        self.config = config or MetricsConfig()
        self.records: List[FrameMetricsRecord] = []
        self.ground_truth_counts = self._load_ground_truth_counts()

    def _load_ground_truth_counts(self) -> Dict[int, int]:
        ground_truth_path = self.base_dir / self.config.ground_truth_counts_path
        if not ground_truth_path.exists():
            return {}

        try:
            with ground_truth_path.open("r", encoding="utf-8") as handle:
                raw = json.load(handle)
        except (json.JSONDecodeError, OSError, TypeError, ValueError):
            return {}

        normalized: Dict[int, int] = {}
        for key, value in raw.items():
            try:
                normalized[int(key)] = int(value)
            except (TypeError, ValueError):
                continue

        return normalized

    def record(
        self,
        frame_index: int,
        people_count: int,
        density_label: str,
        weighted_density: float,
        smoothed_weighted_density: float,
        processing_fps: float,
        inference_latency_ms: float,
    ) -> FrameMetricsRecord:
        ground_truth_count = self.ground_truth_counts.get(frame_index)
        true_positive = min(people_count, ground_truth_count) if ground_truth_count is not None else 0
        false_positive = max(people_count - ground_truth_count, 0) if ground_truth_count is not None else 0
        false_negative = max(ground_truth_count - people_count, 0) if ground_truth_count is not None else 0

        record = FrameMetricsRecord(
            frame_index=frame_index,
            people_count=people_count,
            density_label=density_label,
            weighted_density=weighted_density,
            smoothed_weighted_density=smoothed_weighted_density,
            processing_fps=processing_fps,
            inference_latency_ms=inference_latency_ms,
            ground_truth_count=ground_truth_count,
            true_positive=true_positive,
            false_positive=false_positive,
            false_negative=false_negative,
        )

        self.records.append(record)
        self.records = self.records[-self.config.rolling_window_size:]
        self._persist_records()
        return record

    def _persist_records(self) -> None:
        metrics_log_path = self.base_dir / self.config.metrics_log_path
        payload = [
            {
                "frame_index": record.frame_index,
                "people_count": record.people_count,
                "density_label": record.density_label,
                "weighted_density": round(record.weighted_density, 6),
                "smoothed_weighted_density": round(record.smoothed_weighted_density, 6),
                "processing_fps": round(record.processing_fps, 2),
                "inference_latency_ms": round(record.inference_latency_ms, 2),
                "ground_truth_count": record.ground_truth_count,
                "true_positive": record.true_positive,
                "false_positive": record.false_positive,
                "false_negative": record.false_negative,
            }
            for record in self.records
        ]

        with metrics_log_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)

    def summary(self) -> dict:
        if not self.records:
            return {
                "precision": None,
                "recall": None,
                "f1_score": None,
                "logged_frames": 0,
                "ground_truth_available": False,
                "detection_count_average": 0.0,
            }

        avg_detection_count = sum(record.people_count for record in self.records) / len(self.records)
        labeled_records = [record for record in self.records if record.ground_truth_count is not None]

        if not labeled_records:
            return {
                "precision": None,
                "recall": None,
                "f1_score": None,
                "logged_frames": len(self.records),
                "ground_truth_available": False,
                "detection_count_average": round(avg_detection_count, 2),
            }

        total_tp = sum(record.true_positive for record in labeled_records)
        total_fp = sum(record.false_positive for record in labeled_records)
        total_fn = sum(record.false_negative for record in labeled_records)

        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        f1_score = (
            (2 * precision * recall) / (precision + recall)
            if (precision + recall) > 0 else 0.0
        )

        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1_score, 4),
            "logged_frames": len(self.records),
            "ground_truth_available": True,
            "labeled_frames": len(labeled_records),
            "detection_count_average": round(avg_detection_count, 2),
        }

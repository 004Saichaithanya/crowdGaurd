from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class ComparisonRecord:
    frame_index: int
    people_count: int
    baseline_label: str
    improved_label: str
    baseline_score: float
    improved_score: float
    adaptive_thresholds: List[float]


class BaselineComparisonTracker:
    def __init__(self, window_size: int = 120) -> None:
        self.window_size = max(window_size, 1)
        self.records: List[ComparisonRecord] = []

    def record(
        self,
        frame_index: int,
        people_count: int,
        baseline_label: str,
        improved_label: str,
        baseline_score: float,
        improved_score: float,
        adaptive_thresholds: List[float],
    ) -> ComparisonRecord:
        record = ComparisonRecord(
            frame_index=frame_index,
            people_count=people_count,
            baseline_label=baseline_label,
            improved_label=improved_label,
            baseline_score=baseline_score,
            improved_score=improved_score,
            adaptive_thresholds=list(adaptive_thresholds),
        )
        self.records.append(record)
        self.records = self.records[-self.window_size:]
        return record

    def summary(self) -> dict:
        if not self.records:
            return {
                "frames_compared": 0,
                "agreement_rate": 0.0,
                "baseline_high_frames": 0,
                "improved_high_frames": 0,
                "label_shift_frames": 0,
                "recent_table": [],
            }

        agreement_count = sum(
            1 for record in self.records
            if record.baseline_label == record.improved_label
        )
        baseline_high_frames = sum(1 for record in self.records if record.baseline_label == "HIGH")
        improved_high_frames = sum(1 for record in self.records if record.improved_label == "HIGH")
        label_shift_frames = len(self.records) - agreement_count

        recent_table = [
            {
                "frame_index": record.frame_index,
                "people_count": record.people_count,
                "baseline_label": record.baseline_label,
                "improved_label": record.improved_label,
                "baseline_score": round(record.baseline_score, 6),
                "improved_score": round(record.improved_score, 6),
                "adaptive_thresholds": [round(value, 6) for value in record.adaptive_thresholds],
            }
            for record in self.records[-10:]
        ]

        return {
            "frames_compared": len(self.records),
            "agreement_rate": round(agreement_count / len(self.records), 4),
            "baseline_high_frames": baseline_high_frames,
            "improved_high_frames": improved_high_frames,
            "label_shift_frames": label_shift_frames,
            "recent_table": recent_table,
        }

from dataclasses import dataclass


@dataclass(frozen=True)
class AnomalyConfig:
    count_delta_threshold: int = 8
    velocity_threshold: float = 10.0
    clear_streak_frames: int = 5


@dataclass(frozen=True)
class AnomalyResult:
    is_anomaly: bool
    count_delta: int
    velocity: float


class CrowdSurgeDetector:
    def __init__(self, config: AnomalyConfig | None = None) -> None:
        self.config = config or AnomalyConfig()
        self.previous_count: int | None = None
        self.previous_timestamp: float | None = None
        self.clear_streak = 0

    def update(self, current_count: int, timestamp: float) -> AnomalyResult:
        if self.previous_count is None or self.previous_timestamp is None:
            self.previous_count = current_count
            self.previous_timestamp = timestamp
            return AnomalyResult(is_anomaly=False, count_delta=0, velocity=0.0)

        elapsed = max(timestamp - self.previous_timestamp, 1e-6)
        count_delta = current_count - self.previous_count
        velocity = count_delta / elapsed

        is_anomaly = (
            count_delta >= self.config.count_delta_threshold
            or velocity >= self.config.velocity_threshold
        )

        if is_anomaly:
            self.clear_streak = 0
        else:
            self.clear_streak += 1

        self.previous_count = current_count
        self.previous_timestamp = timestamp

        return AnomalyResult(
            is_anomaly=is_anomaly,
            count_delta=count_delta,
            velocity=velocity,
        )

    def should_clear(self) -> bool:
        return self.clear_streak >= self.config.clear_streak_frames

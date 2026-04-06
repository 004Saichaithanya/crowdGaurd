from dataclasses import dataclass


@dataclass(frozen=True)
class AdaptiveProcessingConfig:
    min_interval_seconds: float = 0.04
    max_interval_seconds: float = 0.12
    stable_count_delta_threshold: int = 2
    stable_density_delta_threshold: float = 0.00001
    stable_streak_for_slowdown: int = 12
    speedup_step_seconds: float = 0.02
    slowdown_step_seconds: float = 0.01


class AdaptiveFrameRateController:
    def __init__(self, config: AdaptiveProcessingConfig | None = None) -> None:
        self.config = config or AdaptiveProcessingConfig()
        self.current_interval = self.config.min_interval_seconds
        self.previous_count: int | None = None
        self.previous_density: float | None = None
        self.stable_streak = 0

    def update(self, people_count: int, smoothed_density: float) -> float:
        if self.previous_count is None or self.previous_density is None:
            self.previous_count = people_count
            self.previous_density = smoothed_density
            return self.current_interval

        count_delta = abs(people_count - self.previous_count)
        density_delta = abs(smoothed_density - self.previous_density)

        is_stable = (
            count_delta <= self.config.stable_count_delta_threshold
            and density_delta <= self.config.stable_density_delta_threshold
        )

        if is_stable:
            self.stable_streak += 1
        else:
            self.stable_streak = 0
            self.current_interval = max(
                self.config.min_interval_seconds,
                self.current_interval - self.config.speedup_step_seconds,
            )

        if self.stable_streak >= self.config.stable_streak_for_slowdown:
            self.current_interval = min(
                self.config.max_interval_seconds,
                self.current_interval + self.config.slowdown_step_seconds,
            )

        self.previous_count = people_count
        self.previous_density = smoothed_density
        return self.current_interval

    @property
    def current_fps(self) -> float:
        return 1.0 / self.current_interval if self.current_interval > 0 else 0.0

from dataclasses import dataclass, field
from typing import Iterable, List, Sequence, Tuple


Point = Tuple[int, int]


@dataclass(frozen=True)
class DensityConfig:
    frame_area_reference: float = 640.0 * 480.0
    perspective_band_edges: Sequence[float] = (0.0, 0.33, 0.66, 1.0)
    perspective_band_weights: Sequence[float] = (1.5, 1.0, 0.7)
    baseline_count_thresholds: Sequence[int] = (25, 50)
    weighted_density_thresholds: Sequence[float] = (0.00009, 0.00016)
    smoothing_alpha: float = 0.35
    adaptive_threshold_window: int = 60
    adaptive_medium_std_multiplier: float = 0.8
    adaptive_high_std_multiplier: float = 1.6


@dataclass(frozen=True)
class DensityResult:
    label: str
    baseline_label: str
    weighted_density: float
    smoothed_weighted_density: float
    baseline_density_score: float
    adaptive_thresholds: List[float] = field(default_factory=list)
    perspective_zone_counts: List[int] = field(default_factory=list)
    perspective_zone_score: List[float] = field(default_factory=list)


def classify_density_from_thresholds(value: float, thresholds: Sequence[float]) -> str:
    if value < thresholds[0]:
        return "LOW"
    if value < thresholds[1]:
        return "MEDIUM"
    return "HIGH"


def compute_perspective_zone_counts(
    person_centers: Iterable[Point],
    frame_height: int,
    band_edges: Sequence[float],
) -> List[int]:
    counts = [0 for _ in range(len(band_edges) - 1)]

    if frame_height <= 0 or len(counts) == 0:
        return counts

    for _, cy in person_centers:
        normalized_y = min(max(cy / frame_height, 0.0), 0.999999)

        for idx in range(len(counts)):
            lower = band_edges[idx]
            upper = band_edges[idx + 1]
            if lower <= normalized_y < upper:
                counts[idx] += 1
                break

    return counts


def compute_density(
    person_centers: Iterable[Point],
    person_count: int,
    frame_shape: Tuple[int, int],
    config: DensityConfig | None = None,
) -> DensityResult:
    config = config or DensityConfig()
    frame_height, frame_width = frame_shape

    perspective_zone_counts = compute_perspective_zone_counts(
        person_centers=person_centers,
        frame_height=frame_height,
        band_edges=config.perspective_band_edges,
    )

    perspective_zone_score = [
        count * weight
        for count, weight in zip(perspective_zone_counts, config.perspective_band_weights)
    ]
    weighted_people = sum(perspective_zone_score)

    frame_area = max(float(frame_height * frame_width), 1.0)
    area_normalizer = frame_area / max(config.frame_area_reference, 1.0)
    weighted_density = weighted_people / max(config.frame_area_reference * area_normalizer, 1.0)
    baseline_density_score = person_count / max(config.frame_area_reference * area_normalizer, 1.0)

    return DensityResult(
        label=classify_density_from_thresholds(
            weighted_density,
            config.weighted_density_thresholds,
        ),
        baseline_label=classify_density_from_thresholds(
            person_count,
            config.baseline_count_thresholds,
        ),
        weighted_density=weighted_density,
        smoothed_weighted_density=weighted_density,
        baseline_density_score=baseline_density_score,
        perspective_zone_counts=perspective_zone_counts,
        perspective_zone_score=perspective_zone_score,
    )


class DensitySmoother:
    def __init__(self, alpha: float) -> None:
        self.alpha = min(max(alpha, 0.0), 1.0)
        self.previous_value: float | None = None

    def smooth(self, current_value: float) -> float:
        if self.previous_value is None:
            self.previous_value = current_value
            return current_value

        smoothed_value = (self.alpha * current_value) + ((1.0 - self.alpha) * self.previous_value)
        self.previous_value = smoothed_value
        return smoothed_value


class DensityEstimator:
    def __init__(self, config: DensityConfig | None = None) -> None:
        self.config = config or DensityConfig()
        self.smoother = DensitySmoother(alpha=self.config.smoothing_alpha)
        self.density_history: List[float] = []

    def _update_history(self, smoothed_weighted_density: float) -> None:
        self.density_history.append(smoothed_weighted_density)
        self.density_history = self.density_history[-self.config.adaptive_threshold_window:]

    def _compute_adaptive_thresholds(self) -> List[float]:
        if not self.density_history:
            return list(self.config.weighted_density_thresholds)

        history_mean = sum(self.density_history) / len(self.density_history)
        history_variance = sum(
            (value - history_mean) ** 2 for value in self.density_history
        ) / len(self.density_history)
        history_std = history_variance ** 0.5

        adaptive_medium = history_mean + (self.config.adaptive_medium_std_multiplier * history_std)
        adaptive_high = history_mean + (self.config.adaptive_high_std_multiplier * history_std)

        baseline_medium, baseline_high = self.config.weighted_density_thresholds
        adaptive_medium = max(baseline_medium, adaptive_medium)
        adaptive_high = max(baseline_high, adaptive_high)
        adaptive_high = max(adaptive_high, adaptive_medium + 1e-6)

        return [adaptive_medium, adaptive_high]

    def compute(
        self,
        person_centers: Iterable[Point],
        person_count: int,
        frame_shape: Tuple[int, int],
    ) -> DensityResult:
        raw_result = compute_density(
            person_centers=person_centers,
            person_count=person_count,
            frame_shape=frame_shape,
            config=self.config,
        )
        smoothed_weighted_density = self.smoother.smooth(raw_result.weighted_density)
        self._update_history(smoothed_weighted_density)
        adaptive_thresholds = self._compute_adaptive_thresholds()

        return DensityResult(
            label=classify_density_from_thresholds(
                smoothed_weighted_density,
                adaptive_thresholds,
            ),
            baseline_label=raw_result.baseline_label,
            weighted_density=raw_result.weighted_density,
            smoothed_weighted_density=smoothed_weighted_density,
            baseline_density_score=raw_result.baseline_density_score,
            adaptive_thresholds=adaptive_thresholds,
            perspective_zone_counts=raw_result.perspective_zone_counts,
            perspective_zone_score=raw_result.perspective_zone_score,
        )

from dataclasses import dataclass


@dataclass(frozen=True)
class DeploymentProfile:
    name: str
    preferred_model: str
    metrics_window_size: int
    min_interval_seconds: float
    max_interval_seconds: float
    stable_streak_for_slowdown: int
    benchmark_enabled: bool
    notes: str


STANDARD_PROFILE = DeploymentProfile(
    name="standard",
    preferred_model="crowdguard_best",
    metrics_window_size=120,
    min_interval_seconds=0.04,
    max_interval_seconds=0.12,
    stable_streak_for_slowdown=12,
    benchmark_enabled=True,
    notes="Research-grade mode with full telemetry and baseline defaults.",
)


EDGE_PROFILE = DeploymentProfile(
    name="edge",
    preferred_model="yolov8n",
    metrics_window_size=45,
    min_interval_seconds=0.08,
    max_interval_seconds=0.2,
    stable_streak_for_slowdown=8,
    benchmark_enabled=False,
    notes="Resource-aware deployment profile for constrained edge devices.",
)


def resolve_deployment_profile(profile_name: str | None) -> DeploymentProfile:
    normalized = (profile_name or STANDARD_PROFILE.name).strip().lower()
    if normalized == EDGE_PROFILE.name:
        return EDGE_PROFILE
    return STANDARD_PROFILE

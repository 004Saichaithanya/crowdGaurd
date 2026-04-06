import threading
import hashlib
import json
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Dict, List


@dataclass(frozen=True)
class CameraConfig:
    camera_id: str
    source: str
    display_name: str
    managed: bool = False
    file_hash: str | None = None


@dataclass
class CameraRuntimeState:
    config: CameraConfig
    active: bool = True
    latest_frame: object = None
    frame_lock: threading.Lock = field(default_factory=threading.Lock)
    latest_zones: List[int] = field(default_factory=lambda: [0, 0, 0, 0])
    current_density_state: str = "LOW"
    high_entry_streak: int = 0
    high_exit_streak: int = 0
    active_alert_id: str | None = None
    active_surge_alert_id: str | None = None
    frame_index: int = 0
    density_estimator: object = None
    surge_detector: object = None
    frame_rate_controller: object = None
    performance_tracker: object = None
    metrics_tracker: object = None
    comparison_tracker: object = None
    processing_started: bool = False


class CameraRegistry:
    def __init__(self, base_dir: Path) -> None:
        self._states: Dict[str, CameraRuntimeState] = {}
        self.base_dir = base_dir
        self.uploads_dir = self.base_dir / "uploads"
        self.registry_path = self.uploads_dir / "cameras.json"
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self._load_persisted()

    def register(self, config: CameraConfig) -> CameraRuntimeState:
        state = CameraRuntimeState(config=config)
        self._states[config.camera_id] = state
        return state

    def ensure_camera(self, source: str, display_name: str | None = None, managed: bool = False) -> CameraRuntimeState:
        source_path = Path(source)
        source_value = str(source_path if source_path.is_absolute() else (self.base_dir / source_path))

        for state in self._states.values():
            if state.config.source == source_value:
                return state

        camera_index = self._next_camera_index()
        return self.register(
            CameraConfig(
                camera_id=f"camera-{camera_index}",
                source=source_value,
                display_name=display_name or f"Camera {camera_index}",
                managed=managed,
            )
        )

    def update_display_name(self, camera_id: str, display_name: str) -> CameraRuntimeState | None:
        state = self._states.get(camera_id)
        if state is None:
            return None

        state.config = replace(state.config, display_name=display_name)
        return state

    def set_file_hash(self, camera_id: str, file_hash: str | None) -> CameraRuntimeState | None:
        state = self._states.get(camera_id)
        if state is None:
            return None

        state.config = replace(state.config, file_hash=file_hash)
        return state

    def find_duplicate_managed_camera(self, file_hash: str) -> CameraRuntimeState | None:
        if not file_hash:
            return None

        for state in self._states.values():
            if state.config.managed and state.config.file_hash == file_hash:
                return state
        return None

    def remove(self, camera_id: str) -> CameraRuntimeState | None:
        return self._states.pop(camera_id, None)

    def get(self, camera_id: str) -> CameraRuntimeState | None:
        return self._states.get(camera_id)

    def all(self) -> List[CameraRuntimeState]:
        return list(self._states.values())

    def first_camera_id(self) -> str | None:
        first_state = next(iter(self._states.values()), None)
        return first_state.config.camera_id if first_state else None

    def serialize(self) -> List[dict]:
        return [
            {
                "camera_id": state.config.camera_id,
                "display_name": state.config.display_name,
                "source": state.config.source,
                "managed": state.config.managed,
                "source_name": Path(state.config.source).name,
                "density": state.current_density_state,
                "zones": list(state.latest_zones),
                "active_alert_id": state.active_alert_id,
                "active_surge_alert_id": state.active_surge_alert_id,
            }
            for state in self.all()
        ]

    def persist(self) -> None:
        managed_cameras = [
            {
                "camera_id": state.config.camera_id,
                "display_name": state.config.display_name,
                "source": state.config.source,
                "managed": state.config.managed,
                "file_hash": state.config.file_hash,
            }
            for state in self.all()
            if state.config.managed
        ]

        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.registry_path.write_text(json.dumps({"cameras": managed_cameras}, indent=2), encoding="utf-8")

    def _load_persisted(self) -> None:
        if not self.registry_path.exists():
            return

        try:
            payload = json.loads(self.registry_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return

        for entry in payload.get("cameras", []):
            source = entry.get("source")
            camera_id = entry.get("camera_id")
            if not source or not camera_id:
                continue

            source_path = Path(source)
            if not source_path.exists():
                continue

            config = CameraConfig(
                camera_id=camera_id,
                source=str(source_path),
                display_name=entry.get("display_name") or camera_id,
                managed=bool(entry.get("managed", True)),
                file_hash=entry.get("file_hash"),
            )
            self.register(config)

    def _next_camera_index(self) -> int:
        indexes = []
        for camera_id in self._states:
            if camera_id.startswith("camera-"):
                suffix = camera_id.split("camera-", 1)[1]
                if suffix.isdigit():
                    indexes.append(int(suffix))
        return (max(indexes) + 1) if indexes else 1


def compute_file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

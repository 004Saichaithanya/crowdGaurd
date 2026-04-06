import csv
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import cv2 as cv

from density import DensityEstimator


@dataclass(frozen=True)
class BenchmarkConfig:
    input_folder: str = "data"
    output_folder: str = "benchmark_results"
    allowed_extensions: tuple[str, ...] = (".mp4", ".avi", ".mov", ".mkv")


class BenchmarkRunner:
    def __init__(
        self,
        base_dir: Path,
        model,
        density_estimator: DensityEstimator,
        config: BenchmarkConfig | None = None,
    ) -> None:
        self.base_dir = base_dir
        self.model = model
        self.density_estimator = density_estimator
        self.config = config or BenchmarkConfig()

    def list_videos(self, input_folder: str | None = None) -> list[str]:
        folder = self._resolve_input_folder(input_folder)
        if not folder.exists():
            return []

        return [
            str(path)
            for path in sorted(folder.iterdir())
            if path.is_file() and path.suffix.lower() in self.config.allowed_extensions
        ]

    def run(self, input_folder: str | None = None) -> dict:
        video_paths = self.list_videos(input_folder=input_folder)
        output_dir = self.base_dir / self.config.output_folder
        output_dir.mkdir(parents=True, exist_ok=True)

        benchmark_started_at = time.strftime("%Y-%m-%d %H:%M:%S")
        benchmark_records = []
        aggregate_latency_ms = []
        aggregate_people_count = []
        total_frames = 0

        for video_path_str in video_paths:
            video_path = Path(video_path_str)
            video_summary, frame_records = self._run_single_video(video_path)
            benchmark_records.extend(frame_records)
            aggregate_latency_ms.append(video_summary["average_inference_latency_ms"])
            aggregate_people_count.append(video_summary["average_people_count"])
            total_frames += video_summary["processed_frames"]

        timestamp_slug = time.strftime("%Y%m%d_%H%M%S")
        json_path = output_dir / f"benchmark_{timestamp_slug}.json"
        csv_path = output_dir / f"benchmark_{timestamp_slug}.csv"

        self._write_json(json_path, benchmark_started_at, video_paths, benchmark_records, total_frames)
        self._write_csv(csv_path, benchmark_records)

        average_latency_ms = (
            sum(aggregate_latency_ms) / len(aggregate_latency_ms)
            if aggregate_latency_ms else 0.0
        )
        average_people_count = (
            sum(aggregate_people_count) / len(aggregate_people_count)
            if aggregate_people_count else 0.0
        )

        return {
            "status": "completed",
            "benchmark_started_at": benchmark_started_at,
            "videos_processed": len(video_paths),
            "total_frames": total_frames,
            "average_inference_latency_ms": round(average_latency_ms, 2),
            "average_people_count": round(average_people_count, 2),
            "json_output_path": str(json_path),
            "csv_output_path": str(csv_path),
        }

    def _resolve_input_folder(self, input_folder: str | None) -> Path:
        folder = Path(input_folder) if input_folder else self.base_dir / self.config.input_folder
        if not folder.is_absolute():
            folder = self.base_dir / folder
        return folder

    def _run_single_video(self, video_path: Path) -> tuple[dict, list[dict]]:
        cap = cv.VideoCapture(str(video_path))
        if not cap.isOpened():
            return {
                "video_name": video_path.name,
                "processed_frames": 0,
                "average_inference_latency_ms": 0.0,
                "average_people_count": 0.0,
            }, []

        video_density_estimator = DensityEstimator(config=self.density_estimator.config)
        frame_index = 0
        frame_records: list[dict] = []
        latencies_ms = []
        people_counts = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv.resize(frame, (640, 480))
            inference_started_at = time.perf_counter()
            results = self.model(frame, conf=0.4, iou=0.5, verbose=False)[0]
            inference_latency_ms = (time.perf_counter() - inference_started_at) * 1000.0

            person_centers = []
            people_count = 0

            if results.boxes:
                for box in results.boxes:
                    if int(box.cls[0]) == 0:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        cx = int((x1 + x2) / 2)
                        cy = y1 + int((y2 - y1) * 0.2)
                        person_centers.append((cx, cy))
                        people_count += 1

            density_result = video_density_estimator.compute(
                person_centers=person_centers,
                person_count=people_count,
                frame_shape=(frame.shape[0], frame.shape[1]),
            )

            frame_record = {
                "video_name": video_path.name,
                "frame_index": frame_index,
                "people_count": people_count,
                "density": density_result.label,
                "baseline_density": density_result.baseline_label,
                "baseline_density_score": round(density_result.baseline_density_score, 6),
                "weighted_density": round(density_result.weighted_density, 6),
                "smoothed_weighted_density": round(density_result.smoothed_weighted_density, 6),
                "adaptive_density_thresholds": [round(value, 6) for value in density_result.adaptive_thresholds],
                "perspective_zones": density_result.perspective_zone_counts,
                "inference_latency_ms": round(inference_latency_ms, 2),
            }
            frame_records.append(frame_record)
            latencies_ms.append(inference_latency_ms)
            people_counts.append(people_count)
            frame_index += 1

        cap.release()

        average_latency_ms = sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0
        average_people_count = sum(people_counts) / len(people_counts) if people_counts else 0.0

        return {
            "video_name": video_path.name,
            "processed_frames": frame_index,
            "average_inference_latency_ms": round(average_latency_ms, 2),
            "average_people_count": round(average_people_count, 2),
        }, frame_records

    def _write_json(
        self,
        output_path: Path,
        benchmark_started_at: str,
        video_paths: Iterable[str],
        benchmark_records: list[dict],
        total_frames: int,
    ) -> None:
        payload = {
            "benchmark_started_at": benchmark_started_at,
            "videos": list(video_paths),
            "total_frames": total_frames,
            "records": benchmark_records,
        }
        with output_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)

    def _write_csv(self, output_path: Path, benchmark_records: list[dict]) -> None:
        if not benchmark_records:
            with output_path.open("w", encoding="utf-8", newline="") as handle:
                handle.write("")
            return

        fieldnames = list(benchmark_records[0].keys())
        with output_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(benchmark_records)

import json
import sys

from faster_whisper import WhisperModel


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python run_faster_whisper.py <audio_path>", file=sys.stderr)
        return 1

    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "small"

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, language="ja")

    transcript = "".join(segment.text for segment in segments).strip()
    print(json.dumps({"language": info.language, "text": transcript}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

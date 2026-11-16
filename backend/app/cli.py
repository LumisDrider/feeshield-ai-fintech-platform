"""JSON/NDJSON bridge used by the Next.js server and local automation."""
from __future__ import annotations
import json
import sys
from backend.app.services.pipeline import analyse_text
from backend.app.services.comparison_engine import compare_analyses


def emit(payload):
    sys.stdout.write(json.dumps(payload, allow_nan=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "analyze"
    try:
        payload = json.load(sys.stdin)
        if mode == "analyze":
            def progress(stage, message):
                emit({"type": "stage", "stage": stage, "message": message})
            result = analyse_text(payload["text"], progress)
            emit({"type": "result", "result": result})
        elif mode == "compare":
            result = compare_analyses(payload["a"], payload["b"], payload.get("filenameA", "Contract A"), payload.get("filenameB", "Contract B"), payload.get("idA", ""), payload.get("idB", ""))
            emit({"type": "result", "result": result})
        else:
            raise ValueError("Unsupported engine mode")
        return 0
    except Exception as exc:
        emit({"type": "error", "error": str(exc)[:400], "errorType": type(exc).__name__})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

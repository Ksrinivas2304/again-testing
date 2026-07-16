import os
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
_backend = _root / "backend"
sys.path.insert(0, str(_root))
if _backend.is_dir():
    sys.path.insert(0, str(_backend))

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

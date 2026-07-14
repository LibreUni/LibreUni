from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    root: Path
    artifacts: Path
    model: str = "deepseek/deepseek-v4-flash"
    reviewer_model: str = "deepseek/deepseek-v4-flash"
    max_revisions: int = 3
    max_sources: int = 8
    files_per_call: int = 4
    api_timeout_seconds: float = 90.0
    max_output_tokens: int = 20000
    reasoning_effort: str = "low"
    revision_mode: str = "edits"

    @classmethod
    def from_root(cls, root: Path) -> "Settings":
        # Convenience for local runs. Existing process variables win over .env.
        try:
            from dotenv import load_dotenv
            load_dotenv(root / ".env", override=False)
        except ImportError:
            pass
        return cls(
            root=root,
            artifacts=root / ".libreuni-agent",
            model=os.getenv("LIBREUNI_MODEL", "deepseek/deepseek-v4-flash"),
            reviewer_model=os.getenv("LIBREUNI_REVIEWER_MODEL", "deepseek/deepseek-v4-flash"),
            max_revisions=int(os.getenv("LIBREUNI_MAX_REVISIONS", "3")),
            max_sources=int(os.getenv("LIBREUNI_MAX_SOURCES", "8")),
            files_per_call=int(os.getenv("LIBREUNI_FILES_PER_CALL", "4")),
            api_timeout_seconds=float(os.getenv("LIBREUNI_API_TIMEOUT_SECONDS", "90")),
            max_output_tokens=int(os.getenv("LIBREUNI_MAX_OUTPUT_TOKENS", "20000")),
            reasoning_effort=os.getenv("LIBREUNI_REASONING_EFFORT", "low"),
            revision_mode=os.getenv("LIBREUNI_REVISION_MODE", "edits"),
        )

    @property
    def api_key_configured(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY"))

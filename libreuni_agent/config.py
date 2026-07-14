from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    root: Path
    artifacts: Path
    model: str = "deepseek/deepseek-v4-flash"
    reviewer_model: str = "openai/gpt-5.6-luna-pro"
    max_revisions: int = 3
    max_sources: int = 8

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
            reviewer_model=os.getenv("LIBREUNI_REVIEWER_MODEL", os.getenv("LIBREUNI_MODEL", "openai/gpt-5.6-luna-pro")),
            max_revisions=int(os.getenv("LIBREUNI_MAX_REVISIONS", "3")),
            max_sources=int(os.getenv("LIBREUNI_MAX_SOURCES", "8")),
        )

    @property
    def api_key_configured(self) -> bool:
        return bool(os.getenv("OPENROUTER_API_KEY"))

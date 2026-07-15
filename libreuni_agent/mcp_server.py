"""Small, host-agnostic MCP interface for LibreUni course work.

The host agent owns the reasoning loop. This server owns bounded repository
operations, deterministic validation, source lookup, and transactional writes.
"""
import hashlib
import json
import os
import sys
import threading
import uuid
from pathlib import Path
from queue import Empty, Queue
from typing import Any, TypedDict

import anyio
from mcp.server.fastmcp import FastMCP
from mcp.shared.message import SessionMessage
import mcp.types as mcp_types

from .audit import audit_text, run_repo_checks, split_frontmatter
from .graph import _target_files
from .research import research
from .rules import load_rules


mcp = FastMCP("libreuni")


def _root() -> Path:
    return Path(os.getenv("LIBREUNI_ROOT", Path.cwd())).resolve()


def _relative_path(path: str) -> Path:
    root = _root()
    candidate = (root / path).resolve()
    allowed = (root / "src" / "content" / "lessons").resolve()
    if candidate != allowed and allowed not in candidate.parents:
        raise ValueError("Only files under src/content/lessons are allowed")
    if not candidate.exists() or candidate.suffix != ".mdx":
        raise FileNotFoundError(path)
    return candidate


def _course_file_path(path: str) -> Path:
    """Resolve a proposal file in the bounded course-content surface."""
    relative = Path(path)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Course proposal paths must be relative and cannot contain '..'")
    root = _root()
    candidate = (root / path).resolve()
    allowed_roots = [
        (root / "src" / "content" / "lessons").resolve(),
        (root / "src" / "content" / "courses").resolve(),
        (root / "src" / "data" / "course-manifests").resolve(),
    ]
    if not any(candidate == directory or directory in candidate.parents for directory in allowed_roots):
        raise ValueError("Course proposals may only touch lesson, course metadata, and manifest files")
    if candidate.suffix not in {".mdx", ".json", ".yml", ".yaml"}:
        raise ValueError("Course proposal files must be MDX, JSON, or YAML")
    return candidate


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


@mcp.resource("libreuni://workflow")
def workflow() -> str:
    """The compact operating contract shown to MCP hosts."""
    root = _root()
    return (
        "Use LibreUni tools for course work. Inspect before editing; identify "
        "high-impact pedagogical or correctness problems; research claims; "
        "draft a complete proposed lesson; validate it; review the diff; and "
        "only call apply_proposal or apply_course_proposal after explicit user approval. "
        "For new courses, use save_course_proposal for lessons, metadata, and manifests. Never make "
        "cosmetic heading changes.\n\n"
        + load_rules(root)
    )


@mcp.tool()
def list_course_lessons(target: str, kind: str = "course") -> str:
    """List lessons selected by a course id, manifest id, or lesson target."""
    if kind not in {"course", "module", "lesson"}:
        raise ValueError("kind must be course, module, or lesson")
    files = _target_files(_root(), target, kind)
    return _json({"target": target, "kind": kind, "lessons": [str(p.relative_to(_root())) for p in files]})


@mcp.tool()
def read_lesson(path: str) -> str:
    """Read one lesson, including its relative path and frontmatter."""
    lesson = _relative_path(path)
    text = lesson.read_text(encoding="utf-8")
    frontmatter, _ = split_frontmatter(text)
    return _json({"path": str(lesson.relative_to(_root())), "frontmatter": frontmatter, "content": text})


@mcp.tool()
def get_libreuni_rules() -> str:
    """Return the repository's current content, sourcing, repair, and pedagogy rules."""
    return load_rules(_root())


@mcp.tool()
def validate_lesson(path: str, run_repository_checks: bool = False) -> str:
    """Run deterministic lesson checks, optionally followed by repository checks."""
    lesson = _relative_path(path)
    result: dict[str, Any] = {"audit": audit_text(lesson.read_text(encoding="utf-8"), path)}
    if run_repository_checks:
        result["repository"] = run_repo_checks(_root(), path, "lesson")
    return _json(result)


@mcp.tool()
def research_sources(query: str, max_sources: int = 5) -> str:
    """Search and fetch a small evidence bundle; returned URLs are citation candidates."""
    if not 1 <= max_sources <= 8:
        raise ValueError("max_sources must be between 1 and 8")
    return _json({"query": query, "sources": research(query, max_sources)})


@mcp.tool()
def save_proposal(path: str, proposed_content: str, rationale: str, findings: list[dict[str, Any]] | None = None) -> str:
    """Persist a complete lesson proposal without changing src/."""
    lesson = _relative_path(path)
    baseline = lesson.read_text(encoding="utf-8")
    audit = audit_text(proposed_content, path)
    proposal_id = uuid.uuid4().hex
    directory = _root() / ".libreuni-agent" / "mcp-proposals" / proposal_id
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "baseline.mdx").write_text(baseline, encoding="utf-8")
    (directory / "proposal.mdx").write_text(proposed_content, encoding="utf-8")
    manifest = {
        "proposal_id": proposal_id,
        "path": path,
        "baseline_sha256": hashlib.sha256(baseline.encode()).hexdigest(),
        "proposal_sha256": hashlib.sha256(proposed_content.encode()).hexdigest(),
        "rationale": rationale,
        "findings": findings or [],
        "audit": audit,
        "status": "pending" if audit["passed"] else "blocked",
    }
    (directory / "manifest.json").write_text(_json(manifest), encoding="utf-8")
    return _json({"proposal_id": proposal_id, "directory": str(directory), "manifest": manifest})


class FileProposal(TypedDict):
    path: str
    content: str


@mcp.tool()
def save_course_proposal(target: str, files: list[FileProposal], rationale: str, findings: list[dict[str, Any]] | None = None) -> str:
    """Persist a new or multi-file course proposal without changing src/."""
    if not files:
        raise ValueError("A course proposal must contain at least one file")
    root = _root()
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in files:
        path = item.get("path", "")
        content = item.get("content")
        if not path or not isinstance(content, str):
            raise ValueError("Each proposed file needs a path and string content")
        if path in seen:
            raise ValueError(f"Duplicate proposed path: {path}")
        seen.add(path)
        destination = _course_file_path(path)
        baseline = destination.read_text(encoding="utf-8") if destination.exists() else None
        audit = audit_text(content, path) if destination.suffix == ".mdx" else {"passed": True, "errors": [], "warnings": []}
        normalized.append({
            "path": path,
            "baseline_sha256": hashlib.sha256(baseline.encode()).hexdigest() if baseline is not None else None,
            "proposal_sha256": hashlib.sha256(content.encode()).hexdigest(),
            "audit": audit,
        })
    proposal_id = uuid.uuid4().hex
    directory = root / ".libreuni-agent" / "mcp-proposals" / proposal_id
    directory.mkdir(parents=True, exist_ok=True)
    for item in files:
        destination = directory / item["path"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(item["content"], encoding="utf-8")
    manifest = {
        "proposal_id": proposal_id,
        "target": target,
        "files": normalized,
        "rationale": rationale,
        "findings": findings or [],
        "status": "pending" if all(item["audit"]["passed"] for item in normalized) else "blocked",
    }
    (directory / "manifest.json").write_text(_json(manifest), encoding="utf-8")
    return _json({"proposal_id": proposal_id, "directory": str(directory), "manifest": manifest})


@mcp.tool()
def apply_proposal(proposal_id: str, approved_by_user: bool = False) -> str:
    """Apply a validated proposal only when the caller explicitly confirms approval."""
    if not approved_by_user:
        return _json({"applied": False, "error": "Set approved_by_user=true after the user approves the diff."})
    directory = _root() / ".libreuni-agent" / "mcp-proposals" / proposal_id
    manifest_path = directory / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(proposal_id)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("status") != "pending":
        return _json({"applied": False, "error": "Proposal is blocked or already applied", "manifest": manifest})
    lesson = _relative_path(manifest["path"])
    current = lesson.read_text(encoding="utf-8")
    current_sha = hashlib.sha256(current.encode()).hexdigest()
    if current_sha != manifest["baseline_sha256"]:
        return _json({"applied": False, "error": "Lesson changed since proposal; regenerate it", "current_sha256": current_sha})
    content = (directory / "proposal.mdx").read_text(encoding="utf-8")
    audit = audit_text(content, manifest["path"])
    if not audit["passed"]:
        return _json({"applied": False, "error": "Proposal no longer passes validation", "audit": audit})
    lesson.write_text(content, encoding="utf-8")
    manifest["status"] = "applied"
    manifest["audit_at_apply"] = audit
    manifest_path.write_text(_json(manifest), encoding="utf-8")
    return _json({"applied": True, "path": manifest["path"], "proposal_id": proposal_id})


@mcp.tool()
def apply_course_proposal(proposal_id: str, approved_by_user: bool = False) -> str:
    """Apply a validated multi-file course proposal after explicit approval."""
    if not approved_by_user:
        return _json({"applied": False, "error": "Set approved_by_user=true after the user approves the diff."})
    directory = _root() / ".libreuni-agent" / "mcp-proposals" / proposal_id
    manifest_path = directory / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(proposal_id)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("status") != "pending":
        return _json({"applied": False, "error": "Proposal is blocked or already applied", "manifest": manifest})
    for item in manifest["files"]:
        destination = _course_file_path(item["path"])
        if destination.exists():
            current_sha = hashlib.sha256(destination.read_bytes()).hexdigest()
            if current_sha != item["baseline_sha256"]:
                return _json({"applied": False, "error": "A proposed file changed since proposal; regenerate it", "path": item["path"]})
        elif item["baseline_sha256"] is not None:
            return _json({"applied": False, "error": "A proposed file was removed since proposal; regenerate it", "path": item["path"]})
        content = (directory / item["path"]).read_text(encoding="utf-8")
        if Path(item["path"]).suffix == ".mdx" and not audit_text(content, item["path"])["passed"]:
            return _json({"applied": False, "error": "Proposal no longer passes lesson validation", "path": item["path"]})
    for item in manifest["files"]:
        destination = _course_file_path(item["path"])
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text((directory / item["path"]).read_text(encoding="utf-8"), encoding="utf-8")
    manifest["status"] = "applied"
    manifest_path.write_text(_json(manifest), encoding="utf-8")
    return _json({"applied": True, "target": manifest["target"], "files": [item["path"] for item in manifest["files"]], "proposal_id": proposal_id})


async def _run_stdio_compat() -> None:
    """Run stdio without anyio's buffered-file iterator.

    Some Python/AnyIO combinations do not yield lines from a wrapped stdin
    pipe until EOF. MCP hosts keep stdin open for the lifetime of the server,
    so use an explicit blocking reader thread and line buffer instead.
    """
    read_send, read_receive = anyio.create_memory_object_stream(0)
    write_send, write_receive = anyio.create_memory_object_stream(0)
    incoming: Queue[bytes | None] = Queue()

    def blocking_reader() -> None:
        while True:
            chunk = os.read(sys.stdin.fileno(), 65536)
            incoming.put(chunk or None)
            if not chunk:
                return

    threading.Thread(target=blocking_reader, name="libreuni-mcp-stdin", daemon=True).start()

    async def reader() -> None:
        async with read_send:
            buffer = b""
            while True:
                try:
                    chunk = incoming.get_nowait()
                except Empty:
                    await anyio.sleep(0.01)
                    continue
                if not chunk:
                    return
                buffer += chunk
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    try:
                        message = mcp_types.JSONRPCMessage.model_validate_json(line)
                    except Exception as exc:
                        await read_send.send(exc)
                        continue
                    await read_send.send(SessionMessage(message=message))

    async def writer() -> None:
        async with write_receive:
            async for session_message in write_receive:
                payload = session_message.message.model_dump_json(by_alias=True, exclude_none=True) + "\n"
                sys.stdout.write(payload)
                sys.stdout.flush()

    async with anyio.create_task_group() as task_group:
        task_group.start_soon(reader)
        task_group.start_soon(writer)
        await mcp._mcp_server.run(  # FastMCP's low-level server is the stable protocol layer.
            read_receive,
            write_send,
            mcp._mcp_server.create_initialization_options(),
        )
        task_group.cancel_scope.cancel()


def main() -> None:
    anyio.run(_run_stdio_compat)

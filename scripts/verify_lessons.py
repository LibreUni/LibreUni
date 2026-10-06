#!/usr/bin/env python3
import argparse
import re
import sys
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "src" / "content" / "lessons"

# Regexes
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
# These patterns describe conversational scaffolding, not technical vocabulary.
# Keep them narrow enough that a rigorous sentence is never rejected merely for
# containing an ordinary domain word such as "state", "simple", or "current".
FILLER_PATTERNS = {
    "stock welcome or celebration": r"\b(?:welcome|congratulations on finishing|you have completed)\b",
    "conversational invitation": r"\b(?:let['’]s|let us)\s+(?:dive(?:\s+in)?|explore|take a look(?:\s+at)?)\b",
    "lesson-navigation transition": r"\b(?:in|during)\s+(?:this|the (?:next|following|previous))\s+(?:lesson|module|section|course)\b",
    "chronological callback": r"\b(?:as (?:we|you) (?:have )?(?:seen|saw|learned|discussed)|before (?:we|you) (?:move on|continue))\b",
    "exploration prompt": r"\bto practice or explore further\b",
    "journey framing": r"\b(?:summary of (?:the|your) journey|(?:the|your|our) journey from)\b",
    "empty intensifier": r"\b(?:dive deeper|seamless experience)\b",
    "placeholder transition": r"\b(?:next up|previously|the following sections explore)\b",
    "unnecessary reminder": r"\b(?:remember that|keep in mind|it is (?:important|worth) to note|it should be noted|needless to say)\b",
    "trivializing adverb": r"\bsimply\b",
    "marketing or conversational framing": r"\b(?:deep[- ]dive|really work|gateway drug|you might wonder|it just works|the abstraction we know and love|full-fat|incredibly (?:small|fast|restricted)|billion dollars)\b",
}

# Canonical Component Props
COMPONENT_PROPS = {
    "Quiz": ["question", "options", "correctIndex", "explanation", "questions", "title", "client:load"],
    "CodeRunner": ["code", "output", "language", "title", "client:load"],
    "CodeExercise": ["code", "answers", "explanation", "title", "client:load"],
    "CaseStudy": ["scenario", "question", "options", "correctIndex", "explanation", "title", "client:load"]
}

URL_RE = re.compile(r"https?://[^\s)\]]+", re.IGNORECASE)

def split_frontmatter(content):
    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}, content
    frontmatter = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        frontmatter[key.strip()] = val.strip().strip('"').strip("'")
    return frontmatter, content[match.end():]

def find_filler_violations(body):
    """Return visible conversational filler found outside fenced code/comments."""
    visible = re.sub(r"^```[^\n]*\n.*?^```\s*$", " ", body, flags=re.MULTILINE | re.DOTALL)
    visible = re.sub(r"\{\s*/\*.*?\*/\s*\}", " ", visible, flags=re.DOTALL)
    violations = []
    for label, pattern in FILLER_PATTERNS.items():
        match = re.search(pattern, visible, re.IGNORECASE)
        if match:
            violations.append((label, match.group(0)))
    return violations

def check_url(url):
    """Checks if a URL is valid and reachable."""
    # Clean trailing punctuation
    url = url.rstrip(".,;:>\"'")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if 200 <= response.status < 400:
                return url, True, f"HTTP {response.status}"
            return url, False, f"HTTP {response.status}"
    except urllib.error.HTTPError as e:
        # A live reference can reject automated requests. Preserve that signal
        # as an audit warning; only an explicit dead-resource response should
        # fail the lesson audit.
        if e.code in {403, 429}:
            return url, None, f"HTTP Error {e.code} (access restricted)"
        return url, False, f"HTTP Error {e.code}"
    except urllib.error.URLError as e:
        return url, None, f"URL Error {e.reason} (not verifiable automatically)"
    except Exception as e:
        return url, None, f"Error: {str(e)} (not verifiable automatically)"

def verify_lesson(path, check_links=False):
    content = path.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(content)
    errors = []
    warnings = []

    # 1. Frontmatter Checks
    if not frontmatter.get("title"):
        errors.append("Missing 'title' in frontmatter")
    if not frontmatter.get("course"):
        errors.append("Missing 'course' in frontmatter")
    if not frontmatter.get("description"):
        warnings.append("Missing or empty 'description' in frontmatter")

    # 2. Filler and chronological-navigation check
    for label, phrase in find_filler_violations(body):
        errors.append(f"Contains banned filler ({label}): '{phrase}'")

    # 3. Pedagogical Structure: Theory -> Example -> Exercise
    h2_sections = re.split(r"^##\s+", body, flags=re.MULTILINE)
    # The first element is pre-first-H2 content (introduction/theory)
    if len(h2_sections) > 1:
        for idx, sec in enumerate(h2_sections[1:], start=1):
            sec_title = sec.split("\n", 1)[0].strip()
            # Check if each H2 section has an example (either a code block or example keywords)
            has_example = bool(re.search(r"```[a-zA-Z0-9+-]+", sec) or re.search(r"\b(example|case|demonstrat|scenario)\b", sec, re.IGNORECASE))
            has_exercise = bool(re.search(r"<Quiz|<CodeExercise|<CodeRunner|<CaseStudy", sec) or re.search(r"\b(exercise|practice|try|quiz|lab)\b", sec, re.IGNORECASE))
            
            if not has_example:
                warnings.append(f"Section '{sec_title}' has no clear code block or example signal.")
            if not has_exercise and idx == len(h2_sections) - 1:
                # Last section should ideally lead to practice
                warnings.append(f"Lesson does not conclude with an interactive/exercise component.")
    else:
        warnings.append("No ## subheadings found; lesson should be structured with subheadings.")

    # 4. Interactive Component Props & client:load Check
    for comp in ["Quiz", "CodeRunner", "CodeExercise", "CaseStudy"]:
        # Match props, treating backtick strings as indivisible (they can contain >)
        pattern = re.compile(rf"<{comp}\b((?:[^>`]|`[^`]*`)+)\s*/?>", re.DOTALL)
        for match in pattern.finditer(body):
            props_block = match.group(1)
            # Must use client:load
            if "client:load" not in props_block:
                errors.append(f"<{comp}> component is missing 'client:load'")
            
            # Strip backtick template literals first (may contain {, }, and >)
            stripped = re.sub(r"`[^`]*`", "", props_block)
            # Strip remaining JSX expression values ( { ... } )
            stripped = re.sub(r"\{[^}]*\}", "", stripped)
            # Strip quoted attribute values without treating an equals sign in
            # the value (for example, a mathematical explanation) as a prop.
            stripped = re.sub(r'''(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')''', "", stripped)
            prop_names = re.findall(r"\b([a-zA-Z0-9:]+)(?=\s*=)", stripped)
            allowed = COMPONENT_PROPS[comp]
            for p in prop_names:
                if p not in allowed:
                    warnings.append(f"<{comp}> component uses non-canonical prop '{p}'. Allowed: {allowed}")

    # 5. Sourcing & Reference Verification
    ref_heading = re.search(r"^##+\s+(references|sources|bibliography|further reading)\b", body, re.IGNORECASE | re.MULTILINE)
    source_comments = re.findall(r"\{\s*/\*\s*Source\s+tracking:?\s*(.*?)\s*\*/\s*\}", body, re.IGNORECASE)
    
    # Check for fake source tracking comments
    for comment in source_comments:
        if any(word in comment.lower() for word in ["placeholder", "requires review", "todo", "bypass", "fixme", "lorem", "fake"]):
            errors.append(f"Fake/placeholder source-tracking comment detected: '{comment}'")
        elif len(comment.strip().split()) < 4:
            warnings.append(f"Suspiciously short source-tracking comment: '{comment}'")

    if not ref_heading and len(source_comments) == 0:
        errors.append("Completely unsourced lesson (no References heading and no source-tracking comments)")
    elif not ref_heading:
        warnings.append("Has source tracking comments but lacks a visible 'References & Further Reading' section")
    # 6. Extract URLs for checking
    urls = URL_RE.findall(body)
    checked_urls = []
    if check_links and urls:
        # Deduplicate
        urls = list(set(urls))
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_url = {executor.submit(check_url, url): url for url in urls}
            for future in as_completed(future_to_url):
                url, ok, status = future.result()
                if ok is False:
                    errors.append(f"Dead or invalid reference URL: {url} ({status})")
                elif ok is None:
                    warnings.append(f"Reference URL could not be verified automatically: {url} ({status})")
                else:
                    checked_urls.append(url)

    # 7. Visible Technical Comments Check
    # Strip code blocks, inline code, and JSX to avoid false positives
    clean_body = re.sub(r"^```[^\n]*\n.*?^```\s*$", " ", body, flags=re.MULTILINE | re.DOTALL)
    clean_body = re.sub(r"`[^`]*`", " ", clean_body)
    
    # Strip JSX braces recursively
    prev_len = -1
    while len(clean_body) != prev_len:
        prev_len = len(clean_body)
        clean_body = re.sub(r"\{[^{}]*\}", " ", clean_body)
        
    # Strip HTML-like JSX tags
    clean_body = re.sub(r"<[^>]+>", " ", clean_body)
    
    # Check for visible block comments /* and */
    if "/*" in clean_body:
        errors.append("Contains visible block comment start '/*' (must be wrapped in curly braces: '{/* comment */}')")
    if "*/" in clean_body:
        errors.append("Contains visible block comment end '*/' (must be wrapped in curly braces: '{/* comment */}')")
        
    # Check for visible single-line comments //
    for line_idx, line in enumerate(clean_body.splitlines(), start=1):
        stripped_line = line.strip()
        if stripped_line.startswith("//"):
            if not re.match(r"^//\S+\.\S+", stripped_line):
                errors.append(f"Contains visible single-line comment '//' (line {line_idx}: '{stripped_line}')")

    return errors, warnings, checked_urls

def main():
    parser = argparse.ArgumentParser(description="Strict LibreUni Lesson Auditor")
    parser.add_argument("course", nargs="?", help="Specific course directory name to audit")
    parser.add_argument("--check-links", action="store_true", help="Perform real HTTP checks on links")
    args = parser.parse_args()

    target_dir = LESSONS_DIR
    all_files = []
    if args.course:
        target_path = LESSONS_DIR / args.course
        if target_path.is_file() and target_path.suffix == ".mdx":
            all_files = [target_path]
        elif target_path.is_dir():
            target_dir = target_path
            all_files = sorted(list(target_dir.glob("**/*.mdx")))
        else:
            print(f"Error: Course directory or file '{args.course}' not found.")
            sys.exit(1)
    else:
        all_files = sorted(list(target_dir.glob("**/*.mdx")))

    print(f"Auditing {len(all_files)} lessons.")

    total_errors = 0
    total_warnings = 0

    for path in all_files:
        rel_path = path.relative_to(ROOT)
        errors, warnings, checked_urls = verify_lesson(path, check_links=args.check_links)
        
        if errors or warnings:
            print(f"\n[AUDIT] {rel_path}")
            for err in errors:
                print(f"  - ERROR: {err}")
                total_errors += 1
            for warn in warnings:
                print(f"  - WARNING: {warn}")
                total_warnings += 1

    print("\n" + "="*40)
    print(f"Audit Complete: {len(all_files)} files scanned.")
    print(f"Total Errors: {total_errors}")
    print(f"Total Warnings: {total_warnings}")
    print("="*40)

    if total_errors > 0:
        sys.exit(1)
    else:
        print("All audited files passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()

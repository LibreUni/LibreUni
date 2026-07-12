#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "apps" / "main" / "src" / "content" / "lessons"
QUALITY_OUTPUT_PATH = ROOT / "apps" / "main" / "src" / "data" / "course-quality.json"
QUALITY_OVERRIDES_PATH = ROOT / "apps" / "main" / "src" / "data" / "course-quality-overrides.json"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
REFERENCE_HEADING_RE = re.compile(
    r"^##+\s+(references|sources|bibliography|further reading|references\s*&\s*further reading)\b",
    re.IGNORECASE | re.MULTILINE,
)
SOURCE_TRACKING_RE = re.compile(r"source tracking|source note|sources?:", re.IGNORECASE)
LINK_RE = re.compile(r"https?://")


def split_frontmatter(content):
    match = FRONTMATTER_RE.match(content)
    if not match:
        return {}, content

    frontmatter = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        frontmatter[key.strip()] = value.strip().strip('"')

    return frontmatter, content[match.end():]


def level(value, thresholds):
    score = 0
    for threshold in thresholds:
        if value >= threshold:
            score += 1
    return score


def label_for(metric, level_value):
    labels = {
        "sources": [
            "Unsourced draft",
            "Source notes present",
            "Properly sourced",
            "Professionally checked",
        ],
        "content": [
            "Brief overview",
            "Course notes",
            "Self-contained course",
            "State-of-the-art reference",
        ],
        "practice": [
            "Mostly prose",
            "Some checks",
            "Interactive practice",
            "Practice-rich course",
        ],
        "review": [
            "Not reviewed",
            "Internal review",
            "External review",
            "Professional check",
        ],
    }
    return labels[metric][level_value]


def clamp_manual(value):
    try:
        return max(0, min(3, int(value)))
    except (TypeError, ValueError):
        return None


def load_quality_overrides():
    if not QUALITY_OVERRIDES_PATH.exists():
        return {}
    return json.loads(QUALITY_OVERRIDES_PATH.read_text(encoding="utf-8"))


def analyze_lesson(path):
    content = path.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(content)

    quizzes = len(re.findall(r"<Quiz\b", body))
    code_runners = len(re.findall(r"<CodeRunner\b", body))
    code_exercises = len(re.findall(r"<CodeExercise\b", body))
    case_studies = len(re.findall(r"<CaseStudy\b", body))
    interactive_count = quizzes + code_runners + code_exercises + case_studies
    has_reference_heading = bool(REFERENCE_HEADING_RE.search(body))
    source_links = len(LINK_RE.findall(body))

    # FORBIDDEN BYPASS CHECK: Detect attempts to trick the test with fake source comments
    if "{/*" in body and re.search(r"(source|review|placeholder|bypass)", body, re.IGNORECASE):
        if not has_reference_heading and source_links == 0:
            print(f"\nFATAL ERROR: AI bypass attempt detected in {path.name}!", file=sys.stderr)
            print("Adding fake 'source' comments to bypass coverage tests is STRICTLY FORBIDDEN.", file=sys.stderr)
            sys.exit(1)

    has_sources = has_reference_heading or (source_links > 0)

    return {
        "name": path.name,
        "path": str(path.relative_to(ROOT)),
        "courseId": frontmatter.get("course", "").strip() or path.parent.name,
        "length": len(body),
        "words": len(re.findall(r"\w+", body)),
        "h1s": len(re.findall(r"^#\s", body, re.MULTILINE)),
        "h2s": len(re.findall(r"^##\s+", body, re.MULTILINE)),
        "h3s": len(re.findall(r"^###\s+", body, re.MULTILINE)),
        "paragraphs": len([p for p in re.split(r"\n\s*\n", body) if p.strip()]),
        "quizzes": quizzes,
        "codeRunners": code_runners,
        "codeExercises": code_exercises,
        "caseStudies": case_studies,
        "interactiveCount": interactive_count,
        "mathBlocks": len(re.findall(r"<Math|(?<!\\)\$", body)),
        "diagrams": len(re.findall(r"<PlantUML", body)),
        "hasDescription": bool(frontmatter.get("description", "").strip()),
        "hasSources": has_sources,
        "hasReferenceHeading": has_reference_heading,
        "sourceLinks": source_links,
        "hasExampleSignal": bool(re.search(r"\b(example|case|demonstrat|scenario)\b", body, re.IGNORECASE)),
        "hasExerciseSignal": bool(re.search(r"\b(exercise|practice|try|quiz|lab)\b", body, re.IGNORECASE)),
    }


def lessons_by_course():
    grouped = {}
    for path in sorted(LESSONS_DIR.glob("*/*.mdx")):
        lesson = analyze_lesson(path)
        grouped.setdefault(lesson["courseId"], []).append(lesson)
    return grouped


def course_stats(course_id, lessons):
    total_lessons = len(lessons)
    if total_lessons == 0:
        return None

    longest = max(lessons, key=lambda lesson: lesson["length"])
    shortest = min(lessons, key=lambda lesson: lesson["length"])

    return {
        "courseId": course_id,
        "totalLessons": total_lessons,
        "averageLength": sum(lesson["length"] for lesson in lessons) / total_lessons,
        "averageWords": sum(lesson["words"] for lesson in lessons) / total_lessons,
        "averageH1": sum(lesson["h1s"] for lesson in lessons) / total_lessons,
        "averageH2": sum(lesson["h2s"] for lesson in lessons) / total_lessons,
        "averageH3": sum(lesson["h3s"] for lesson in lessons) / total_lessons,
        "averageParagraphs": sum(lesson["paragraphs"] for lesson in lessons) / total_lessons,
        "totalQuizzes": sum(lesson["quizzes"] for lesson in lessons),
        "totalMath": sum(lesson["mathBlocks"] for lesson in lessons),
        "totalDiagrams": sum(lesson["diagrams"] for lesson in lessons),
        "longest": longest,
        "shortest": shortest,
    }


def course_quality(course_id, lessons, overrides):
    lesson_count = len(lessons)
    if lesson_count == 0:
        return None

    source_coverage = sum(lesson["hasSources"] for lesson in lessons) / lesson_count
    reference_heading_coverage = sum(lesson["hasReferenceHeading"] for lesson in lessons) / lesson_count
    linked_source_coverage = sum(lesson["sourceLinks"] > 0 for lesson in lessons) / lesson_count
    avg_words = sum(lesson["words"] for lesson in lessons) / lesson_count
    avg_h2 = sum(lesson["h2s"] for lesson in lessons) / lesson_count
    description_coverage = sum(lesson["hasDescription"] for lesson in lessons) / lesson_count
    example_coverage = sum(lesson["hasExampleSignal"] for lesson in lessons) / lesson_count
    exercise_coverage = sum(lesson["hasExerciseSignal"] for lesson in lessons) / lesson_count
    interactive_coverage = sum(lesson["interactiveCount"] > 0 for lesson in lessons) / lesson_count
    avg_interactive = sum(lesson["interactiveCount"] for lesson in lessons) / lesson_count

    source_level = level(source_coverage, [0.25, 0.75])
    if reference_heading_coverage >= 0.75 and linked_source_coverage >= 0.75:
        source_level = max(source_level, 2)

    content_level = 0
    if avg_words >= 550 and avg_h2 >= 1.5 and description_coverage >= 0.6:
        content_level = 1
    if avg_words >= 900 and avg_h2 >= 2 and example_coverage >= 0.5 and exercise_coverage >= 0.35:
        content_level = 2

    practice_level = level(interactive_coverage, [0.25, 0.6])
    if interactive_coverage >= 0.75 and avg_interactive >= 1.5:
        practice_level = 3

    override = overrides.get(course_id, {})
    manual_source_level = clamp_manual(override.get("sourcesLevel"))
    manual_content_level = clamp_manual(override.get("contentLevel"))
    manual_practice_level = clamp_manual(override.get("practiceLevel"))
    review_level = clamp_manual(override.get("reviewLevel")) or 0

    if manual_source_level is not None:
        source_level = manual_source_level
    if manual_content_level is not None:
        content_level = manual_content_level
    if manual_practice_level is not None:
        practice_level = manual_practice_level

    weighted_score = (source_level * 0.35) + (content_level * 0.4) + (practice_level * 0.2) + (review_level * 0.05)
    overall_level = max(0, min(2, round(weighted_score / 3 * 2)))

    return {
        "courseId": course_id,
        "lessonCount": lesson_count,
        "overall": {
            "level": overall_level,
            "label": ["Needs work", "Developing", "Strong"][overall_level],
            "score": round(weighted_score, 2),
        },
        "metrics": {
            "sources": {
                "level": source_level,
                "label": label_for("sources", source_level),
                "coverage": round(source_coverage, 3),
                "referenceHeadingCoverage": round(reference_heading_coverage, 3),
                "linkedSourceCoverage": round(linked_source_coverage, 3),
            },
            "content": {
                "level": content_level,
                "label": label_for("content", content_level),
                "averageWords": round(avg_words),
                "descriptionCoverage": round(description_coverage, 3),
                "exampleCoverage": round(example_coverage, 3),
                "exerciseCoverage": round(exercise_coverage, 3),
            },
            "practice": {
                "level": practice_level,
                "label": label_for("practice", practice_level),
                "interactiveCoverage": round(interactive_coverage, 3),
                "averageInteractiveComponents": round(avg_interactive, 2),
            },
            "review": {
                "level": review_level,
                "label": label_for("review", review_level),
                "manual": True,
            },
        },
        "notes": override.get("notes", ""),
    }


def print_course_warnings(course_id, lessons):
    missing_sources = [l['path'] for l in lessons if not l['hasSources']]
    missing_desc = [l['path'] for l in lessons if not l['hasDescription']]
    missing_ex = [l['path'] for l in lessons if not l['hasExampleSignal']]
    missing_prac = [l['path'] for l in lessons if not l['hasExerciseSignal']]
    missing_inter = [l['path'] for l in lessons if l['interactiveCount'] == 0]
    
    if any([missing_sources, missing_desc, missing_ex, missing_prac, missing_inter]):
        print(f"\n--- Detailed Warnings for {course_id} ---")
        if missing_sources:
            print(f"Missing Sources ({len(missing_sources)}):")
            for p in missing_sources: print(f"  - {p}")
        if missing_desc:
            print(f"Missing Descriptions ({len(missing_desc)}):")
            for p in missing_desc: print(f"  - {p}")
        if missing_ex:
            print(f"Missing Example Signals ({len(missing_ex)}):")
            for p in missing_ex: print(f"  - {p}")
        if missing_prac:
            print(f"Missing Exercise Signals ({len(missing_prac)}):")
            for p in missing_prac: print(f"  - {p}")
        if missing_inter:
            print(f"Missing Interactive Components ({len(missing_inter)}):")
            for p in missing_inter: print(f"  - {p}")
        print("---------------------------------------")


def print_course_stats(stats, quality, lessons):
    print(f"Course: {stats['courseId']}")
    print("-------------------------")
    print(f"Total lessons:  {stats['totalLessons']}")
    print(f"Mean length:    {stats['averageLength']:.1f} characters")
    print(f"Mean word count:{stats['averageWords']:.1f} words")
    print(f"Avg H1 headers: {stats['averageH1']:.2f}")
    print(f"Avg H2 headers: {stats['averageH2']:.2f}")
    print(f"Avg H3 headers: {stats['averageH3']:.2f}")
    print(f"Avg Paragraphs: {stats['averageParagraphs']:.2f}")
    print("-------------------------")
    print(f"Total Quizzes:  {stats['totalQuizzes']}")
    print(f"Total Math:     {stats['totalMath']} (tags/blocks)")
    print(f"Total Diagrams: {stats['totalDiagrams']}")
    print("-------------------------")
    print(f"Longest lesson: {stats['longest']['name']} ({stats['longest']['length']} chars)")
    print(f"Shortest lesson:{stats['shortest']['name']} ({stats['shortest']['length']} chars)")
    
    print("\nQuality Metrics:")
    print(f"Overall Level: {quality['overall']['level']} - {quality['overall']['label']}")
    for metric, data in quality['metrics'].items():
        if metric == "review": continue
        print(f"  {metric.capitalize()} Level {data['level']}: {data['label']}")
        for k, v in data.items():
            if k not in ('level', 'label'):
                print(f"    - {k}: {v}")
                
    print_course_warnings(stats['courseId'], lessons)


def print_all_summary(grouped, quality_records):
    print("Course analytics summary")
    print("-------------------------")
    for course_id in sorted(grouped):
        stats = course_stats(course_id, grouped[course_id])
        quality = quality_records.get(course_id)
        quality_label = quality["overall"]["label"] if quality else "Unmeasured"
        
        # We push info aggressively
        source_cov = quality["metrics"]["sources"]["coverage"] * 100 if quality else 0
        interactive_cov = quality["metrics"]["practice"]["interactiveCoverage"] * 100 if quality else 0
        print(
            f"{course_id:25} "
            f"{stats['totalLessons']:3} lessons  "
            f"{stats['averageWords']:6.1f} avg words  "
            f"Sources: {source_cov:5.1f}%  "
            f"Interactive: {interactive_cov:5.1f}%  "
            f"[{quality_label}]"
        )
        
        # Aggressively push all info without flagging/asking
        print_course_warnings(course_id, grouped[course_id])


def write_quality_json(quality_records, output_path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(quality_records, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {len(quality_records)} course quality records to {output_path.relative_to(ROOT)}")


def check_100_percent_source_coverage(grouped, target_course=None):
    missing_sources = []
    for course_id, lessons in grouped.items():
        if target_course and course_id != target_course:
            continue
        for lesson in lessons:
            if not lesson["hasSources"]:
                missing_sources.append(lesson["path"])
    
    if missing_sources:
        print("\n" + "!" * 60)
        print("FATAL ERROR: 100% SOURCE COVERAGE REQUIRED")
        print("The following lessons are completely missing sources:")
        for path in missing_sources:
            print(f"  - {path}")
        print("!" * 60 + "\n")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Report LibreUni course stats and generate course quality data."
    )
    parser.add_argument("course_id", nargs="?", help="Optional course id to report in detail.")
    parser.add_argument(
        "--write-quality",
        action="store_true",
        help="Write apps/main/src/data/course-quality.json for the course catalog.",
    )
    parser.add_argument(
        "--quality-output",
        type=Path,
        default=QUALITY_OUTPUT_PATH,
        help="Output path used with --write-quality.",
    )
    args = parser.parse_args()

    grouped = lessons_by_course()
    overrides = load_quality_overrides()
    quality_records = {
        course_id: course_quality(course_id, lessons, overrides)
        for course_id, lessons in sorted(grouped.items())
    }

    if args.course_id:
        lessons = grouped.get(args.course_id)
        if not lessons:
            available = ", ".join(sorted(grouped))
            raise SystemExit(f"Course not found: {args.course_id}\nAvailable courses: {available}")
        stats = course_stats(args.course_id, lessons)
        print_course_stats(stats, quality_records[args.course_id], lessons)
    else:
        # "more aggressively push all info even without flagging/asking"
        print_all_summary(grouped, quality_records)

    if args.write_quality:
        write_quality_json(quality_records, args.quality_output)

    # Enforce 100% source coverage last (after reporting, so output isn't swallowed on failure)
    check_100_percent_source_coverage(grouped, args.course_id)


if __name__ == "__main__":
    main()

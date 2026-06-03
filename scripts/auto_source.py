#!/usr/bin/env python3
import argparse
import json
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS_DIR = ROOT / "apps" / "main" / "src" / "content" / "lessons"

def clean_term(term):
    # Remove markdown formatting, punctuation, etc.
    term = re.sub(r'[\*`#_\[\]\(\)]', '', term)
    return term.strip()

def search_wikipedia(query):
    """Search Wikipedia and return titles, URLs, and summaries."""
    encoded_query = urllib.parse.quote(query)
    url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={encoded_query}&limit=5&namespace=0&format=json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'LibreUni-SourceBot/1.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = []
            if len(data) >= 4:
                titles = data[1]
                summaries = data[2]
                links = data[3]
                for i in range(len(titles)):
                    results.append({
                        "title": titles[i],
                        "url": links[i],
                        "description": summaries[i],
                        "license": "CC-BY-SA 4.0",
                        "source_type": "Wikipedia Article"
                    })
            return results
    except Exception as e:
        print(f"Wikipedia search failed: {e}", file=sys.stderr)
        return []

def search_openalex(query):
    """Search OpenAlex for open-access papers and academic books."""
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.openalex.org/works?search={encoded_query}&per_page=3"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'mailto:contributor@libreuni.org'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = []
            for work in data.get("results", []):
                title = work.get("title")
                url = work.get("doi") or (work.get("open_access", {}).get("oa_url"))
                if not title or not url:
                    continue
                
                # Format authors
                authors = [a.get("author", {}).get("display_name") for a in work.get("authorships", [])]
                authors_str = ", ".join(authors[:3])
                if len(authors) > 3:
                    authors_str += " et al."
                
                pub_year = work.get("publication_year", "")
                desc = f"Academic work by {authors_str} ({pub_year})"
                
                results.append({
                    "title": title,
                    "url": url,
                    "description": desc,
                    "license": "Creative Commons / Proprietary (Synthesized)",
                    "source_type": "Scholarly Publication"
                })
            return results
    except Exception as e:
        print(f"OpenAlex search failed: {e}", file=sys.stderr)
        return []

def extract_keywords(body, title):
    # Extract bold terms, H2, and title keywords
    keywords = [title]
    # Bold terms
    bold_terms = re.findall(r"\*\*([^*]+)\*\*", body)
    for term in bold_terms[:4]:
        clean = clean_term(term)
        if len(clean) > 3 and clean not in keywords:
            keywords.append(clean)
    # H2 headings
    h2_headings = re.findall(r"^##\s+([^\n]+)", body, re.MULTILINE)
    for heading in h2_headings[:3]:
        clean = clean_term(heading)
        if len(clean) > 3 and clean not in keywords:
            keywords.append(clean)
    return [k for k in keywords if len(k) > 1]

def main():
    parser = argparse.ArgumentParser(description="Automated Sourcing Helper for LibreUni Lessons")
    parser.add_argument("lesson_file", help="Path to the lesson file relative to apps/main/src/content/lessons/")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    args = parser.parse_args()

    lesson_path = LESSONS_DIR / args.lesson_file
    if not lesson_path.is_file():
        print(f"Error: Lesson file '{args.lesson_file}' not found.")
        sys.exit(1)

    content = lesson_path.read_text(encoding="utf-8")
    
    # Simple frontmatter extract
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    title = lesson_path.stem
    body = content
    if fm_match:
        body = content[fm_match.end():]
        for line in fm_match.group(1).splitlines():
            if line.startswith("title:"):
                title = line.split(":", 1)[1].strip().strip('"').strip("'")
                break

    keywords = extract_keywords(body, title)
    
    if not args.json:
        print(f"Extracted Keywords for '{title}': {keywords}")
        print("Searching sources...")

    candidates = []
    # Search for main title
    candidates.extend(search_wikipedia(title))
    if len(candidates) < 3 and len(keywords) > 1:
        candidates.extend(search_wikipedia(keywords[1]))
    
    # Try OpenAlex for the main concept
    candidates.extend(search_openalex(title))

    # Deduplicate by URL
    seen_urls = set()
    unique_candidates = []
    for c in candidates:
        if c["url"] not in seen_urls:
            seen_urls.add(c["url"])
            unique_candidates.append(c)

    if args.json:
        print(json.dumps(unique_candidates, indent=2))
    else:
        print("\n=== Verified Candidate Sources ===")
        for idx, c in enumerate(unique_candidates, 1):
            print(f"\n[{idx}] {c['title']} ({c['source_type']})")
            print(f"    URL: {c['url']}")
            print(f"    License: {c['license']}")
            print(f"    Description: {c['description']}")
        
        print("\nSuggested References MDX Section:")
        print("## References & Further Reading")
        for c in unique_candidates[:4]:
            if "Wikipedia" in c['source_type']:
                print(f"*   [{c['title']}]({c['url']}) ({c['license']})")
            else:
                print(f"*   [{c['title']}]({c['url']}) - {c['description']}")

if __name__ == "__main__":
    main()

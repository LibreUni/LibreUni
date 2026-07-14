from bs4 import BeautifulSoup
from ddgs import DDGS
from urllib.request import Request, urlopen


def research(topic: str, max_sources: int = 8) -> list[dict]:
    """Search and fetch source metadata; only fetched URLs may enter the evidence bundle."""
    results = []
    with DDGS() as client:
        hits = list(client.text(topic, max_results=max_sources * 2))
    for hit in hits:
        url = hit.get("href") or hit.get("url")
        if not url or any(source["url"] == url for source in results):
            continue
        try:
            request = Request(url, headers={"User-Agent": "LibreUni-research/1.0"})
            with urlopen(request, timeout=12) as response:
                html = response.read(600_000).decode("utf-8", errors="replace")
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()
            text = " ".join(soup.get_text(" ").split())
            if len(text) < 200:
                continue
            results.append({"title": hit.get("title", ""), "url": url, "snippet": hit.get("body", ""), "text": text[:12000]})
            if len(results) >= max_sources:
                break
        except Exception as exc:
            results.append({"title": hit.get("title", ""), "url": url, "snippet": hit.get("body", ""), "error": str(exc)})
    return [source for source in results if "error" not in source]


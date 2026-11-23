#!/usr/bin/env python3
"""VardiyaMatik: sitemap synchronizer and lightweight technical SEO monitor.
Only first-party pages are checked; this is NOT a traffic generator.
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

SITE = "https://vardiyamatik.onrender.com/"
PUBLIC = Path(__file__).resolve().parents[1] / "public"
SITEMAP = PUBLIC / "sitemap.xml"
SKIP = re.compile(r"^google[a-z0-9_-]+\.html$", re.IGNORECASE)


def pages() -> list[Path]:
    return sorted(
        (p for p in PUBLIC.glob("*.html") if not SKIP.match(p.name)),
        key=lambda p: (p.name != "index.html", p.name),
    )


def url_for(page: Path) -> str:
    return SITE if page.name == "index.html" else urljoin(SITE, page.name)


def expected_sitemap() -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page in pages():
        lines.append(f"  <url><loc>{url_for(page)}</loc></url>")
    return "\n".join(lines + ["</urlset>", ""])


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def local_problems() -> list[str]:
    problems: list[str] = []
    html_files = pages()
    if not html_files:
        return ["No public HTML pages found"]
    for page in html_files:
        html = page.read_text(encoding="utf-8")
        expected = url_for(page)
        if not re.search(r"<title>[^<]+</title>", html, flags=re.I):
            problems.append(f"{page.name}: missing title")
        if not re.search(r'<meta\s+name="description"\s+content="[^"]+', html, flags=re.I):
            problems.append(f"{page.name}: missing meta description")
        if not re.search(r'<link\s+rel="canonical"\s+href="' + re.escape(expected) + r'"', html, flags=re.I):
            problems.append(f"{page.name}: missing/wrong canonical URL ({expected})")
        link_parser = Links()
        link_parser.feed(html)
        for href in link_parser.links:
            target = urlsplit(urljoin(expected, href))
            if target.netloc != urlsplit(SITE).netloc:
                continue
            path = target.path.lstrip("/")
            dest = PUBLIC / (path if path else "index.html")
            if not dest.is_file():
                problems.append(f"{page.name}: missing local link {href}")
    robots_path = PUBLIC / "robots.txt"
    if not robots_path.exists() or "Sitemap: " + SITE + "sitemap.xml" not in robots_path.read_text(encoding="utf-8"):
        problems.append("robots.txt: missing sitemap declaration")
    try:
        actual = ElementTree.parse(SITEMAP)
        urls = [el.text for el in actual.getroot().iter() if el.tag.endswith("}loc") or el.tag == "loc"]
        expected_urls = [url_for(p) for p in html_files]
        if set(urls) != set(expected_urls) or len(urls) != len(expected_urls):
            problems.append("sitemap.xml: URLs do not match the actual HTML pages")
    except (ElementTree.ParseError, OSError) as exc:
        problems.append(f"sitemap.xml: cannot parse ({exc})")
    return problems


def live_problems() -> list[str]:
    problems: list[str] = []
    targets = ["robots.txt", "sitemap.xml"] + [
        "" if page.name == "index.html" else page.name for page in pages()
    ]
    for path in targets:
        address = urljoin(SITE, path)
        req = Request(address, headers={"User-Agent": "VardiyaMatik-SEO-Healthcheck/1.0"})
        try:
            with urlopen(req, timeout=18) as response:
                status = response.status
                body = response.read(512_000).decode("utf-8", errors="replace")
                if status != 200:
                    problems.append(f"{address}: HTTP {status}")
                elif path == "sitemap.xml" and "<urlset" not in body:
                    problems.append(f"{address}: did not return XML sitemap")
                elif path == "robots.txt" and "Sitemap:" not in body:
                    problems.append(f"{address}: missing sitemap directive")
                elif path.endswith(".html") or not path:
                    expected = urljoin(SITE, path)
                    if f'href="{expected}"' not in body or 'rel="canonical"' not in body:
                        problems.append(f"{address}: canonical link not found")
        except Exception as exc:
            problems.append(f"{address}: {type(exc).__name__} ({exc})")
    return problems


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "local"
    if cmd == "sitemap":
        SITEMAP.write_text(expected_sitemap(), encoding="utf-8")
        print(f"Updated {SITEMAP} with {len(pages())} indexable HTML pages")
        return 0
    if cmd not in ("local", "audit"):
        print("Usage: seo_automation.py [sitemap|local|audit]", file=sys.stderr)
        return 2

    local = local_problems()
    live = live_problems() if cmd == "audit" else []
    print("# VardiyaMatik SEO teknik kontrolü\n")
    print(f"- Kontrol edilen HTML sayfası: **{len(pages())}**")
    print(f"- Dosya kontrolleri: **{'BAŞARILI' if not local else 'HATA'}**")
    if cmd == "audit":
        print(f"- Canlı sayfa kontrolleri: **{'BAŞARILI' if not live else 'HATA'}**")
    print("\nBu kontrol **ziyaretçi sayısı, Google sıralaması veya reklam geliri ölçmez**.\n")
    for issue in local + live:
        print(f"- ❌ {issue}")
    if not (local or live):
        print("- ✅ Kırık iç bağlantı, sitemap, canonical veya erişim hatası saptanmadı.")
    return 1 if local or live else 0


if __name__ == "__main__":
    sys.exit(main())

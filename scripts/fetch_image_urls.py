#!/usr/bin/env python3
"""
Scrape all runway image URLs from Vogue Runway pages.
Extracts from window.__PRELOADED_STATE__ which contains the full gallery.
Saves only URLs (not images) as JSON for frontend hotlinking.

USAGE:
    python3 scripts/fetch_image_urls.py
"""

import json
import re
import time
from pathlib import Path
from urllib.request import urlopen, Request

DATA_PATH = Path(__file__).parent.parent / "site" / "public" / "data.json"
OUTPUT_PATH = Path(__file__).parent.parent / "site" / "public" / "image_urls.json"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

DESIGNER_SLUGS = {
    "CDG Homme Plus": "comme-des-garcons-homme-plus",
    "Yohji Yamamoto": "yohji-yamamoto",
    "Undercover": "undercover",
    "Sacai": "sacai",
    "Number (N)ine": "number-n-ine",
    "visvim": "visvim",
}

VOGUE_SLUGS: dict[str, str] = {}


def fetch_page(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_all_images(html: str) -> list[str]:
    """Extract all runway look URLs from __PRELOADED_STATE__ JSON."""

    # Primary method: parse the preloaded state
    match = re.search(
        r'window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});\s*</script>',
        html, re.DOTALL
    )
    if match:
        try:
            state = json.loads(match.group(1))
            galleries = state.get("transformed", {}).get("runwayGalleries", {}).get("galleryItems", {})
            items = galleries.get("collection", [])

            urls = []
            for item in items:
                img = item.get("image", {})
                sources = img.get("sources", {})
                # Use md (1024px) for gallery view, fall back to sm (360px)
                for size in ("md", "lg", "sm"):
                    if size in sources and "url" in sources[size]:
                        urls.append(sources[size]["url"])
                        break
            if urls:
                return urls
        except (json.JSONDecodeError, KeyError):
            pass

    # Fallback: regex for asset URLs
    pattern = r'https://assets\.vogue\.com/photos/([a-f0-9]+)/master/w_\d+[^"\'\s&]*\.jpg'
    matches = re.findall(pattern, html)
    seen = set()
    photo_ids = []
    for pid in matches:
        if pid not in seen:
            seen.add(pid)
            photo_ids.append(pid)

    urls = []
    for pid in photo_ids:
        fname_pat = rf'https://assets\.vogue\.com/photos/{pid}/[^"\'\s&]*?/([^"\'\s&/]+\.jpg)'
        fname_match = re.search(fname_pat, html)
        if fname_match:
            urls.append(f"https://assets.vogue.com/photos/{pid}/master/w_1024,c_limit/{fname_match.group(1)}")
    return urls


def main():
    with open(DATA_PATH) as f:
        data = json.load(f)

    # Load existing results to support resuming
    existing = {}
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH) as f:
            existing = json.load(f)

    collections = data["collections"]
    print(f"Fetching image URLs for {len(collections)} collections...")

    result = dict(existing)
    success = 0
    skipped = 0
    failed = 0

    for i, coll in enumerate(collections):
        designer = coll["designer"]
        season = coll["season"]
        csv_slug = DESIGNER_SLUGS.get(designer, designer)
        vogue_slug = VOGUE_SLUGS.get(csv_slug, csv_slug)

        key = f"{csv_slug}/{season}"

        # Skip if already have a good result (more than 5 images)
        if key in result and len(result[key]) > 5:
            skipped += 1
            continue

        url = f"https://www.vogue.com/fashion-shows/{season}/{vogue_slug}/slideshow/collection"
        print(f"  [{i+1}/{len(collections)}] {designer} {season}...", end=" ", flush=True)

        try:
            html = fetch_page(url)
            urls = extract_all_images(html)

            if urls:
                result[key] = urls
                print(f"{len(urls)} images")
                success += 1
            else:
                print("no images found")
                failed += 1

            time.sleep(1)

        except Exception as e:
            print(f"error: {e}")
            failed += 1
            time.sleep(1.5)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(result, f)

    total_images = sum(len(v) for v in result.values())
    print(f"\nDone: {success} new, {skipped} skipped, {failed} failed")
    print(f"Total image URLs: {total_images} across {len(result)} collections")
    print(f"Saved to {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

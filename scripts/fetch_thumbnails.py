#!/usr/bin/env python3
"""
Fetch one thumbnail per collection from Vogue Runway.
One-time operation — grabs the first look from each collection page,
resizes to 300px wide, saves to site/public/thumbs/.

USAGE:
    python3 scripts/fetch_thumbnails.py
"""

import json
import re
import time
import sys
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen, Request

from PIL import Image

DATA_PATH = Path(__file__).parent.parent / "site" / "public" / "data.json"
THUMB_DIR = Path(__file__).parent.parent / "site" / "public" / "thumbs"
THUMB_WIDTH = 300
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Map our CSV designer slugs to Vogue Runway URL slugs
DESIGNER_SLUG_MAP = {
    "comme-des-garcons-homme-plus": "comme-des-garcons-homme-plus",
    "yohji-yamamoto": "yohji-yamamoto",
    "undercover": "undercover",
    "sacai": "sacai",
    "number-n-ine": "number-n-ine",
    "visvim": "visvim",
}


def fetch_page(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_first_image(html: str) -> str | None:
    """Extract the first runway look image URL from a Vogue slideshow page."""
    # Match clean Vogue asset URLs ending in .jpg or .webp
    pattern = r'https://assets\.vogue\.com/photos/[a-f0-9]+/master/w_\d+[^"\'\s&]*\.jpg'
    matches = re.findall(pattern, html)
    if matches:
        # Use the first runway image, request at w_600
        url = re.sub(r'/w_\d+,', '/w_600,', matches[0])
        return url

    # Fallback: any pass/ URL
    pattern2 = r'https://assets\.vogue\.com/photos/[a-f0-9]+/[^"\'\s&]+/pass/[^"\'\s&]+\.jpg'
    matches2 = re.findall(pattern2, html)
    if matches2:
        return matches2[0]

    return None


def download_and_resize(url: str, out_path: Path) -> bool:
    try:
        req = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=15) as resp:
            data = resp.read()
        img = Image.open(BytesIO(data)).convert("RGB")
        ratio = THUMB_WIDTH / img.width
        new_h = int(img.height * ratio)
        img = img.resize((THUMB_WIDTH, new_h), Image.LANCZOS)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path, "JPEG", quality=80)
        return True
    except Exception as e:
        print(f"    download failed: {e}")
        return False


def main():
    with open(DATA_PATH) as f:
        data = json.load(f)

    collections = data["collections"]
    print(f"Fetching thumbnails for {len(collections)} collections...")

    # Build a mapping from data.json back to CSV slugs
    label_to_slug = {
        "CDG Homme Plus": "comme-des-garcons-homme-plus",
        "Yohji Yamamoto": "yohji-yamamoto",
        "Undercover": "undercover",
        "Sacai": "sacai",
        "Number (N)ine": "number-n-ine",
        "visvim": "visvim",
    }

    success = 0
    skipped = 0
    failed = 0

    for i, coll in enumerate(collections):
        designer_label = coll["designer"]
        season = coll["season"]
        csv_slug = label_to_slug.get(designer_label, designer_label)
        vogue_slug = DESIGNER_SLUG_MAP.get(csv_slug, csv_slug)

        out_path = THUMB_DIR / csv_slug / f"{season}.jpg"
        if out_path.exists():
            skipped += 1
            continue

        # Vogue Runway URL pattern
        url = f"https://www.vogue.com/fashion-shows/{season}/{vogue_slug}/slideshow/collection"
        print(f"  [{i+1}/{len(collections)}] {designer_label} {season}...", end=" ", flush=True)

        try:
            html = fetch_page(url)
            img_url = extract_first_image(html)

            if not img_url:
                print("no image found")
                failed += 1
                continue

            if download_and_resize(img_url, out_path):
                print("ok")
                success += 1
            else:
                failed += 1

            time.sleep(1.5)  # be polite

        except Exception as e:
            print(f"error: {e}")
            failed += 1
            time.sleep(2)

    print(f"\nDone: {success} new, {skipped} skipped, {failed} failed")
    print(f"Thumbnails saved to {THUMB_DIR}/")


if __name__ == "__main__":
    main()

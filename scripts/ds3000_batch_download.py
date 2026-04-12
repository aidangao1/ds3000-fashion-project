#!/usr/bin/env python3
"""
DS3000 Batch Downloader - Japanese Archive Designers
=====================================================
Uses TonyAssi's Vogue-Runway-Scraper to download all runway images
for Japanese archive designers in the project.

SETUP:
    1. Clone the scraper:
       git clone https://github.com/TonyAssi/Vogue-Runway-Scraper.git
       cd Vogue-Runway-Scraper
       pip3 install -r requirements.txt

    2. Copy THIS script into the Vogue-Runway-Scraper folder:
       cp ~/Downloads/ds3000_batch_download.py ./

    3. Run it:
       python3 ds3000_batch_download.py

       Or download just one designer:
       python3 ds3000_batch_download.py --designer "yohji-yamamoto"

       Or list all available shows for a designer:
       python3 ds3000_batch_download.py --list "number-n-ine"

OUTPUT:
    ds3000-runway-images/
    ├── number-n-ine/
    │   ├── Spring 2007 Menswear/
    │   │   ├── 1.jpg
    │   │   └── ...
    │   └── ...
    ├── yohji-yamamoto/
    └── ...
"""

import sys
import os
import argparse
import time

try:
    import vogue
except ImportError:
    print("ERROR: Can't find vogue.py")
    print("Make sure you're running this script from inside the Vogue-Runway-Scraper folder.")
    print("  cd Vogue-Runway-Scraper")
    print("  python3 ds3000_batch_download.py")
    sys.exit(1)


# =========================================================================
# JAPANESE ARCHIVE DESIGNERS ONLY
# =========================================================================

DS3000_DESIGNERS = [
    "number-n-ine",
    "yohji-yamamoto",
    "comme-des-garcons-homme-plus",
    "undercover",
    "junya-watanabe-man",
    "issey-miyake-men",
    "sacai",
    "visvim",
]

OUTPUT_DIR = "ds3000-runway-images"


def list_shows(designer_slug):
    """List all available shows for a designer."""
    print(f"\nFetching shows for '{designer_slug}'...")
    try:
        shows = vogue.designer_to_shows(designer_slug)
        if not shows:
            print(f"  No shows found. Try a different slug name.")
            return []
        print(f"  Found {len(shows)} shows:")
        for i, show in enumerate(shows, 1):
            marker = " <-- MENSWEAR" if "menswear" in show.lower() else ""
            print(f"    {i:3d}. {show}{marker}")
        return shows
    except Exception as e:
        print(f"  ERROR: {e}")
        return []


def download_designer(designer_slug, output_base):
    """Download all menswear shows for a designer."""
    print(f"\n{'='*60}")
    print(f"DESIGNER: {designer_slug}")
    print(f"{'='*60}")

    try:
        shows = vogue.designer_to_shows(designer_slug)
    except Exception as e:
        print(f"  ERROR fetching shows: {e}")
        print(f"  Skipping {designer_slug}")
        return 0

    if not shows:
        print(f"  No shows found for '{designer_slug}'")
        print(f"  The slug might be different on Vogue. Try --list to check.")
        return 0

    menswear_shows = [s for s in shows if "menswear" in s.lower()]

    if not menswear_shows:
        print(f"  Found {len(shows)} shows but NONE are menswear.")
        print(f"  Available shows:")
        for s in shows[:10]:
            print(f"    - {s}")
        if len(shows) > 10:
            print(f"    ... and {len(shows) - 10} more")
        return 0

    print(f"  Found {len(menswear_shows)} menswear shows (out of {len(shows)} total)")

    designer_dir = os.path.join(output_base, designer_slug)
    total_images = 0

    for i, show_name in enumerate(menswear_shows, 1):
        show_dir = os.path.join(designer_dir, show_name)

        if os.path.exists(show_dir):
            existing = [f for f in os.listdir(show_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if len(existing) >= 3:
                print(f"  [{i}/{len(menswear_shows)}] SKIP '{show_name}' ({len(existing)} images exist)")
                total_images += len(existing)
                continue

        print(f"  [{i}/{len(menswear_shows)}] Downloading '{show_name}'...", end=" ", flush=True)

        try:
            vogue.designer_show_to_download_images(designer_slug, show_name, designer_dir)

            if os.path.exists(show_dir):
                downloaded = [f for f in os.listdir(show_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
                count = len(downloaded)
            else:
                count = 0

            print(f"{count} images")
            total_images += count

            time.sleep(2)

        except Exception as e:
            print(f"ERROR: {e}")

    print(f"\n  TOTAL for {designer_slug}: {total_images} images across {len(menswear_shows)} shows")
    return total_images


def main():
    parser = argparse.ArgumentParser(description="DS3000 Vogue Runway Batch Downloader")
    parser.add_argument("--designer", type=str, help="Download only this designer (slug name)")
    parser.add_argument("--list", type=str, help="List all shows for a designer (slug name)")
    parser.add_argument("--output", type=str, default=OUTPUT_DIR, help="Output directory")
    args = parser.parse_args()

    if args.list:
        list_shows(args.list)
        return

    os.makedirs(args.output, exist_ok=True)

    if args.designer:
        download_designer(args.designer, args.output)
        return

    print("DS3000 Vogue Runway Batch Downloader")
    print(f"Downloading {len(DS3000_DESIGNERS)} Japanese archive designers to '{args.output}/'")
    print(f"This will take a while. Ctrl+C to stop, rerun to resume.\n")
    print("Designers:")
    for d in DS3000_DESIGNERS:
        print(f"  - {d}")
    print()

    grand_total = 0
    results = {}

    for designer in DS3000_DESIGNERS:
        count = download_designer(designer, args.output)
        results[designer] = count
        grand_total += count

    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    for designer, count in results.items():
        status = "OK" if count > 0 else "FAILED/EMPTY"
        print(f"  {designer:40s} {count:5d} images  [{status}]")
    print(f"\n  GRAND TOTAL: {grand_total} images")
    print(f"  Output: {os.path.abspath(args.output)}/")
    print(f"\n  Next step: upload folders to Claude for scoring!")


if __name__ == "__main__":
    main()

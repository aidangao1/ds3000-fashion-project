#!/usr/bin/env python3
"""
Clean Vogue Runway download folders.
Keeps only the highest-quality front-view photo per look.

Usage:
    python3 clean_vogue_folder.py "path/to/downloaded/folder" "output/folder"
"""

import os
import shutil
import re
import sys
from pathlib import Path

if len(sys.argv) < 3:
    print("Usage: python3 clean_vogue_folder.py <source_folder> <output_folder>")
    sys.exit(1)

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)

files = [f for f in src.iterdir() if f.suffix.lower() in ('.jpg', '.jpeg') and 'details' not in f.name.lower()]
bases = {}
for f in files:
    m = re.match(r'(\d{5}|_MON\d+b?)', f.name)
    if m:
        bases.setdefault(m.group(1), []).append(f)

for i, key in enumerate(sorted(bases.keys()), 1):
    candidates = bases[key]
    pick = next((c for c in candidates if '(1)' in c.name), None)
    if not pick:
        pick = next((c for c in candidates if '(' not in c.name), None)
    if not pick:
        pick = max(candidates, key=lambda f: f.stat().st_size)
    shutil.copy2(pick, dst / f"look_{i:02d}.jpg")

print(f"Cleaned {len(bases)} looks into {dst}")

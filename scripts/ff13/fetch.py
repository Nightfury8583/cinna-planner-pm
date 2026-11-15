#!/usr/bin/env python3
"""
Step 1 of 2: download the FF13 source pages from guides.gamercorner.net into a local cache.

    python3 scripts/ff13/fetch.py            # cache dir defaults to /tmp/ff13-cache
    FF13_CACHE=/some/dir python3 scripts/ff13/fetch.py

Downloads the table CSVs (weapons, accessories, components, shops) and one detail page per
weapon, accessory and component. Already-cached files are skipped, so re-running is cheap. A short delay is used
between requests to be polite to the site.
"""
import csv
import os
import re
import sys
import time
import urllib.request
from urllib.error import HTTPError

BASE = "https://guides.gamercorner.net/ffxiii"
CACHE = os.environ.get("FF13_CACHE", "/tmp/ff13-cache")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
DELAY = 0.25


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def cached(rel_path, url):
    path = os.path.join(CACHE, rel_path)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    time.sleep(DELAY)
    try:
        data = get(url)
    except HTTPError as e:
        print(f"  !! {e.code} {url}", file=sys.stderr)
        return None
    with open(path, "w", encoding="utf-8") as f:
        f.write(data)
    return path


def slugify(name):
    s = name.lower().replace("'", "").replace("\u2019", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def detail_urls(csv_path, kind):
    """Yield (name, relative cache path, url). Duplicate names get /1, /2, ... suffixes."""
    with open(csv_path, encoding="utf-8") as f:
        names = [row["Name"] for row in csv.DictReader(f)]
    totals = {}
    for n in names:
        totals[n] = totals.get(n, 0) + 1
    seen = {}
    for n in names:
        seen[n] = seen.get(n, 0) + 1
        slug = slugify(n)
        suffix = f"/{seen[n]}" if totals[n] > 1 else ""
        yield n, f"{kind}/{slug}{'-' + str(seen[n]) if suffix else ''}.html", f"{BASE}/{kind}/{slug}{suffix}"


def main():
    for table in ("weapons", "components", "accessories", "shops"):
        p = cached(f"{table}.csv", f"{BASE}/tables/{table}/csv")
        print(table, "csv ->", p)

    for kind in ("weapons", "accessories", "components"):
        csv_path = os.path.join(CACHE, f"{kind}.csv")
        items = list(detail_urls(csv_path, kind))
        missing = 0
        for i, (name, rel, url) in enumerate(items, 1):
            if not cached(rel, url):
                missing += 1
                print(f"  failed: {name} ({url})", file=sys.stderr)
            if i % 25 == 0:
                print(f"{kind}: {i}/{len(items)}")
        print(f"{kind}: done, {len(items) - missing}/{len(items)} cached")


if __name__ == "__main__":
    main()

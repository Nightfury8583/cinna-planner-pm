#!/usr/bin/env python3
"""
Step 2 of 2: parse the cached FF13 pages (see fetch.py) and write normalized JSON into
src/data/ff13/. Every table is keyed by a stable id (the site's URL slug, e.g. "omega-weapon-1").

Requires:  pip install beautifulsoup4 lxml

    python3 scripts/ff13/build.py

The script also validates the data it produces (formula checks against the per-level tables,
bonus tier thresholds, shop references). Any failed check is printed and the exit code is 1.
"""
import csv
import html
import json
import math
import os
import re
import sys
from collections import Counter

from bs4 import BeautifulSoup

CACHE = os.environ.get("FF13_CACHE", "/tmp/ff13-cache")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "data", "ff13")

# Multiplier tiers. Verified against the "Minimum Component Use to Multiplier Tiers" table of
# every organic component (see validate_bonus_tiers).
BONUS_TIERS = [
    {"multiplier": 1.0, "minBonus": 0},
    {"multiplier": 1.25, "minBonus": 51},
    {"multiplier": 1.5, "minBonus": 101},
    {"multiplier": 1.75, "minBonus": 201},
    {"multiplier": 2.0, "minBonus": 251},
    {"multiplier": 3.0, "minBonus": 501},
]
MAX_COMPONENTS_PER_BATCH = 99

# Weapons sold by Gilgamesh, Inc. at 10x the usual price (normal rule: buy price = 2 x sell value at
# the starting level). Confirmed against the FF Wiki for Tigerclaw (300,000 gil); the other five follow
# the identical pattern. Any *other* weapon that breaks the 2x rule is reported as a problem.
GILGAMESH_MARKUP = {"organyx", "aldebarans", "sacrificial-circle", "malphas", "tigerclaw", "dragoon-lance"}

# Manual corrections where GamerCorner disagrees with two independent sources
# (finalfantasykingdom.net and jegged.com). Format: component id -> {field: value}.
COMPONENT_OVERRIDES = {
    # GamerCorner lists 480; both other sites list 420.
    "tungsten-tube": {"sellPrice": 420},
}

# Accessory whose buy price is 10x its sell value instead of 2x (Sanctum Labs, 200,000 gil). NOT
# independently verified: only GamerCorner lists it. Accessory buy prices are not used by the calculator.
ACCESSORY_PRICE_FACTOR = {"royal-armlet": 10}

problems = []


def problem(msg):
    problems.append(msg)
    print("  CHECK FAILED:", msg, file=sys.stderr)


# --------------------------------------------------------------------------- helpers

def to_int(text):
    """'1,234' -> 1234, '−100' -> -100, '+34' -> 34, '15 gil' -> 15. Returns None if no digits."""
    if text is None:
        return None
    t = html.unescape(text).replace("\u2212", "-").replace(",", "").replace("\u00a0", " ")
    m = re.search(r"-?\d+", t)
    return int(m.group()) if m else None


def id_from_href(href):
    """'/ffxiii/weapons/omega-weapon/2' -> 'omega-weapon-2'; '/ffxiii/components/x' -> 'x'."""
    parts = href.strip("/").split("/")[2:]
    return "-".join(parts)


def slugify(name):
    s = name.lower().replace("'", "").replace("\u2019", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def read_csv(name):
    with open(os.path.join(CACHE, name), encoding="utf-8") as f:
        return list(csv.DictReader(f))


def soup_of(rel):
    with open(os.path.join(CACHE, rel), encoding="utf-8") as f:
        return BeautifulSoup(f.read(), "lxml")


def first_card_fields(s, kind):
    """Label -> <span class=value> for the page's own item (the first card)."""
    card = s.select_one("div.card")
    if card is None or f"card-ffxiii-{kind}" not in card.get("class", []):
        raise ValueError("first card is not an FFXIII %s card" % kind)
    fields = {}
    for cf in card.select("div.card-field"):
        label = cf.find("span", class_="label").get_text(strip=True)
        fields[label] = cf.find("span", class_="value")
    return fields


def table_by_first_header(s, header):
    for t in s.find_all("table"):
        th = t.find("th")
        if th and th.get_text(strip=True) == header:
            return t
    return None


def table_rows(t):
    return [
        {"cells": [td.get_text(strip=True) for td in tr.find_all("td")], "class": tr.get("class", [])}
        for tr in t.find_all("tr")[1:]
    ]


def parse_item_links(span):
    """
    Parse a value span like '13 Spark Plugs , Tungsten Tube , Axis Blade (effective ...)' into
    [{'id', 'type', 'qty'}]. The quantity is the integer immediately before each link.
    """
    out = []
    pending_qty = 1
    for node in span.children:
        if getattr(node, "name", None) == "a":
            href = node["href"]
            kind = "component" if "/components/" in href else "weapon" if "/weapons/" in href else None
            if kind:
                out.append({"id": id_from_href(href), "type": kind, "qty": pending_qty})
            pending_qty = 1
        else:
            text = node if isinstance(node, str) else node.get_text()
            m = re.search(r"(\d[\d,]*)\s*$", text.split(",")[-1] if "," in text else text)
            if m and "effective" not in text:
                pending_qty = to_int(m.group(1))
    return out


# --------------------------------------------------------------------------- components

def build_components():
    rows = read_csv("components.csv")
    seen = Counter()
    components = {}
    for row in rows:
        name = row["Name"]
        cid = slugify(name)
        seen[cid] += 1
        if seen[cid] > 1:
            problem(f"duplicate component id {cid}")
        s = soup_of(f"components/{cid}.html")
        f = first_card_fields(s, "components")
        text = lambda k: f[k].get_text(" ", strip=True) if k in f else None  # noqa: E731

        exp_by_rank = None
        t = table_by_first_header(s, "Rank")
        if t is not None and "Experience" in [th.get_text(strip=True) for th in t.find_all("th")]:
            by_rank = {to_int(r["cells"][0]): to_int(r["cells"][1]) for r in table_rows(t)}
            if sorted(by_rank) != list(range(1, 12)):
                problem(f"{cid}: exp-by-rank table incomplete: {sorted(by_rank)}")
            exp_by_rank = [by_rank.get(r) for r in range(1, 12)]

        desc = text("Description") or ""
        comp = {
            "id": cid,
            "name": name,
            "type": text("Type").lower(),  # organic | mechanical | catalyst
            "rank": to_int(text("Rank")),
            "baseExp": to_int(text("Base Experience")),
            "bonus": to_int(text("Bonus Adjustment")),
            # EXP when used on a weapon of rank 1..11 (index 0 = rank 1). Null for catalysts.
            "expByRank": exp_by_rank,
            "buyPrice": to_int(text("Price")),
            "sellPrice": to_int(text("Value")),
            # "Can be sold for a premium": chips, dolls, ingots... not meant for upgrading.
            "premium": "premium" in desc.lower(),
            "chapter": to_int(text("Chapter")),
            "description": desc,
        }
        # Cross-check against the list CSV (independent rendering of the same data).
        if to_int(row["Rank"]) != comp["rank"]:
            problem(f"{cid}: rank mismatch csv={row['Rank']} page={comp['rank']}")
        if (to_int(row["Value"]) or None) != comp["sellPrice"] and cid not in COMPONENT_OVERRIDES:
            problem(f"{cid}: sell price mismatch csv={row['Value']} page={comp['sellPrice']}")
        if (to_int(row["Price"]) or None) != comp["buyPrice"]:
            problem(f"{cid}: buy price mismatch csv={row['Price']} page={comp['buyPrice']}")
        if row["Multiplier"] and to_int(row["Multiplier"]) != comp["bonus"]:
            problem(f"{cid}: bonus mismatch csv={row['Multiplier']} page={comp['bonus']}")

        # Min component counts per multiplier tier, used to validate BONUS_TIERS.
        tier_table = None
        for tt in s.find_all("table"):
            hs = [th.get_text(strip=True) for th in tt.find_all("th")]
            if hs == ["Bonus", "Number"]:
                tier_table = tt
        comp["_tierCounts"] = (
            {r["cells"][0]: to_int(r["cells"][1]) for r in table_rows(tier_table)} if tier_table else None
        )
        for field, value in COMPONENT_OVERRIDES.get(cid, {}).items():
            comp[field] = value
        components[cid] = comp
    return components


def validate_components(components):
    for c in components.values():
        counts = c.pop("_tierCounts")
        if c["type"] == "organic" and counts:
            for tier in BONUS_TIERS[1:]:
                key = "\u00d7%g" % tier["multiplier"]
                want = counts.get(key)
                got = math.ceil(tier["minBonus"] / c["bonus"])
                if want != got:
                    problem(f"{c['id']}: tier {key} needs {want} per site but thresholds give {got}")
        if c["type"] != "catalyst" and c["expByRank"]:
            r = c["rank"]
            if c["expByRank"][r - 1] != c["baseExp"]:
                problem(f"{c['id']}: expByRank[rank] {c['expByRank'][r-1]} != baseExp {c['baseExp']}")
            if any(a < b for a, b in zip(c["expByRank"], c["expByRank"][1:])):
                problem(f"{c['id']}: expByRank is not non-increasing: {c['expByRank']}")


# --------------------------------------------------------------------------- weapons

def linear(values, name, wid):
    """values: list of (level, value). Returns (valueAtFirstLevel, perLevel) or None if not linear."""
    if all(v in (None, 0) for _, v in values):
        return None  # the weapon has no such stat (e.g. magic-only or strength-only weapons)
    (l0, v0), (l1, v1) = values[0], values[1]
    step = (v1 - v0) / (l1 - l0)
    if step != int(step):
        problem(f"{wid}: {name} per-level step is not an integer ({step})")
        return None
    step = int(step)
    for lvl, v in values:
        if v != v0 + step * (lvl - l0):
            problem(f"{wid}: {name} is not linear at level {lvl}")
            return None
    return v0, step


def exp_to_reach(item, level):
    """Total EXP from level 1 to arrive at `level` (level 1 costs 0)."""
    return sum(item["expBase"] + item["expPerLevel"] * (k - 2) for k in range(2, level + 1))


def parse_progression(s, row, wid):
    """
    Parse the per-level table plus the CSV's upgrade-cost columns (identical for weapons and accessories).
    Returns the common level/EXP fields and the raw per-level rows.
    """
    t = table_by_first_header(s, "Level")
    heads = [th.get_text(strip=True) for th in t.find_all("th")]
    col = {h: i for i, h in enumerate(heads)}
    rows_ = table_rows(t)
    body = [r for r in rows_ if r["cells"][0] != "\u2729"]
    star = [r for r in rows_ if r["cells"][0] == "\u2729"]
    if len(star) != 1:
        problem(f"{wid}: expected one ✩ row")
    start_level = to_int(body[0]["cells"][0])
    max_level = to_int(row["Levels"]) + 1  # the ✩ "master" level
    lv = [(to_int(r["cells"][0]), r) for r in body] + [(max_level, star[0])]
    cost_parts = row["Upgrade Cost"].split("+")  # "300+57/lv", or just "1,800" for one-level items
    exp_cost = to_int(cost_parts[0])
    exp_incr = to_int(cost_parts[1]) if len(cost_parts) > 1 else 0
    master_exp = to_int(row["Master EXP"])

    # EXP table: cost to arrive at level L is base + incr*(L-2)  (level 1 costs 0).
    for L, r in lv:
        if L >= 2 and to_int(r["cells"][col["EXP Cost"]]) != exp_cost + exp_incr * (L - 2):
            problem(f"{wid}: exp cost formula fails at level {L}")
            break
    total_from_1 = sum(exp_cost + exp_incr * (L - 2) for L in range(2, max_level + 1))
    if total_from_1 != master_exp:
        problem(f"{wid}: sum of level costs {total_from_1} != master EXP {master_exp}")
    return {
        "lv": lv,
        "col": col,
        "startLevel": start_level,
        "maxLevel": max_level,
        "expBase": exp_cost,
        "expPerLevel": exp_incr,
        "masterExp": master_exp,
        # EXP from the start of startLevel to the star level (ignores carry-over)
        "masterExpFromStart": to_int(body[0]["cells"][col["EXP to Master"]]),
        "sellValue": linear([(L, to_int(r["cells"][col["Value"]])) for L, r in lv], "sell value", wid),
    }


def parse_upgrade_links(f):
    """
    Returns (upgradesTo | None, upgradedFrom list). The catalyst is always the last link; everything
    before it is an item. startLevel is None when the result is created at the star level ("Lv.✩");
    resolve_start_levels() fills that in.
    """
    def split(span):
        links = span.find_all("a")
        catalyst = id_from_href(links[-1]["href"]) if links and "/components/" in links[-1]["href"] else None
        items = [id_from_href(a["href"]) for a in links if "/components/" not in a["href"]]
        return items, catalyst

    up_to, up_from = None, []
    if "Upgraded To" in f:
        items, catalyst = split(f["Upgraded To"])
        m = re.search(r"Lv\.(\d+)", f["Upgraded To"].get_text(" "))
        up_to = {"item": items[0], "catalyst": catalyst, "startLevel": int(m.group(1)) if m else None}
    if "Upgraded From" in f:
        items, catalyst = split(f["Upgraded From"])
        up_from = [{"item": i, "catalyst": catalyst} for i in items]
    return up_to, up_from


def resolve_start_levels(items):
    for it in items.values():
        up = it["upgradesTo"]
        if up and up["startLevel"] is None:
            up["startLevel"] = items[up["item"]]["maxLevel"]


def build_weapons(components):
    rows = read_csv("weapons.csv")
    totals = Counter(r["Name"] for r in rows)
    seen = Counter()
    weapons = {}
    for row in rows:
        name = row["Name"]
        seen[name] += 1
        wid = slugify(name) + (f"-{seen[name]}" if totals[name] > 1 else "")
        s = soup_of(f"weapons/{wid}.html")
        f = first_card_fields(s, "weapons")
        text = lambda k: f[k].get_text(" ", strip=True) if k in f else None  # noqa: E731
        links = lambda k: [id_from_href(a["href"]) for a in f[k].find_all("a")] if k in f else []  # noqa: E731

        prog = parse_progression(s, row, wid)
        lv, col = prog["lv"], prog["col"]
        start_level, max_level = prog["startLevel"], prog["maxLevel"]
        strength = linear([(L, to_int(r["cells"][col["Strength"]])) for L, r in lv], "strength", wid)
        magic = linear([(L, to_int(r["cells"][col["Magic"]])) for L, r in lv], "magic", wid)
        value = prog["sellValue"]
        up_to, up_from = parse_upgrade_links(f)
        origin = links("Original Weapon")
        tier = 3 if origin else 2 if up_from else 1

        dismantle = parse_item_links(f["Level \u2729 Dismantled Into"]) if "Level \u2729 Dismantled Into" in f else []
        for d in dismantle:
            if d["type"] == "component" and d["id"] not in components:
                problem(f"{wid}: dismantle references unknown component {d['id']}")

        for label, col, fit in (("strength", "Strength", strength), ("magic", "Magic", magic)):
            rng = [int(x) for x in re.findall(r"\d+", html.unescape(row[col]))][:2]
            if fit is None:
                if rng:
                    problem(f"{wid}: csv lists a {label} range {rng} but the level table has none")
            elif rng != [fit[0], fit[0] + fit[1] * (max_level - start_level)]:
                problem(f"{wid}: {label} range {rng} disagrees with level table")

        weapons[wid] = {
            "id": wid,
            "kind": "weapon",
            "name": name,        # replaced by the unique display name in finalize_weapons()
            "baseName": name,    # the in-game name (ultimate weapons share these)
            "character": text("Character"),
            "tier": tier,
            "rank": to_int(text("Rank")),
            "ability": text("Ability"),
            "extraAbility": text("Extra Ability"),
            "synthesizes": text("Synthesizes"),
            "chapter": to_int(text("Chapter")),
            # Levels
            "startLevel": start_level,       # level you have when you first get it (1 unless upgraded into)
            "anchorLevel": start_level,      # level the stat / sell value formulas are anchored at
            "maxLevel": max_level,           # the mastered (✩) level
            # EXP: cost to reach level L (L >= 2) = expBase + expPerLevel * (L - 2)
            "expBase": prog["expBase"],
            "expPerLevel": prog["expPerLevel"],
            "masterExp": prog["masterExp"],  # total EXP from level 1 to ✩
            "masterExpFromStart": prog["masterExpFromStart"],  # from the start of startLevel to ✩ (no carry-over)
            # Stats and sell value at level L = atAnchor + perLevel * (L - anchorLevel)
            "strength": {"atAnchor": strength[0], "perLevel": strength[1]} if strength else None,
            "magic": {"atAnchor": magic[0], "perLevel": magic[1]} if magic else None,
            "sellValue": {"atAnchor": value[0], "perLevel": value[1]},
            "buyPrice": to_int(row["Price"]),  # first listed price; real offers are in shops.json
            "upgradesTo": up_to,
            "upgradedFrom": up_from,
            "originWeapon": origin[0] if origin else None,
            "dismantle": dismantle,          # what a mastered (✩) weapon breaks down into
            "description": text("Description"),
        }
        if (row["Character"] or None) != weapons[wid]["character"]:
            problem(f"{wid}: character mismatch csv={row['Character']} page={weapons[wid]['character']}")
        if to_int(row["Rank"]) != weapons[wid]["rank"]:
            problem(f"{wid}: rank mismatch")
    return weapons


def finalize_weapons(weapons):
    """
    Add derived fields:
      name          unique display name; ultimate weapons become "Omega Weapon (Blazefire Saber)"
      maxStrength / maxMagic    stats at the mastered level (null if the weapon has no such stat)
      ultimateId    the tier-3 weapon this weapon ends up as (itself for tier 3)
    """
    for w in weapons.values():
        span = w["maxLevel"] - w["anchorLevel"]
        for stat, key in (("strength", "maxStrength"), ("magic", "maxMagic")):
            w[key] = w[stat]["atAnchor"] + w[stat]["perLevel"] * span if w[stat] else None
        if w["tier"] == 3:
            origin = weapons.get(w["originWeapon"])
            if origin is None:
                problem(f"{w['id']}: unknown originWeapon {w['originWeapon']}")
            else:
                w["name"] = f"{w['baseName']} ({origin['baseName']})"
    for w in weapons.values():
        cur, guard = w, 0
        while cur["upgradesTo"] and guard < 5:
            cur = weapons[cur["upgradesTo"]["item"]]
            guard += 1
        w["ultimateId"] = cur["id"]
        if cur["tier"] != 3:
            problem(f"{w['id']}: upgrade chain does not end in a tier-3 weapon")
    names = Counter(w["name"] for w in weapons.values())
    for n, c in names.items():
        if c > 1:
            problem(f"display name is not unique: {n}")
    by_ultimate = Counter(w["ultimateId"] for w in weapons.values() if w["tier"] == 1)
    if any(c != 1 for c in by_ultimate.values()) or len(by_ultimate) != sum(
        1 for w in weapons.values() if w["tier"] == 1
    ):
        problem("tier-1 weapons do not map one-to-one onto ultimate weapons")


def validate_chains(items):
    """Upgrade links must be consistent in both directions and carry EXP over correctly."""
    weapons = items
    for w in items.values():
        up = w["upgradesTo"]
        if up:
            nxt = items.get(up["item"])
            if not nxt:
                problem(f"{w['id']}: upgradesTo unknown item {up['item']}")
                continue
            if nxt["buyPrice"] is None and nxt["startLevel"] != up["startLevel"]:
                problem(f"{w['id']}: startLevel {up['startLevel']} != {nxt['id']}.startLevel {nxt['startLevel']}")
            if w["id"] not in [u["item"] for u in nxt["upgradedFrom"]]:
                problem(f"{nxt['id']}: upgradedFrom does not point back to {w['id']}")
            # The mastered weapon's EXP carries over: it must land inside the starting level.
            carried = w["masterExp"]
            reach = lambda L: sum(nxt["expBase"] + nxt["expPerLevel"] * (k - 2) for k in range(2, L + 1))  # noqa: E731
            L = up["startLevel"]
            # Created at the star level: the carried EXP can only overshoot (the excess is lost).
            upper = float("inf") if L >= nxt["maxLevel"] else reach(L + 1)
            if not (reach(L) <= carried < upper):
                problem(f"{w['id']} -> {nxt['id']}: carry-over {carried} not inside level {L} "
                        f"[{reach(L)}, {upper})")
            if nxt["masterExp"] <= carried and L < nxt["maxLevel"]:
                problem(f"{nxt['id']}: masterExp not above previous tier")
    # every ultimate weapon has a chain back to a tier-1 weapon
    for w in weapons.values():
        if w["kind"] == "weapon" and w["tier"] == 3:
            t2 = weapons.get(w["upgradedFrom"][0]["item"]) if w["upgradedFrom"] else None
            if not t2 or not t2["upgradedFrom"] and t2["tier"] != 1 and not w["originWeapon"]:
                problem(f"{w['id']}: broken upgrade chain")


# --------------------------------------------------------------------------- accessories

def build_accessories(components):
    rows = read_csv("accessories.csv")
    accessories = {}
    for row in rows:
        name = row["Name"]
        aid = slugify(name)
        if aid in accessories:
            problem(f"duplicate accessory id {aid}")
        s = soup_of(f"accessories/{aid}.html")
        f = first_card_fields(s, "accessories")
        text = lambda k: f[k].get_text(" ", strip=True) if k in f else None  # noqa: E731

        prog = parse_progression(s, row, aid)
        lv, col = prog["lv"], prog["col"]
        # The per-level "Ability" cell reads like "HP: +50"; take the number.
        bonus = linear([(L, to_int(r["cells"][col["Ability"]])) for L, r in lv], "bonus", aid)
        rng = [int(x) for x in re.findall(r"\d+", html.unescape(row["Bonus"]))][:2]
        up_to, up_from = parse_upgrade_links(f)
        dismantle = parse_item_links(f["Level \u2729 Dismantled Into"]) if "Level \u2729 Dismantled Into" in f else []
        for d in dismantle:
            if d["type"] == "component" and d["id"] not in components:
                problem(f"{aid}: dismantle references unknown component {d['id']}")

        accessories[aid] = {
            "id": aid,
            "kind": "accessory",
            "name": name,
            "baseName": name,
            "rank": to_int(text("Rank")),
            "ability": text("Ability"),       # template, e.g. "HP: +X"
            "synthesizes": text("Synthesizes"),
            "chapter": to_int(text("Chapter")),
            "startLevel": prog["startLevel"],   # corrected below for upgrade-only items
            # First level in the page's table. Formulas below are anchored here. Pages of upgrade-only
            # accessories sometimes start at level 1 even though the item is created at a higher level.
            "anchorLevel": prog["startLevel"],
            "maxLevel": prog["maxLevel"],
            "expBase": prog["expBase"],
            "expPerLevel": prog["expPerLevel"],
            "masterExp": prog["masterExp"],
            "masterExpFromStart": prog["masterExpFromStart"],
            # Bonus ("X" in the ability) at level L = atAnchor + perLevel * (L - anchorLevel). Null if non-numeric.
            "bonus": {"atAnchor": bonus[0], "perLevel": bonus[1]} if bonus else None,
            "sellValue": {"atAnchor": prog["sellValue"][0], "perLevel": prog["sellValue"][1]},
            "buyPrice": to_int(row["Price"]),
            "upgradesTo": up_to,
            "upgradedFrom": up_from,
            "dismantle": dismantle,
            "description": text("Description"),
        }
        a = accessories[aid]
        a["_csvBonusRange"] = rng
        if to_int(row["Rank"]) != a["rank"]:
            problem(f"{aid}: rank mismatch")
    resolve_start_levels(accessories)
    for a in accessories.values():
        # Upgrade-only items are created at the level given by the upgrade link.
        if a["buyPrice"] is None and a["upgradedFrom"]:
            a["startLevel"] = accessories[a["upgradedFrom"][0]["item"]]["upgradesTo"]["startLevel"]
            a["masterExpFromStart"] = a["masterExp"] - exp_to_reach(a, a["startLevel"])
        span = a["maxLevel"] - a["anchorLevel"]
        a["maxBonus"] = a["bonus"]["atAnchor"] + a["bonus"]["perLevel"] * span if a["bonus"] else None
        rng = a.pop("_csvBonusRange")
        if a["bonus"] and rng and rng != [a["bonus"]["atAnchor"], a["maxBonus"]]:
            problem(f"{a['id']}: bonus range {rng} disagrees with level table "
                    f"[{a['bonus']['atAnchor']}, {a['maxBonus']}]")
    # final form of each chain
    for a in accessories.values():
        cur, guard = a, 0
        while cur["upgradesTo"] and guard < 20:
            cur = accessories.get(cur["upgradesTo"]["item"])
            if cur is None:
                problem(f"{a['id']}: upgrade chain leaves the accessory table")
                break
            guard += 1
        a["ultimateId"] = cur["id"] if cur else None
    return accessories


# --------------------------------------------------------------------------- shops

def build_shops(components, weapons, accessories):
    by_name = {}
    for c in components.values():
        by_name.setdefault(c["name"], []).append(("component", c["id"]))
    for w in weapons.values():
        by_name.setdefault(w["baseName"], []).append(("weapon", w["id"]))
    for a in accessories.values():
        by_name.setdefault(a["baseName"], []).append(("accessory", a["id"]))

    shops = {}
    skipped = Counter()
    for row in read_csv("shops.csv"):
        shop_name = row["Retail Network"]
        sid = slugify(shop_name)
        shop = shops.setdefault(sid, {"id": sid, "name": shop_name, "stock": []})
        cands = by_name.get(row["Name"], [])
        if len(cands) != 1:
            skipped[row["Name"]] += 1  # consumables (not part of this dataset)
            continue
        kind, iid = cands[0]
        shop["stock"].append({
            "itemType": kind,
            "itemId": iid,
            "price": to_int(row["Price"]),
            "chapter": to_int(row["Chapter"]),
            "note": row["Notes"] or None,
        })
    shops = {k: v for k, v in shops.items() if v["stock"]}
    return shops, skipped


def validate_prices(components, weapons, accessories):
    for a in accessories.values():
        factor = ACCESSORY_PRICE_FACTOR.get(a["id"], 2)
        if a["buyPrice"] is not None and a["buyPrice"] != factor * a["sellValue"]["atAnchor"]:
            problem(f"{a['id']}: buy price {a['buyPrice']} != {factor} x sell value {a['sellValue']['atAnchor']}")
    for w in weapons.values():
        if w["buyPrice"] is None:
            continue
        factor = 20 if w["id"] in GILGAMESH_MARKUP else 2
        if w["buyPrice"] != factor * w["sellValue"]["atAnchor"]:
            problem(f"{w['id']}: buy price {w['buyPrice']} != {factor} x sell value {w['sellValue']['atAnchor']}")
    for c in components.values():
        if c["buyPrice"] is not None and c["type"] != "catalyst" and c["buyPrice"] != 2 * c["sellPrice"]:
            problem(f"{c['id']}: buy price {c['buyPrice']} != 2 x sell price {c['sellPrice']}")


def validate_shops(shops, components, weapons, accessories):
    tables = {"component": components, "weapon": weapons, "accessory": accessories}
    for s in shops.values():
        for e in s["stock"]:
            table = tables[e["itemType"]]
            if e["itemId"] not in table:
                problem(f"shop {s['id']}: unknown {e['itemType']} {e['itemId']}")
                continue
            ref = table[e["itemId"]]
            price = ref["buyPrice"]
            if price is not None and price != e["price"]:
                problem(f"shop {s['id']}: {e['itemId']} price {e['price']} != detail page price {price}")


# --------------------------------------------------------------------------- output

def write(name, data):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    text = json.dumps(data, indent=2, ensure_ascii=False)
    # Keep arrays of plain numbers (e.g. expByRank) on a single line for readability.
    text = re.sub(
        r"\[\s*((?:-?\d+(?:\.\d+)?|null)(?:,\s*(?:-?\d+(?:\.\d+)?|null))*)\s*\]",
        lambda m: "[" + re.sub(r",\s*", ", ", m.group(1)) + "]",
        text,
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(text + "\n")
    print(f"wrote {os.path.relpath(path)}")


def main():
    components = build_components()
    validate_components(components)
    weapons = build_weapons(components)
    finalize_weapons(weapons)
    accessories = build_accessories(components)
    overlap = set(weapons) & set(accessories)
    if overlap:
        problem(f"ids used by both a weapon and an accessory: {sorted(overlap)}")
    resolve_start_levels({**weapons, **accessories})
    validate_chains({**weapons, **accessories})
    shops, skipped = build_shops(components, weapons, accessories)
    validate_shops(shops, components, weapons, accessories)
    validate_prices(components, weapons, accessories)

    chips = {
        "credit": next(c["id"] for c in components.values() if c["name"] == "Credit Chip"),
        "incentive": next(c["id"] for c in components.values() if c["name"] == "Incentive Chip"),
    }
    constants = {
        "ranks": {"min": 1, "max": 11, "note": "Rank 1 earns the most EXP per component, rank 11 the least."},
        "maxComponentsPerBatch": MAX_COMPONENTS_PER_BATCH,
        "bonusTiers": BONUS_TIERS,
        "chips": chips,
    }
    for c in components.values():
        c["premium"] = bool(c["premium"])

    write("constants.json", constants)
    write("components.json", components)
    write("weapons.json", weapons)
    write("accessories.json", accessories)
    write("shops.json", shops)

    print()
    print(f"components: {len(components)}  weapons: {len(weapons)}  accessories: {len(accessories)}  shops: {len(shops)} "
          f"({sum(len(s['stock']) for s in shops.values())} offers)")
    print("weapons by tier:", dict(sorted(Counter(w['tier'] for w in weapons.values()).items())))
    print("shop rows not in this dataset (consumables):", sum(skipped.values()))
    if problems:
        print(f"\n{len(problems)} validation problem(s).", file=sys.stderr)
        sys.exit(1)
    print("all validation checks passed")


if __name__ == "__main__":
    main()

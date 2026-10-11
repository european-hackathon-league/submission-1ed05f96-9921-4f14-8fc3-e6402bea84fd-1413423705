"""Build web/data-local/pipeline.json from the local hackathon dataset.

Reads only from data/ (git-ignored) and writes only to web/data-local/ (git-ignored).
This script contains no dataset content: just file paths, column names, taxonomy
labels and the clustering / parsing logic. The output must match `PipelineData` in
web/src/lib/pipeline/types.ts.

Run from the repo root:
    uv run --with pandas --with openpyxl --with pypdf --with cryptography \
        python -I scripts/build-pipeline-data.py

Everything is deterministic: no network, no LLM calls.
"""

from __future__ import annotations

import json
import logging
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "web" / "data-local" / "pipeline.json"

SERIES = {"F70": "1 Series", "G60": "5 Series", "G70": "7 Series"}
CATEGORIES = ["Exterior", "Interior", "Digital", "Powertrain"]
NEG_TYPES = {"Wants": "wants", "Difficult to Use": "difficult", "Defect": "defect"}

MIN_MENTIONS = 8
MAX_REQUESTS = 25
MAX_OPTIONS = 120
MAX_STUDY_ATTRS = 12

# ---------------------------------------------------------------------------
# Markets
# ---------------------------------------------------------------------------
EUROPE = set(
    "AT BE BG CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK".split()
)


def market_of(country: str) -> str:
    c = (country or "").strip().upper()
    if c in EUROPE:
        return "EU"
    if c in ("US", "JP", "CN"):
        return c
    return "OTHER"


# ---------------------------------------------------------------------------
# Taxonomy → PM-friendly clusters (taxonomy names only, no customer data)
# Each group: title, category, summary lead, VFC level-2 topics, option keywords.
# Option keywords are regexes matched against German option names and package contents.
# ---------------------------------------------------------------------------
GROUPS: dict[str, dict] = {
    "touch": dict(
        title="Simpler iDrive menus and touchscreen", category="Digital",
        lead="Owners find the touchscreen and menu logic hard to use",
        topics=["Touch screen, operation", "Operating concept, operating system", "Controller operation",
                "Touch Command", "Gesture control", "Multi-function steering wheel operation"],
        kw=[r"live cockpit", r"idrive", r"operating system"]),
    "cluster": dict(
        title="Clearer instrument cluster and head-up display", category="Digital",
        lead="Drivers want clearer, more configurable displays",
        topics=["Instrument cluster", "Head-Up Display", "Display, time"],
        kw=[r"head-up", r"live cockpit"]),
    "infotainment": dict(
        title="Faster, more stable infotainment", category="Digital",
        lead="Owners report a slow or glitchy infotainment system",
        topics=["ConnectedDrive and Infotainment, overall technology", "Radio function", "Apps (in-car)",
                "CD / DVD changer, playback"],
        kw=[r"digital premium", r"dab-tuner"]),
    "rsu": dict(
        title="Smooth, reliable software updates", category="Digital",
        lead="Over-the-air updates fail, take too long or change features unexpectedly",
        topics=["Remote Software Upgrade/RSU", "BMW ConnectedDrive upgrades/ MINI CONNECTED upgrades"],
        kw=[r"digital premium", r"laufzeitbegrenzt"]),
    "phone": dict(
        title="Better phone connectivity (CarPlay, Bluetooth)", category="Digital",
        lead="Phone projection and Bluetooth pairing drop out or are hard to set up",
        topics=["Apple CarPlay", "Android Auto", "Manage / pair mobile device (Bluetooth)", "Priorities for telephones"],
        kw=[r"carplay", r"telefon", r"bluetooth"]),
    "charging_phone": dict(
        title="Reliable phone charging and USB ports", category="Digital",
        lead="Wireless charging and USB ports are unreliable or poorly placed",
        topics=["Mobile device, wireless charging", "USB port", "12 V connection"],
        kw=[r"ablage.*laden|kabellos|wireless", r"usb"]),
    "esim": dict(
        title="Working eSIM and in-car Wi-Fi", category="Digital",
        lead="Personal eSIM and the Wi-Fi hotspot are hard to activate or keep working",
        topics=["Personal eSIM", "WiFi hotspot", "Emergency request"],
        kw=[r"wi-?fi|hotspot", r"esim"]),
    "app": dict(
        title="A more reliable My BMW app", category="Digital",
        lead="Remote functions in the companion app are slow or fail",
        topics=["My BMW App / MINI App", "Remote Services & Remote Keyless Entry (My BMW App/MINI App)",
                "Remote Engine Start (My BMW App / MINI App)", "ConnectedDrive services (smartphone) technology overall"],
        kw=[r"my bmw", r"remote engine"]),
    "voice": dict(
        title="A voice assistant that understands", category="Digital",
        lead="Voice control misunderstands commands or activates by mistake",
        topics=["Voice control / speech recognition", "Intelligent Personal Assistant",
                "Intelligent Personal Assistant, activation word"],
        kw=[r"personal assistant", r"sprachsteuerung"]),
    "nav": dict(
        title="Smarter navigation and route planning", category="Digital",
        lead="Navigation guidance, maps and charging-aware routing fall short",
        topics=["Navigation", "Route optimized for charging", "Map update"],
        kw=[r"navigation", r"maps"]),
    "profile": dict(
        title="Drive modes and profiles that remember settings", category="Digital",
        lead="Settings, profiles and My Modes reset or are hard to configure",
        topics=["My Modes / driving experience", "Driver profile", "Experience Modes"],
        kw=[r"fahrerlebnis", r"my modes"]),
    "adas": dict(
        title="Smarter, less intrusive driver assistance", category="Digital",
        lead="Assistance systems intervene too often or not reliably enough",
        topics=["(Active) cruise control", "Highway assistant", "Driver assistance, automated driving, overall technology",
                "Lane departure warning", "Steering and lane guide assist", "Speed Limit Assistant",
                "Front collision warning", "Blind spot monitoring", "Lane Change Assistant", "Fatigue Alert",
                "High-beam assistant"],
        kw=[r"driving assistant", r"autobahn", r"assistent"]),
    "parking": dict(
        title="Easier parking with better cameras", category="Digital",
        lead="Parking sensors, cameras and assisted parking need to be more dependable",
        topics=["Parking Assistant", "Park Distance Control (PDC)", "Rear view camera", "Surround View",
                "All-round view", "Remote controlled parking", "Back-up Assistant", "Drive Recorder"],
        kw=[r"parking assistant", r"park", r"surround view|kamera"]),
    "rse": dict(
        title="Rear-seat entertainment that just works", category="Digital",
        lead="The rear entertainment screen is hard to use or unreliable",
        topics=["Rear seat entertainment"],
        kw=[r"fond-entertainment|theatre|theater", r"executive lounge"]),
    "manual": dict(
        title="Clearer owner's manual and in-car help", category="Digital",
        lead="Owners cannot find out how features work",
        topics=["Owner's Manual", "General enquiry: customer feedback"],
        kw=[]),
    "access": dict(
        title="Reliable keys and keyless entry", category="Digital",
        lead="Keys, Digital Key and Comfort Access are unreliable",
        topics=["Vehicle key", "Digital Key", "Comfort Access", "Vehicle, lock / unlock", "Anti-theft alarm system",
                "Remote Engine Start (Vehicle Key )", "Resting state after door opening"],
        kw=[r"komfortzugang|comfort access", r"digital key", r"alarm"]),
    "body_usability": dict(
        title="Easier everyday vehicle functions", category="Digital",
        lead="Everyday functions are hard to find or operate",
        topics=[], kw=[r"komfortzugang", r"travel"]),
    # Powertrain
    "drivetrain": dict(
        title="More responsive, efficient powertrain", category="Powertrain",
        lead="Drivers want more responsive power delivery and lower consumption",
        topics=["Drivetrain", "Transmission", "Operate selector lever", "Shift paddle", "Engine acoustics / engine sound",
                "Launch Control", "Starting engine", "Start engine/switch on drive readiness", "Engine oil",
                "Vehicle battery", "Cooling"],
        kw=[r"getriebe"]),
    "msa": dict(
        title="Start-stop that can stay off", category="Powertrain",
        lead="Owners want auto start-stop and auto-hold to remember their choice",
        topics=["Automatic engine start-stop function (MSA)", "Automatic-hold"],
        kw=[]),
    "range": dict(
        title="More real-world electric range", category="Powertrain",
        lead="EV and PHEV owners see less range than expected, especially in cold weather",
        topics=["Electric Range", "High voltage battery", "High voltage battery, preconditioning",
                "Brake Energy Regeneration / recuperation"],
        kw=[r"wärmepumpe", r"standheizung|vorkonditionierung"]),
    "charging": dict(
        title="Easier, more reliable charging", category="Powertrain",
        lead="Public and home charging fail or are cumbersome",
        topics=["Public charging / external providers", "Charge high-voltage battery",
                "Opening/closing charging socket cover", "Wallbox, charging / home charging", "Charging cable",
                "High-voltage charging power socket"],
        kw=[r"ac-laden|laden", r"ladekabel"]),
    "ride": dict(
        title="Better ride comfort and handling balance", category="Powertrain",
        lead="Owners want a more comfortable ride without losing agility",
        topics=["Handling / Riding", "Cushioning / damping vehicle", "Self-leveling suspension", "Steering",
                "ground clearance", "Drive, driving dynamics and chassis, overall technology"],
        kw=[r"fahrwerk|chassis", r"aktivlenkung", r"luftfederung"]),
    "brakes": dict(
        title="Smoother, quieter brakes", category="Powertrain",
        lead="Brakes feel inconsistent, squeal or produce dust",
        topics=["Braking", "Parking brake"],
        kw=[r"sportbremse|compound-bremse|bremsanlage"]),
    # Interior
    "seats": dict(
        title="More comfortable, better-equipped seats", category="Interior",
        lead="Seats lack comfort, adjustment or features such as massage and ventilation",
        topics=["Seats", "Seating, ventilate / heat", "Seat massage", "Seat memory", "Headrest, adjust",
                "Adjustment of lower lumbar support", "Seat belts"],
        kw=[r"sitz(?!e?gurt)", r"lounge seating", r"massage"]),
    "climate": dict(
        title="Stronger climate control with easy controls", category="Interior",
        lead="Climate performance is weak and its controls are buried in the screen",
        topics=["Vehicle, climatization", "Air conditioning, setting", "Air conditioning control panel",
                "Blower function", "Air conditioning, overall technology", "Heated steering wheel"],
        kw=[r"klima", r"standheizung", r"lenkradheizung"]),
    "storage": dict(
        title="More storage and luggage space", category="Interior",
        lead="Cabin storage, cupholders and boot space are too small or awkward",
        topics=["Luggage compartment", "Storage compartments", "Glove box", "Cupholder", "Center console, front",
                "Space / spatial impression", "Frunk"],
        kw=[r"staura|gepäck", r"fondsitzlehne|durchlade", r"ablage"]),
    "acoustics": dict(
        title="Quieter cabin", category="Interior",
        lead="Road, wind and interior noise intrude into the cabin",
        topics=["Interior acoustics"],
        kw=[r"akustik|verglasung"]),
    "audio": dict(
        title="Better audio quality", category="Interior",
        lead="The sound system and audio settings disappoint",
        topics=["Audio mode, sound"],
        kw=[r"bowers|harman|hifi|sound"]),
    "interior": dict(
        title="Higher-quality interior finish", category="Interior",
        lead="Interior materials, layout and lighting fall short of expectations",
        topics=["Interior design", "Interior", "Upholstery / interior trim", "Instrument panel",
                "Vehicle interior, lighting", "Ambient light", "Steering wheel", "Grab handle", "Sun visor, front"],
        kw=[r"interieur", r"leder", r"ambient"]),
    "roof": dict(
        title="Opening panoramic roof with better shading", category="Interior",
        lead="Owners want an opening glass roof and effective sun protection",
        topics=["Panorama glass roof", "Sun protection", "Roof function centre", "Roof"],
        kw=[r"glasdach|panorama", r"sonnenschutz"]),
    "value": dict(
        title="More standard equipment for the price", category="Interior",
        lead="Owners feel key equipment should be standard at this price",
        topics=[], kw=[r"paket"]),
    # Exterior
    "doors": dict(
        title="Doors that open and close easily", category="Exterior",
        lead="Doors are heavy, awkward or the automatic doors misbehave",
        topics=["Door, open / close", "Automatic doors", "Door, front", "Door, finisher panel, front",
                "Outer door handle, front", "Child safety latch", "Vehicle, access and exit"],
        kw=[r"automatiktür|türen", r"soft[- ]close|softclose"]),
    "trunk": dict(
        title="A dependable hands-free tailgate", category="Exterior",
        lead="The tailgate and hands-free opening do not work reliably",
        topics=["non-contact trunk lid opening", "Trunk lid, open / close", "Trunk lid", "Trunk light",
                "Hood, open / close", "Hood", "Fuel filler flap , open / close"],
        kw=[r"heckklappe", r"komfortzugang"]),
    "visibility": dict(
        title="Better visibility: mirrors, glass and wipers", category="Exterior",
        lead="Mirrors, wipers and windows limit visibility or malfunction",
        topics=["Exterior rearview mirror", "Interior rearview mirror", "Interior mirror, garage door opener",
                "Garage door opener", "Windshield", "Windshield wiper", "Rear wiper", "Side window, open / close"],
        kw=[r"spiegel", r"garagentor"]),
    "lights": dict(
        title="Brighter, smarter exterior lighting", category="Exterior",
        lead="Headlights and signals need better performance",
        topics=["Exterior lighting", "Fog light", "Flashing"],
        kw=[r"scheinwerfer|licht", r"iconic glow"]),
    "body": dict(
        title="Less wind noise, better-sized body", category="Exterior",
        lead="The body lets in wind noise or feels too large for daily use",
        topics=["Exterior"],
        kw=[r"akustikverglasung"]),
    "design": dict(
        title="A more appealing exterior design", category="Exterior",
        lead="Customers ask for design changes to the exterior",
        topics=["Exterior design", "Bumper, front", "Bumper, rear"],
        kw=[r"exterieurpaket|shadow line", r"m sport design"]),
    "wheels": dict(
        title="Tougher wheels and a spare-tyre option", category="Exterior",
        lead="Wheels and tyres damage easily and owners want more choice",
        topics=["Wheels / tires", "RSC tire", "Tirefit", "Tire pressure control", "Towing eye"],
        kw=[r"räder", r"reifen(?!druck)"]),
}
TOPIC_TO_GROUP = {t: g for g, spec in GROUPS.items() for t in spec["topics"]}

# Catch-all topic split by level-3 aspect (VFC label names only).
L2L3_OVERRIDES = {
    ("Body equipment, overall technology", "Dislike: price-performance ratio"): "value",
    ("Body equipment, overall technology", "Vehicle equipment: not standard / too costly"): "value",
}
CATCH_ALL_DEFAULT = {"Body equipment, overall technology": "body_usability"}

# Topic words → category, for topics outside GROUPS.
FALLBACK_CATEGORY = [
    (r"engine|drive|battery|charg|range|brak|suspens|steer|transmission|fuel|exhaust", "Powertrain"),
    (r"app|connect|display|screen|assist|navig|voice|phone|software|camera|key|alarm|warning|radio", "Digital"),
    (r"seat|climat|air cond|interior|storage|noise|acoust|cup|glove|console|belt|airbag|safety", "Interior"),
]

# Likes topics → short strength titles.
LIKE_TITLES = {
    "Drivetrain": "Engine and performance",
    "Drive, driving dynamics and chassis, overall technology": "Overall driving dynamics",
    "Handling / Riding": "Handling and ride",
    "Exterior design": "Exterior design",
    "Body equipment, overall technology": "Equipment and technology",
    "Interior design": "Interior design",
    "Seats": "Seat comfort",
    "Interior comfort": "Interior comfort",
    "Ambient light": "Ambient lighting",
    "Highway assistant": "Highway assistant",
    "Automatic doors": "Automatic doors",
    "ConnectedDrive and Infotainment, overall technology": "Infotainment",
    "Space / spatial impression": "Sense of space",
    "Audio mode, sound": "Sound system",
    "Electric Range": "Electric range",
    "Braking": "Brakes",
    "Interior acoustics": "Quiet cabin",
}

# Level-3 labels → readable phrases (labels only).
L3_PHRASES = {
    "Not user-friendly": "poor usability",
    "Size not user friendly": "awkward size or layout",
    "Malfunction": "malfunctions",
    "Damage": "damage",
    "Noise": "noise",
    "Customer request: function": "requests for new functions",
    "Customer request: usability": "requests for easier use",
    "Customer request: performance": "requests for more performance",
    "Customer request: design": "design requests",
    "Customer request: equipment": "equipment requests",
    "Dislike: price-performance ratio": "poor value for money",
    "Drive power/driving performance not OK": "power delivery",
    "Fuel / power consumption too high": "high consumption",
    "Range, not OK": "range shortfall",
    "Not comfortable": "lack of comfort",
    "Effect/power not OK": "weak performance",
    "Information / accuracy insufficient": "missing or inaccurate information",
    "Permanent switch-off not possible": "cannot be switched off permanently",
    "Battery discharge": "battery drain",
    "Wind noise": "wind noise",
    "insufficient storage space": "too little storage space",
    "Dirty contamination": "dirt and fingerprints",
    "Vehicle equipment: not standard / too costly": "equipment not standard",
}


def l3_phrase(l3: str) -> str:
    return L3_PHRASES.get(l3, l3.lower())


def fallback_category(topic: str) -> str:
    t = topic.lower()
    for pattern, cat in FALLBACK_CATEGORY:
        if re.search(pattern, t):
            return cat
    return "Exterior"


# ---------------------------------------------------------------------------
# Option lists
# ---------------------------------------------------------------------------
PRICE_RE = r"(?:\d{1,3}(?:\.\d{3})*,–|–,–|Serie)"
OPTION_LINE = re.compile(
    rf"^\s*(?P<name>\S.*?)\s{{2,}}(?P<code>[A-Z0-9]{{3,4}})(?:\s{{2,}}(?P<price>{PRICE_RE}))?(?=\s|$)"
)
HEADING = re.compile(r"^[A-ZÄÖÜ0-9 /&,\-–.]+$")
CONSTRAINT = re.compile(r"^(nicht|nur|in) (in )?verbindung", re.I)
NOT_NAMES = re.compile(r"MwSt|SA-Nr|EUR inkl|^\d+(,\d+)? J\b|Bereifung \d|km/h|^[–-]", re.I)
SKIP_SUBS = {"AUSSTATTUNGEN"}
STOP_CODES = {"BMW", "EUR", "MWST", "KW", "PS"}  # words that look like option codes


def parse_price(raw: str | None) -> float | None:
    if not raw or raw in ("–,–", "Serie"):
        return None
    try:
        return float(raw.replace(".", "").replace(",–", ""))
    except ValueError:
        return None


def nice_case(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"(\D)\d(,\d)*$", r"\1", s).strip()  # footnote markers like "…begrenzt)4,5"
    if s.isupper() and len(s) > 3:
        prev = None
        while prev != s:  # re-join letters split by the PDF layout ("SPORTPAK E T")
            prev, s = s, re.sub(r"(?<=[A-ZÄÖÜ]{2}) (?=[A-ZÄÖÜ]\b)", "", s)
        s = re.sub(r"\s*/\s*", " / ", s)
        s = " ".join(w.lower() if w in ("UND", "MIT", "FÜR") else w.capitalize() if len(w) > 2 or not w.isalpha() else w
                     for w in s.split(" "))
        s = re.sub(r"\bBmw\b", "BMW", s)
        s = re.sub(r"\bM (\w)", lambda m: "M " + m.group(1).upper(), s)
    return s


def extract_options(pdf_path: Path) -> list[dict]:
    from pypdf import PdfReader

    logging.disable(logging.CRITICAL)  # pypdf warns about rotated text and fonts
    reader = PdfReader(str(pdf_path))
    items: list[dict] = []
    for page in reader.pages:
        try:
            text = page.extract_text(extraction_mode="layout")
        except Exception:
            text = page.extract_text() or ""
        lines = [l.rstrip() for l in text.splitlines() if l.strip()]
        if not lines:
            continue
        main = lines[0].strip().rstrip(".")
        if "SERIENAUSSTATTUNG" in main or "TECHNISCHE" in main or "PREISE" in main:
            continue
        sub = ""
        prev = ""
        current = None
        for line in lines[1:]:
            stripped = line.strip()
            m = OPTION_LINE.match(line)
            code_ok = m and m.group("code") not in STOP_CODES
            if code_ok and not NOT_NAMES.search(m.group("name")) and re.search(r"[A-Za-z]", m.group("name")):
                name = m.group("name").strip()
                if CONSTRAINT.match(name):
                    name = prev if prev and not NOT_NAMES.search(prev) and not CONSTRAINT.match(prev) else main
                current = {
                    "code": m.group("code"),
                    "name": nice_case(name),
                    "priceEur": parse_price(m.group("price")),
                    "group": nice_case(sub or main),
                    "_main": main,
                    "_text": name,
                }
                items.append(current)
            elif HEADING.match(stripped) and len(stripped) > 3 and not re.search(r"\d{3}", stripped):
                sub = stripped
                current = None
            elif current is not None and (stripped.startswith("–") or stripped.startswith("-")):
                # package / feature bullets only (free text often holds constraints or bleeds)
                current["_text"] += " " + re.split(r"\s{2,}", stripped.lstrip("–- "))[0]
            prev = re.split(r"\s{2,}", stripped)[0]
    return items


def build_options(series: str) -> list[dict]:
    pdf = DATA / "bmw" / "option-lists" / f"{series}_OptionList.PDF"
    raw = []
    try:
        raw = extract_options(pdf)
    except Exception as exc:  # fall back to the pre-extracted file
        print(f"  ! PDF parse failed for {series} ({exc}); using options.json", file=sys.stderr)
    if len(raw) < 20:
        js = json.loads((DATA / "analysis" / "options.json").read_text())
        raw = [
            {"code": o["code"], "name": nice_case(o["name"]), "priceEur": parse_price(o.get("price")),
             "group": nice_case(o.get("sub") or o.get("main") or ""), "_main": o.get("main", ""), "_text": o["name"]}
            for o in js.get(series, [])
        ]
    seen: dict[str, dict] = {}
    for o in raw:
        name = o["name"]
        if CONSTRAINT.match(name) or NOT_NAMES.search(name) or len(name) < 3:
            continue
        if o["group"].upper() in SKIP_SUBS:
            continue
        code = o["code"]
        if code in seen:
            # keep the entry from the Sonderausstattungen chapter, or the priced one
            old = seen[code]
            better = ("SONDERAUSSTATTUNG" in o["_main"] and "SONDERAUSSTATTUNG" not in old["_main"]) or (
                old["priceEur"] is None and o["priceEur"] is not None and "SONDERAUSSTATTUNG" not in old["_main"]
            )
            if better:
                o["_text"] = old["_text"] + " " + o["_text"]
                seen[code] = o
            else:
                old["_text"] += " " + o["_text"]
            continue
        seen[code] = o
    opts = list(seen.values())
    # Usefulness: Sonderausstattungen first, then wheels/colours; keep order within.
    def rank(o):
        m = o["_main"]
        return 0 if "SONDERAUSSTATTUNG" in m else 1 if "PAKET" in m else 2 if "RÄDER" in m else 3
    opts.sort(key=rank)
    return opts[:MAX_OPTIONS]


def public_option(o: dict) -> dict:
    return {"code": o["code"], "name": o["name"], "priceEur": o["priceEur"], "group": o["group"]}


def match_options(group_key: str | None, options: list[dict]) -> list[dict]:
    """Keyword match: option names first, then bullet contents of packages. Up to 3, none if nothing fits."""
    if not group_key:
        return []
    kws = GROUPS[group_key]["kw"]
    picked: list[dict] = []

    def eligible(o):
        # colours/upholstery only count for design topics, wheels only for the wheels topic
        if "FARBWELT" in o["_main"] and group_key not in ("design", "interior"):
            return False
        if "RÄDER" in o["_main"] and group_key != "wheels":
            return False
        return True

    def is_package(o):
        return "paket" in o["name"].lower() or "paket" in o["group"].lower()

    for field in ("name", "bullets"):
        for kw in kws:
            for o in options:
                if o in picked or not eligible(o):
                    continue
                if field == "name":
                    hay = o["name"].lower()
                elif is_package(o):
                    hay = o["_text"].lower()
                else:
                    continue
                if re.search(kw, hay):
                    picked.append(o)
                    if len(picked) >= 3:
                        return [public_option(p) for p in picked]
    return [public_option(p) for p in picked]


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------
def load_feedback(series: str) -> pd.DataFrame:
    path = DATA / "bmw" / "feedback" / f"{series}_feedback_hackathon.xlsx"
    df = pd.read_excel(path, sheet_name="Feedback_Explorer", dtype=str)
    df["market"] = df["Country"].map(market_of)
    for col in ("Vfc level2 Name", "Vfc level3 Name", "Feedback Type", "Customer Feedback", "Source"):
        df[col] = df[col].fillna("").str.strip()
    return df


def cluster_key(l2: str, l3: str) -> str | None:
    if not l2 or l2 == "no_class_found":
        return None
    if (l2, l3) in L2L3_OVERRIDES:
        return L2L3_OVERRIDES[(l2, l3)]
    if l2 in CATCH_ALL_DEFAULT:
        return CATCH_ALL_DEFAULT[l2]
    return TOPIC_TO_GROUP.get(l2, "topic:" + l2)


def negative_rows(df: pd.DataFrame) -> pd.DataFrame:
    neg = df[df["Feedback Type"].isin(NEG_TYPES)].copy()
    neg["type"] = neg["Feedback Type"].map(NEG_TYPES)
    # Unclassified survey rows (sources C/D) only when they carry a VFC topic with a negative aspect.
    extra = df[(df["Feedback Type"] == "") & df["Source"].isin(["Source C", "Source D"])
               & (df["Vfc level2 Name"] != "") & (df["Vfc level2 Name"] != "no_class_found")
               & df["Vfc level3 Name"].isin(["Not user-friendly", "Malfunction", "Damage", "Noise"])].copy()
    extra["type"] = extra["Vfc level3 Name"].map(lambda x: "difficult" if x == "Not user-friendly" else "defect")
    out = pd.concat([neg, extra], ignore_index=True)
    out["cluster"] = [cluster_key(a, b) for a, b in zip(out["Vfc level2 Name"], out["Vfc level3 Name"])]
    return out[out["cluster"].notna()]


ARTEFACTS = re.compile(r"[▶►•■□◆★☆→※]|[\U0001F300-\U0001FAFF☀-➿]")


def clean_quote(text: str) -> str | None:
    t = ARTEFACTS.sub(" ", text)
    t = t.replace("・", "; ").replace("　", " ")
    t = re.sub(r"\s+", " ", t).strip(" ;-")
    if not t:
        return None
    if len(t) > 220:
        # take leading sentences up to 220 chars
        parts = re.split(r"(?<=[.!?])\s+", t)
        acc = ""
        for p in parts:
            if len(acc) + len(p) + 1 > 220:
                break
            acc = (acc + " " + p).strip()
        t = acc
    if not (40 <= len(t) <= 220):
        return None
    if t.islower() or t[0].islower():
        t = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)
    t = re.sub(r"\bi\b", "I", t)
    t = re.sub(r"\bbmw\b", "BMW", t)
    t = re.sub(r"\bi'(m|ve|d|ll)\b", lambda m: "I'" + m.group(1), t)
    if t[-1] not in ".!?":
        t += "."
    return t


def pick_quotes(rows: pd.DataFrame) -> list[str]:
    order = {"wants": 0, "difficult": 1, "defect": 2}
    cand = rows.drop_duplicates("ID").copy()
    cand["prio"] = cand["type"].map(order)
    cand["len"] = cand["Customer Feedback"].str.len()
    # medium-length texts first, deterministic tie-break on ID
    cand["lenpen"] = (cand["len"] - 130).abs()
    cand = cand.sort_values(["prio", "lenpen", "ID"])
    quotes: list[str] = []
    used_markets: Counter = Counter()
    seen_text = set()
    for _pass in range(2):
        for _, r in cand.iterrows():
            if len(quotes) >= 3:
                return quotes
            if _pass == 0 and used_markets[r["market"]] >= 1:
                continue
            q = clean_quote(r["Customer Feedback"])
            if not q or q.lower() in seen_text:
                continue
            seen_text.add(q.lower())
            quotes.append(q)
            used_markets[r["market"]] += 1
    return quotes


def ordered_markets(counter: dict) -> dict:
    keys = ["EU", "CN", "US", "JP", "OTHER"]
    return {k: int(counter[k]) for k in keys if counter.get(k)}


def build_requests(series: str, df: pd.DataFrame, options: list[dict]) -> list[dict]:
    neg = negative_rows(df)
    sizes = neg.groupby("cluster")["ID"].nunique().sort_values(ascending=False)
    keep = [k for k, n in sizes.items() if n >= MIN_MENTIONS][:MAX_REQUESTS]
    reqs = []
    for key in keep:
        rows = neg[neg["cluster"] == key]
        ids = rows["ID"].unique()
        group = GROUPS.get(key)
        if group:
            title, category, lead = group["title"], group["category"], group["lead"]
        else:
            topic = key.split(":", 1)[1]
            title = f"Improve {topic.lower()}"
            category = fallback_category(topic)
            lead = f"Owners raise issues with {topic.lower()}"
        types = {t: int(rows[rows["type"] == t]["ID"].nunique()) for t in ("wants", "difficult", "defect")}
        l3 = rows[rows["Vfc level3 Name"] != ""].groupby("Vfc level3 Name")["ID"].nunique().sort_values(ascending=False)
        aspects = [l3_phrase(a) for a in l3.index[:2]]
        total_t = sum(types.values()) or 1
        split = ", ".join(
            f"{round(100 * types[t] / total_t)}% {label}"
            for t, label in (("wants", "wishes"), ("difficult", "difficult to use"), ("defect", "defects"))
            if types[t]
        )
        aspect_txt = " and ".join(dict.fromkeys(aspects)) if aspects else "general issues"
        summary = f"{lead}; the main themes are {aspect_txt} ({split})."
        combos = (rows.assign(c=rows["Vfc level2 Name"] + " : " + rows["Vfc level3 Name"])
                  [rows["Vfc level3 Name"] != ""].groupby("c")["ID"].nunique()
                  .sort_values(ascending=False))
        taxonomy = list(combos.index[:4])
        if not taxonomy:
            taxonomy = list(rows["Vfc level2 Name"].value_counts().index[:4])
        by_market = rows.drop_duplicates("ID")["market"].value_counts().to_dict()
        src = rows.groupby("Source")["ID"].nunique().sort_index()
        reqs.append({
            "id": "",
            "series": series,
            "title": title,
            "category": category,
            "summary": summary,
            "mentions": int(len(ids)),
            # Sample of BMW record ids behind the request (ids only, no text), for the evidence page.
            "recordIds": sorted(map(str, ids))[:12],
            "byMarket": ordered_markets(by_market),
            "types": types,
            "sources": [{"name": s, "count": int(c)} for s, c in src.items()],
            "quotes": pick_quotes(rows),
            "taxonomy": taxonomy,
            "relatedOptions": match_options(key if group else None, options),
        })
    reqs.sort(key=lambda r: (-r["mentions"], r["title"]))
    for i, r in enumerate(reqs, 1):
        r["id"] = f"{series}-R{i:02d}"
    return reqs


def build_strengths(df: pd.DataFrame) -> list[dict]:
    likes = df[(df["Feedback Type"] == "Likes") & (df["Vfc level2 Name"] != "")
               & (df["Vfc level2 Name"] != "no_class_found")]
    g = likes.groupby("Vfc level2 Name")["ID"].nunique().sort_values(ascending=False)
    out, seen = [], set()
    for topic, n in g.items():
        title = LIKE_TITLES.get(topic, topic)
        if title in seen:
            continue
        seen.add(title)
        out.append({"title": title, "mentions": int(n)})
        if len(out) == 6:
            break
    return out


# ---------------------------------------------------------------------------
# Customer studies
# ---------------------------------------------------------------------------
# Attribute selection per market: "Overall product satisfaction" (if present), then the
# weakest attributes, then the strongest, up to MAX_STUDY_ATTRS. Weak points drive
# requirements; a few strengths give context.
N_WEAK, N_STRONG = 7, 4


def select_attrs(scores: dict[str, float]) -> list[tuple[str, float]]:
    items = sorted(scores.items(), key=lambda kv: (kv[1], kv[0]))
    chosen: list[tuple[str, float]] = []
    overall = [kv for kv in items if kv[0].lower().startswith("overall product")]
    chosen += overall
    rest = [kv for kv in items if kv not in overall]
    chosen += rest[:N_WEAK]
    chosen += [kv for kv in rest[::-1][:N_STRONG] if kv not in chosen]
    return chosen[:MAX_STUDY_ATTRS]


def col_letter(j: int) -> str:
    """0-based column index → Excel letters (0 → A, 27 → AB)."""
    s = ""
    j += 1
    while j:
        j, r = divmod(j - 1, 26)
        s = chr(65 + r) + s
    return s


def load_studies() -> dict[str, list[dict]]:
    path = DATA / "bmw" / "customer-studies" / "F70_G60_G68_G70_customer_studies.xlsx"
    xls = pd.ExcelFile(path)
    out: dict[str, list[dict]] = defaultdict(list)

    # CN/EU sheet: wide, header in body (row 1 = market, row 2 = model), label row then "Mean" row.
    # Scale is presumably 1–10; values are used as-is.
    cneu_name = next(s for s in xls.sheet_names if "CN" in s.upper() and "EU" in s.upper())
    a = pd.read_excel(xls, cneu_name, header=None)
    markets_row = a.iloc[1].ffill()
    cols = {}
    for j in range(1, a.shape[1]):
        model = str(a.iloc[2, j])
        mk = str(markets_row.iloc[j]).strip().upper()
        mk = "CN" if mk.startswith("CHIN") else "EU" if mk.startswith("EU") else mk
        code = re.search(r"\b([FG]\d{2})\b", model)
        if not code:
            continue
        series = {"G68": "G60"}.get(code.group(1), code.group(1))  # G68 = China LWB 5 Series
        cols[j] = (series, mk)
    scores: dict[tuple, dict] = defaultdict(dict)
    refs: dict[tuple, str] = {}  # (series, market, attribute) → "Sheet!B12": where the value is in the workbook
    label = None
    for i in range(2, a.shape[0]):
        first = a.iloc[i, 0]
        if isinstance(first, str) and first.strip().lower() == "mean" and label:
            for j, key in cols.items():
                v = pd.to_numeric(a.iloc[i, j], errors="coerce")
                if pd.notna(v):
                    scores[key][label] = round(float(v), 2)
                    refs[(*key, label)] = f"{cneu_name}!{col_letter(j)}{i + 1}"
        elif isinstance(first, str) and first.strip():
            label = first.strip()
    for (series, mk), sc in scores.items():
        for attr, v in select_attrs(sc):
            out[series].append({"market": mk, "attribute": attr, "score": v, "ref": refs.get((series, mk, attr))})

    # US sheet: long blocks of a 7-point appeal distribution (I Hate It … I Love It) per model column.
    # Mean on 1–7 is converted to 0–10 by ×10/7 (as documented in types.ts), so 7.0 → 10.
    us_name = next(s for s in xls.sheet_names if "US" in s.upper())
    b = pd.read_excel(xls, us_name, header=None)
    scale = ["I Hate It", "A Failure", "Unsatisfactory", "Satisfactory", "Excellent", "Delightful", "I Love It"]
    weight = {s.lower(): k + 1 for k, s in enumerate(scale)}
    model_cols = {}
    for j in range(2, b.shape[1]):
        code = re.search(r"\b([FG]\d{2})\b", str(b.iloc[0, j]))
        if code:
            model_cols[j] = code.group(1)
    us_scores: dict[str, dict] = defaultdict(dict)
    us_refs: dict[tuple, str] = {}
    attr = None
    acc: dict[int, list] = {}
    rows_seen: list[int] = []

    def flush():
        if attr is None:
            return
        for j, pairs in acc.items():
            tot = sum(p for _, p in pairs)
            if tot > 0.5:
                mean = sum(k * p for k, p in pairs) / tot
                us_scores[model_cols[j]][attr] = round(mean * 10 / 7, 2)
                if rows_seen:
                    us_refs[(model_cols[j], attr)] = f"{us_name}!{col_letter(j)}{min(rows_seen) + 1}:{col_letter(j)}{max(rows_seen) + 1}"

    for i in range(b.shape[0]):
        first = b.iloc[i, 0]
        if not isinstance(first, str) or not first.strip():
            continue
        f = first.strip()
        if f.lower() in weight:
            for j in model_cols:
                v = pd.to_numeric(b.iloc[i, j], errors="coerce")
                if pd.notna(v):
                    acc.setdefault(j, []).append((weight[f.lower()], float(v)))
            rows_seen.append(i)
        elif f.lower() == "sample total":
            continue
        else:
            flush()
            attr, acc, rows_seen = f, {}, []
    flush()
    for series, sc in us_scores.items():
        for a_, v in select_attrs(sc):
            out[series].append({"market": "US", "attribute": a_, "score": v, "ref": us_refs.get((series, a_))})
    return out


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------
def load_sales() -> dict[str, list[dict]]:
    xls = pd.ExcelFile(DATA / "bmw" / "sales" / "sales_volumes.xlsx")
    out = {}
    for sheet in xls.sheet_names:
        series = sheet.split("_")[0]  # "G60_G68" → G60 (combined volumes)
        df = pd.read_excel(xls, sheet)
        rows = []
        for _, r in df.iterrows():
            mk = str(r["market_code"]).strip().upper()
            mk = "ROW" if mk == "ROW" else mk

            def num(col):
                v = pd.to_numeric(r.get(col), errors="coerce")
                return None if pd.isna(v) else int(v)

            rows.append({"market": mk, "y2024": num("volume_2024"), "y2025": num("volume_2025"),
                         "y2030": num("volume_2030")})
        out[series] = rows
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
REQ_FIELDS = {"id", "series", "title", "category", "summary", "mentions", "byMarket", "types", "sources",
              "quotes", "taxonomy", "relatedOptions"}


def validate(path: Path) -> None:
    data = json.loads(path.read_text())
    assert data["origin"] == "bmw" and data["generatedAt"]
    assert [s["id"] for s in data["series"]] == list(SERIES)
    for s in data["series"]:
        assert len(s["requests"]) >= 10, f"{s['id']}: only {len(s['requests'])} requests"
        for r in s["requests"]:
            missing = REQ_FIELDS - r.keys()
            assert not missing, f"{r.get('id')}: missing {missing}"
            assert r["category"] in CATEGORIES, r["category"]
            assert set(r["types"]) == {"wants", "difficult", "defect"}
            assert len(r["quotes"]) <= 3 and len(r["relatedOptions"]) <= 3 and len(r["taxonomy"]) <= 4
            for o in r["relatedOptions"]:
                assert set(o) == {"code", "name", "priceEur", "group"}
        mentions = [r["mentions"] for r in s["requests"]]
        assert mentions == sorted(mentions, reverse=True)
        for st in s["studies"]:
            assert st["market"] in ("EU", "CN", "US", "JP") and 0 <= st["score"] <= 10
        for o in s["options"]:
            assert set(o) == {"code", "name", "priceEur", "group"}
            assert o["priceEur"] is None or isinstance(o["priceEur"], (int, float))
        codes = [o["code"] for o in s["options"]]
        assert len(codes) == len(set(codes))


def summarise(path: Path) -> None:
    data = json.loads(path.read_text())
    print(f"\n{path.relative_to(ROOT)}  ({path.stat().st_size / 1024:.0f} KB)  generated {data['generatedAt']}")
    for s in data["series"]:
        reqs = s["requests"]
        cats = Counter(r["category"] for r in reqs)
        matched = sum(1 for r in reqs if r["relatedOptions"])
        nq = sum(len(r["quotes"]) for r in reqs)
        print(f"\n{s['id']} {s['name']}: {len(reqs)} requests | "
              + ", ".join(f"{c} {cats.get(c, 0)}" for c in CATEGORIES)
              + f" | options {len(s['options'])}, requests with related options {matched}/{len(reqs)}, quotes {nq}")
        print(f"  feedback by market: {s['feedbackByMarket']}")
        print(f"  studies: {dict(Counter(x['market'] for x in s['studies']))} | sales rows {len(s['sales'])}")
        print(f"  strengths: {', '.join(f'{x['title']} ({x['mentions']})' for x in s['strengths'])}")
        for r in reqs[:5]:
            print(f"  {r['mentions']:>4}  {r['title']}  [{r['category']}]")


def main() -> None:
    studies = load_studies()
    sales = load_sales()
    series_out = []
    for sid, name in SERIES.items():
        print(f"Building {sid} …")
        df = load_feedback(sid)
        options = build_options(sid)
        fb = df.drop_duplicates("ID")["market"].value_counts().to_dict()
        series_out.append({
            "id": sid,
            "name": name,
            "feedbackByMarket": ordered_markets(fb),
            "requests": build_requests(sid, df, options),
            "strengths": build_strengths(df),
            "studies": studies.get(sid, []),
            "sales": sales.get(sid, []),
            "options": [public_option(o) for o in options],
        })
    data = {
        "origin": "bmw",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "series": series_out,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    validate(OUT)
    summarise(OUT)


if __name__ == "__main__":
    main()

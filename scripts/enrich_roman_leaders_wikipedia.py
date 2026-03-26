#!/usr/bin/env python3
"""
Enrich Roman leader JSON files with data from each emperor's Wikipedia page.
Uses Wikipedia REST API for extracts and fetches full page for infobox parsing.
"""
import os
import re
import sys
import json
from pathlib import Path
from urllib.parse import quote

# Filename (without .json) -> Wikipedia article title
WIKI_MAP = {
    "augustus": "Augustus",
    "tiberius": "Tiberius",
    "caligula": "Caligula",
    "claudius": "Claudius",
    "nero": "Nero_(emperor)",
    "galba": "Galba",
    "otho": "Otho",
    "vitellius": "Vitellius",
    "vespasian": "Vespasian",
    "titus": "Titus",
    "domitian": "Domitian",
    "nerva": "Nerva",
    "trajan": "Trajan",
    "hadrian": "Hadrian",
    "antoninus_pius": "Antoninus_Pius",
    "marcus_aurelius": "Marcus_Aurelius",
    "lucius_verus": "Lucius_Verus",
    "commodus": "Commodus",
    "pertinax": "Pertinax",
    "septimius_severus": "Septimius_Severus",
    "caracalla": "Caracalla",
    "diocletian": "Diocletian",
    "aurelian": "Aurelian",
    "constantine": "Constantine_the_Great",
    "theodosius_i": "Theodosius_I",
    "romulus_augustulus": "Romulus_Augustulus",
    "justinian_i": "Justinian_I",
    "heraclius": "Heraclius",
    "basil_ii": "Basil_II",
    "constantine_xi": "Constantine_XI_Palaiologos",
    "julian": "Julian_(emperor)",
    "valentinian_iii": "Valentinian_III",
    "michael_viii": "Michael_VIII_Palaiologos",
}

DATA_DIR = Path(__file__).resolve().parent.parent / "tests" / "data_sets" / "roman_leaders"
API_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/"


def strip_links(text: str) -> str:
    """Convert [text](url) to text in markdown."""
    return re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)


def fetch_summary(title: str) -> dict | None:
    """Fetch page summary from Wikipedia REST API via curl (avoids SSL issues)."""
    import subprocess
    url = API_BASE + quote(title.replace(" ", "_"))
    try:
        result = subprocess.run(
            ["curl", "-sL", "-A", "RomanLeadersEnricher/1.0", url],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
    return None


def extract_summary(data: dict) -> str:
    """Get a good summary from API response."""
    extract = data.get("extract") or ""
    if extract:
        return strip_links(extract)
    return ""


def main():
    updated = 0
    for filename, wiki_title in WIKI_MAP.items():
        json_path = DATA_DIR / f"{filename}.json"
        if not json_path.exists():
            print(f"Skipping {filename}.json (not found)")
            continue

        print(f"Fetching {wiki_title}...", end=" ", flush=True)
        data = fetch_summary(wiki_title)
        if not data:
            print("failed")
            continue

        with open(json_path, "r", encoding="utf-8") as f:
            record = json.load(f)

        summary = extract_summary(data)
        if summary:
            # Use first 2–3 paragraphs if very long; cap ~1200 chars for summary
            if len(summary) > 1200:
                parts = summary.split("\n\n")
                combined = ""
                for p in parts:
                    if len(combined) + len(p) < 1150:
                        combined += ("\n\n" if combined else "") + p
                    else:
                        break
                summary = combined.rstrip()
            record["summary"] = summary

        # Preserve existing notes and add source attribution
        notes_parts = [record["notes"]] if record.get("notes") else []
        notes_parts.append(f"Source: https://en.wikipedia.org/wiki/{wiki_title.replace(' ', '_')}")
        record["notes"] = " | ".join(notes_parts)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, ensure_ascii=False)

        print("ok")
        updated += 1

    print(f"\nUpdated {updated} Roman leader records.")


if __name__ == "__main__":
    main()

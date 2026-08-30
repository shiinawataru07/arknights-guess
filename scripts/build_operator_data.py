#!/usr/bin/env python3
"""Build the small, runtime-ready operator dataset used by the game.

The script intentionally keeps all extraction rules here so the browser never needs
to fetch or understand the large upstream GameData files.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Any


GAMEDATA_ROOT = (
    "https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/"
    "master/cn/gamedata/excel"
)
GAMEDATA_FILES = {
    "character": "character_table.json",
    "handbook": "handbook_info_table.json",
    "uniequip": "uniequip_table.json",
}
PRTS_API = "https://prts.wiki/api.php"
USER_AGENT = "arknights-guess-data-builder/1.0 (local data generation)"

PROFESSION_NAMES = {
    "PIONEER": "先锋",
    "WARRIOR": "近卫",
    "TANK": "重装",
    "SNIPER": "狙击",
    "CASTER": "术师",
    "MEDIC": "医疗",
    "SUPPORT": "辅助",
    "SPECIAL": "特种",
}
POSITION_NAMES = {"MELEE": "近战位", "RANGED": "远程位"}


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_gamedata(source_dir: Path | None) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, filename in GAMEDATA_FILES.items():
        local_path = source_dir / filename if source_dir else None
        if local_path and local_path.exists():
            result[key] = load_json(local_path)
        else:
            print(f"Downloading {filename}...", file=sys.stderr)
            result[key] = fetch_json(f"{GAMEDATA_ROOT}/{filename}")
    return result


def fetch_release_dates() -> Any:
    params = {
        "action": "cargoquery",
        "format": "json",
        "formatversion": "2",
        "tables": "char_obtain,chara",
        "fields": (
            "chara._pageName=name,chara.charId=char_id,chara.rarity=rarity,"
            "char_obtain.cnOnlineTime=release_time"
        ),
        "join_on": "char_obtain._pageName=chara._pageName",
        "order_by": "char_obtain.cnOnlineTime ASC",
        "limit": "5000",
    }
    print("Downloading PRTS operator release dates...", file=sys.stderr)
    return fetch_json(f"{PRTS_API}?{urllib.parse.urlencode(params)}")


def load_release_dates(source_dir: Path | None) -> dict[str, str]:
    local_path = source_dir / "prts-release-dates.json" if source_dir else None
    raw = load_json(local_path) if local_path and local_path.exists() else fetch_release_dates()
    rows = raw.get("cargoquery", []) if isinstance(raw, dict) else []
    dates: dict[str, str] = {}
    for row in rows:
        record = row.get("title", row)
        char_id = record.get("char_id")
        release_time = record.get("release_time")
        if char_id and release_time:
            dates[char_id] = str(release_time)[:10]
    return dates


def extract_profile(handbook_entry: dict[str, Any] | None) -> tuple[str | None, str | None]:
    if not handbook_entry:
        return None, None

    text = ""
    for audio_group in handbook_entry.get("storyTextAudio") or []:
        for story in audio_group.get("stories") or []:
            candidate = story.get("storyText") or ""
            if "【性别】" in candidate or "【种族】" in candidate:
                text = candidate
                break
        if text:
            break

    def field(label: str) -> str | None:
        match = re.search(rf"【{label}】\s*([^\r\n]+)", text)
        if not match:
            return None
        value = match.group(1).strip()
        return None if value in {"", "-", "--", "——", "未知"} else value

    return field("性别"), field("种族")


def maximum_base_attack(phases: list[dict[str, Any]] | None) -> int | None:
    """Return the last elite phase's maximum-level ATK keyframe.

    `attributesKeyFrames` contains the base panel values at boundary levels. The
    last phase is the highest elite phase the character can reach, and the frame
    with the greatest level is its maximum level. No favor/potential/module data
    is read, so those bonuses cannot leak into this value.
    """
    if not phases:
        return None
    final_phase = phases[-1]
    frames = final_phase.get("attributesKeyFrames") or []
    valid_frames = [frame for frame in frames if isinstance(frame.get("level"), int)]
    if not valid_frames:
        return None
    final_frame = max(valid_frames, key=lambda frame: frame["level"])
    attack = (final_frame.get("data") or {}).get("atk")
    return int(attack) if isinstance(attack, (int, float)) else None


def parse_rarity(value: Any) -> int | None:
    match = re.fullmatch(r"TIER_(\d+)", str(value))
    return int(match.group(1)) if match else None


def build_operators(
    gamedata: dict[str, Any], release_dates: dict[str, str], as_of: date
) -> list[dict[str, Any]]:
    characters: dict[str, Any] = gamedata["character"]
    handbook: dict[str, Any] = gamedata["handbook"].get("handbookDict", {})
    sub_professions: dict[str, Any] = gamedata["uniequip"].get("subProfDict", {})
    operators: list[dict[str, Any]] = []

    for char_id, character in characters.items():
        profession_id = character.get("profession")
        position_id = character.get("position")
        release_date = release_dates.get(char_id)
        rarity = parse_rarity(character.get("rarity"))

        # The handbook intersection excludes enemies, summons and most internal
        # entities. The remaining field checks restrict the result to normal,
        # deployable player operators. A future PRTS date excludes preloaded data.
        if not (
            char_id.startswith("char_")
            and char_id in handbook
            and character.get("name")
            and character.get("displayNumber")
            and character.get("phases")
            and profession_id in PROFESSION_NAMES
            and position_id in POSITION_NAMES
            and rarity is not None
            and not character.get("isNotObtainable", False)
            and release_date is not None
            and date.fromisoformat(release_date) <= as_of
        ):
            continue

        gender, race = extract_profile(handbook.get(char_id))
        sub_profession_id = character.get("subProfessionId")
        sub_profession_data = sub_professions.get(sub_profession_id, {})
        sub_profession_name = sub_profession_data.get("subProfessionName")

        operators.append(
            {
                "id": char_id,
                "name": character["name"],
                "rarity": rarity,
                "profession": PROFESSION_NAMES[profession_id],
                "subProfession": sub_profession_name or None,
                "position": POSITION_NAMES[position_id],
                "gender": gender,
                "race": race,
                "attack": maximum_base_attack(character.get("phases")),
                "releaseDate": release_date,
            }
        )

    operators.sort(key=lambda item: (item["releaseDate"], item["rarity"], item["name"]))
    return operators


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        help=(
            "Optional directory containing character_table.json, "
            "handbook_info_table.json, uniequip_table.json and optionally "
            "prts-release-dates.json. Missing files are downloaded."
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/operators.json"),
        help="Output path (default: public/data/operators.json)",
    )
    parser.add_argument(
        "--as-of",
        type=date.fromisoformat,
        default=date.today(),
        help="Only include operators released on or before YYYY-MM-DD",
    )
    args = parser.parse_args()

    gamedata = load_gamedata(args.source_dir)
    release_dates = load_release_dates(args.source_dir)
    operators = build_operators(gamedata, release_dates, args.as_of)
    if not operators:
        raise SystemExit("No operators matched; upstream schema or input files may have changed.")

    payload = {
        "meta": {
            "count": len(operators),
            "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
            "sources": [
                "ArknightsAssets/ArknightsGamedata (CN)",
                "PRTS Wiki char_obtain Cargo table (release dates)",
            ],
        },
        "operators": operators,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"Wrote {len(operators)} operators to {args.output}")


if __name__ == "__main__":
    main()

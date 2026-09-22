"""Construit la baseline ML à partir des flux réseau explicitement normaux.

Le fichier KDD ne contient ni IP ni horodatage exploitable. Ses compteurs sont
donc convertis directement vers les sept features utilisées en production,
sans inventer d'adresses IP, de ports ou de timestamps.
"""

import argparse
import csv
import math
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_DIR / "data" / "raw" / "Train_data.csv"
DEFAULT_OUTPUT = PROJECT_DIR / "data" / "processed" / "baseline.csv"
FEATURE_COUNT = 7

# Même ordre que dans core/detector.py et core/extractor.py.
# total_events, unique_ports, login_attempts, danger_score,
# unique_protocols, eps, iat


def _number(row, name, default=0.0):
    try:
        value = float(row.get(name, default))
        return value if math.isfinite(value) else float(default)
    except (TypeError, ValueError):
        return float(default)


def _is_clean_normal(row):
    """Filtre conservateur : label normal et aucun indicateur offensif."""
    if str(row.get("class", "")).strip().lower() != "normal":
        return False

    must_be_zero = (
        "land", "wrong_fragment", "urgent", "hot", "num_failed_logins",
        "num_compromised", "root_shell", "su_attempted", "num_root",
        "num_file_creations", "num_shells", "num_access_files",
        "num_outbound_cmds", "is_host_login", "is_guest_login",
    )
    return all(_number(row, field) == 0 for field in must_be_zero)


def _to_features(row, window_seconds=300):
    """Projette un flux normal sur les features des fenêtres de production."""
    total_events = max(1, int(_number(row, "count", 1)))

    # `count` représente un volume de connexions. Faute de timestamps dans le
    # dataset, on les répartit prudemment sur la fenêtre de production.
    if total_events == 1:
        eps, iat = 0.0, 10.0
    else:
        eps = total_events / window_seconds
        iat = window_seconds / (total_events - 1)

    return [
        total_events,
        1,  # un flux décrit un service/port ; le port exact est absent
        0,  # les lignes avec échecs d'authentification ont été exclues
        0,  # seules des lignes propres et labellisées normales sont retenues
        1 if row.get("protocol_type") else 0,
        round(eps, 8),
        round(iat, 8),
    ]


def create_baseline(input_path=DEFAULT_INPUT, output_path=DEFAULT_OUTPUT):
    input_path = Path(input_path)
    output_path = Path(output_path)
    if not input_path.is_file():
        raise FileNotFoundError(f"Dataset introuvable : {input_path}")

    kept = rejected = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with input_path.open(newline="", encoding="utf-8-sig") as source, \
            output_path.open("w", newline="", encoding="utf-8") as target:
        reader = csv.DictReader(source)
        required = {"class", "count", "protocol_type"}
        missing = required.difference(reader.fieldnames or ())
        if missing:
            raise ValueError(f"Colonnes absentes du dataset : {sorted(missing)}")

        writer = csv.writer(target)
        for row in reader:
            if not _is_clean_normal(row):
                rejected += 1
                continue
            features = _to_features(row)
            if len(features) != FEATURE_COUNT:
                raise AssertionError("Nombre de features ML incorrect")
            writer.writerow(features)
            kept += 1

    if kept < 100:
        output_path.unlink(missing_ok=True)
        raise ValueError(f"Baseline insuffisante : seulement {kept} lignes normales")

    print(f"Baseline créée : {output_path}")
    print(f"Lignes normales retenues : {kept}; lignes rejetées : {rejected}")
    return kept


def main():
    parser = argparse.ArgumentParser(description="Créer la baseline du détecteur ML")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    create_baseline(args.input, args.output)


if __name__ == "__main__":
    main()

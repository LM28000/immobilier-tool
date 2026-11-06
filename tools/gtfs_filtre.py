#!/usr/bin/env python3
"""Allège stop_times.txt d'un GTFS décompressé (gros réseaux) : ne garde que les passages de 6 h à 11 h.
Même résultat que le fichier complet, puisque le calcul des trajets ne regarde que 7 h 30 - 10 h.
Usage : python3 tools/gtfs_filtre.py dossier_gtfs"""
import csv, os, sys
D = sys.argv[1]; p = os.path.join(D, "stop_times.txt")
src = open(p, encoding="utf-8-sig"); r = csv.reader(src); h = next(r); ia, idp = h.index("arrival_time"), h.index("departure_time")
tmp = os.path.join(D, "stop_times.tmp"); w = csv.writer(open(tmp, "w", newline="", encoding="utf-8")); w.writerow(h); n = k = 0
for row in r:
    n += 1; t = (row[idp] or row[ia]).zfill(8)
    if "06:00:00" <= t <= "11:00:00": w.writerow(row); k += 1
src.close(); os.replace(tmp, p); print(n, "→", k, "passages gardés")

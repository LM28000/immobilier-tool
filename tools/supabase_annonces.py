#!/usr/bin/env python3
"""Envoie les annonces du jour, l'historique et les fiches dans Supabase (table « annonces », voir supabase.sql).

Usage : python3 tools/supabase_annonces.py push      (après maj_annonces.py, fiches.py merge et build.py)
        python3 tools/supabase_annonces.py check     (lit ce qui est en ligne et compare)
        python3 tools/supabase_annonces.py pull      (recrée data/annoncesdata.js, data/historique.js et data/fiches/ depuis Supabase :
                                                      tests sur GitHub, nouvel ordinateur ; n'écrase rien d'existant sans --force)

Le code de groupe (le même que dans la page, rubrique « Liste commune ») est lu dans ~/.config/immobilier-tool/groupe,
ou dans la variable SB_GROUPE. Il ne doit jamais être dans le dépôt. Sans code : rien n'est envoyé, sortie sans erreur.
Adresse et clé publique du projet Supabase : celles de la page (src/js/21-shortlist-partage.js).
"""
import json, urllib.parse, os, re, sys, glob, datetime, urllib.request, urllib.error

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.expanduser("~/.config/immobilier-tool/groupe")


def conf():
    s = open(os.path.join(R, "src/js/21-shortlist-partage.js"), encoding="utf-8").read()
    m = re.search(r'const SB=\{url:"([^"]+)",key:"([^"]+)"\}', s)
    code = os.environ.get("SB_GROUPE") or (open(CFG, encoding="utf-8").read().strip() if os.path.exists(CFG) else "")
    return m.group(1).rstrip("/"), m.group(2), code


def load_js(p):
    s = open(os.path.join(R, p), encoding="utf-8").read(); return json.loads(s[s.index("{"):s.rindex("}") + 1])


def rows():
    ads, hist = load_js("data/annoncesdata.js"), load_js("data/historique.js")
    fich = {os.path.basename(p)[:-5]: json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(os.path.join(R, "data/fiches/*.json")))}
    ids = set()
    for v in ads.values():
        if isinstance(v, dict):
            for b in [v] + list((v.get("t") or {}).values()):
                ids |= {str(a[3]).split("/")[-1] for a in b.get("ventes", [])} | {str(a[4]).split("/")[-1] for a in b.get("ads", [])}
    sys.path.insert(0, os.path.join(R, "tools")); from fiches import ficx_tous
    out = [("ads", ads), ("hist", hist), ("ficx", ficx_tous(fich, ids))]
    out += [("fiches-" + ck, c) for ck, c in fich.items()]
    return out


def call(method, url, key, code, body=None, prefer=None):
    h = {"apikey": key, "x-groupe": code, "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(url, data=json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=60) as r: return r.read().decode("utf-8")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    url, key, code = conf()
    if cmd not in ("push", "check", "pull"): print(__doc__); sys.exit(1)
    if len(code) < 12:
        print(json.dumps({"envoi": "aucun", "raison": f"pas de code de groupe (fichier {CFG})"}, ensure_ascii=False)); return
    base = url + "/rest/v1/annonces"
    if cmd == "check":
        try: got = json.loads(call("GET", base + "?select=cle,maj", key, code))
        except urllib.error.HTTPError as e: print(json.dumps({"erreur": e.code, "detail": e.read().decode()[:300]}, ensure_ascii=False)); sys.exit(1)
        print(json.dumps({"en_ligne": got}, ensure_ascii=False, indent=1)); return
    if cmd == "pull":
        # ligne par ligne : tout lire d'un coup dépasse le temps accordé aux requêtes par Supabase
        cles = [x["cle"] for x in json.loads(call("GET", base + "?select=cle", key, code))]
        by = {}
        for c_ in cles: by.update({x["cle"]: x["data"] for x in json.loads(call("GET", base + "?select=cle,data&cle=eq." + urllib.parse.quote(c_), key, code))})
        if "ads" not in by: print(json.dumps({"erreur": "rien dans Supabase"}, ensure_ascii=False)); sys.exit(1)
        force = "--force" in sys.argv; out = []
        def put(rel, txt):
            p = os.path.join(R, rel)
            if os.path.exists(p) and not force: out.append(rel + " (gardé)"); return
            os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "w", encoding="utf-8").write(txt); out.append(rel)
        put("data/annoncesdata.js", "const ADS=" + json.dumps(by["ads"], ensure_ascii=False, separators=(",", ":")) + ";\n")
        put("data/historique.js", "const HIST=" + json.dumps(by.get("hist", {}), ensure_ascii=False, separators=(",", ":")) + ";\n")
        for k, v in by.items():
            if k.startswith("fiches-"): put(f"data/fiches/{k[7:]}.json", json.dumps(v, ensure_ascii=False, separators=(",", ":")))
        print(json.dumps({"ecrits": out}, ensure_ascii=False, indent=1)); return
    res = {"envoyees": [], "erreurs": []}
    import time
    for cle, data in rows():
        ok, err = False, ""
        for essai in (1, 2, 3):   # une coupure ou un délai dépassé arrive parfois : on réessaie avant de signaler l'erreur
            try:
                call("POST", base + "?on_conflict=groupe,cle", key, code, {"groupe": code, "cle": cle, "data": data, "maj": datetime.datetime.now(datetime.timezone.utc).isoformat()}, prefer="resolution=merge-duplicates,return=minimal")
                res["envoyees"].append(f"{cle} ({len(json.dumps(data, ensure_ascii=False)) // 1024} Ko)" + (f", {essai}e essai" if essai > 1 else ""))
                ok = True; break
            except urllib.error.HTTPError as e:
                err = f"{cle} : HTTP {e.code} {e.read().decode()[:200]}"
                if e.code < 500 and e.code != 429: break   # refus définitif : inutile de réessayer
            except Exception as e:
                err = f"{cle} : {e}"
            if essai < 3: time.sleep(5 * essai)
        if not ok: res["erreurs"].append(err)
    print(json.dumps(res, ensure_ascii=False, indent=1))
    if res["erreurs"]: sys.exit(1)


if __name__ == "__main__":
    main()

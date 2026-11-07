import statistics as st, json, collections
LM="""19|Les Sources|490
19|Gare|375
32|Pâtis - Libération|580|m
23|Leclerc - Courboulay|438
25|République - Jacobins|523|m
19|Plantagenet|460|m
20|République - Jacobins|340
30|Malpalu|410
21|Gare Sud|505|m
31|Les Maillets|515
27|Pâtis - Libération|580|m
29|Chasse Royale - Hôpital|470
29|Malpalu|485
30|Plantagenet|460
21|Leclerc - Courboulay|435|m
31|Malpalu|465
26|Boussinière|440
25|Novaxis|480
32|République - Jacobins|451
31|Leclerc - Courboulay|645|m
19|Saint-Pavin|470
29|Leclerc - Courboulay|450
23|Malpalu|405
20|Malpalu|525|m
17|Gare|375|m
21|Leclerc - Courboulay|480|m
17|Gare|399|m
20|Saint-Aldric|396|m
28|Chasse Royale - Hôpital|415
26|Leclerc - Courboulay|480|m
21|Novaxis|435
18|Novaxis|495|m
23|Boussinière|315
32|République - Jacobins|447
22|Pâtis - Libération|392|m
31|Gare|550
22|Malpalu|422|m
20|Université|599|m
19|Gare Sud|601|m
18|Université|353
17|Université|585|m
22|Université|599|m
30|Université|630|m
29|Université|630|m
17||490|m
24||500"""
SN="""32|Front de Mer - Sautron - Gavy Océanis|545
19|Front de Mer - Sautron - Gavy Océanis|500|m
17|Centre-ville - Ville-Port - Petit Maroc|490
16|Centre-ville - Ville-Port - Petit Maroc|511|m
19|Centre-ville - Ville-Port - Petit Maroc|571|m
17|Centre-ville - Ville-Port - Petit Maroc|658|m
16|Front de Mer - Sautron - Gavy Océanis|424|m
20|Centre-ville - Ville-Port - Petit Maroc|540|m
20|Centre-ville - Ville-Port - Petit Maroc|444|m
26|Front de Mer - Sautron - Gavy Océanis|570|m
28|Centre-ville - Ville-Port - Petit Maroc|443
32|Centre-ville - Ville-Port - Petit Maroc|423
24|Centre-ville - Ville-Port - Petit Maroc|450|m
23|Front de Mer - Sautron - Gavy Océanis|507
21|Saint-Marc|465"""
def parse(t):
    seen=set(); out=[]
    for l in t.split("\n"):
        p=l.split("|"); key=tuple(p)
        if key in seen: continue  # same surface/district/price/meublé = doublon probable
        seen.add(key); s=int(p[0]); r=int(p[2]); out.append(dict(s=s,d=p[1],r=r,m=len(p)>3,r22=round(r*(22/s)**0.6)))
    return out
for name,t in [("Le Mans",LM),("Saint-Nazaire",SN)]:
    a=parse(t); print(name,len(a),"median r22",st.median(x["r22"] for x in a),"meublé",st.median(x["r22"] for x in a if x["m"]),"nu",st.median(x["r22"] for x in a if not x["m"]))
    g=collections.defaultdict(list)
    for x in a: g[x["d"]].append(x)
    for d,v in sorted(g.items(),key=lambda kv:-len(kv[1])): print("  ",d or "(sans quartier)",len(v),st.median(x["r22"] for x in v),[x["r22"] for x in v])
json.dump({"lemans":parse(LM),"stnazaire":parse(SN)},open("annonces.json","w"),ensure_ascii=False)

import json,math,sys
from shapely.geometry import shape,box,mapping
from shapely.ops import unary_union
src=sys.argv[1]
LON0,LON1,LAT0,LAT1=-4.85,2.9,45.6,49.8   # novembre 2026 : élargie pour Brest, Cherbourg et Limoges
K=math.cos(math.radians(47.7)); W=640
S=W/((LON1-LON0)*K); H=round((LAT1-LAT0)*S)
bb=box(LON0-0.3,LAT0-0.3,LON1+0.3,LAT1+0.3)
fc=json.load(open(src))
def proj(x,y): return ((x-LON0)*K*S,(LAT1-y)*S)
def ring(coords):
    pts=[proj(x,y) for x,y in coords]
    return "M"+"L".join(f"{a:.1f} {b:.1f}" for a,b in pts)+"Z"
def path(g):
    polys=[g] if g.geom_type=="Polygon" else list(g.geoms) if g.geom_type=="MultiPolygon" else []
    out=""
    for p in polys:
        if p.area<1e-4: continue
        out+=ring(p.exterior.coords)
        for i in p.interiors: out+=ring(i.coords)
    return out
deps=[];geoms=[]
for f in fc["features"]:
    g=shape(f["geometry"]).buffer(0)
    if not g.intersects(bb): continue
    g=g.intersection(bb).simplify(0.008,preserve_topology=True)
    geoms.append(g)
    deps.append({"c":f["properties"]["code"],"n":f["properties"]["nom"],"d":path(g)})
coast=unary_union(geoms).simplify(0.005)
out={"H":H,"S":S,"deps":deps,"land":path(coast)}
json.dump(out,open("mapdata.json","w"),separators=(",",":"))
print(H,len(deps),sum(len(d["d"]) for d in deps), len(out["land"]))

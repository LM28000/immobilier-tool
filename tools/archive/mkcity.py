import json,math,sys
from shapely.geometry import shape,box,Point
geo=sys.argv[1]
cfg={"lemans":("c72.geojson","72181",0.150,0.250,47.982,48.028),"stnazaire":("c44.geojson","44184",-2.300,-2.170,47.243,47.305)}
out={}
for k,(f,code,lo0,lo1,la0,la1) in cfg.items():
    fc=json.load(open(geo+"/"+f)); K=math.cos(math.radians((la0+la1)/2)); W=640
    S=W/((lo1-lo0)*K); H=round((la1-la0)*S)
    bb=box(lo0-.02,la0-.02,lo1+.02,la1+.02)
    P=lambda x,y:((x-lo0)*K*S,(la1-y)*S)
    def path(g):
        polys=[g] if g.geom_type=="Polygon" else list(g.geoms) if g.geom_type=="MultiPolygon" else []
        o=""
        for p in polys:
            for r in [p.exterior]+list(p.interiors):
                o+="M"+"L".join(f"{a:.1f} {b:.1f}" for a,b in [P(x,y) for x,y in r.coords])+"Z"
        return o
    main="";others=[]
    for ft in fc["features"]:
        g=shape(ft["geometry"]).buffer(0)
        if not g.intersects(bb): continue
        g=g.intersection(bb).simplify(0.0004,preserve_topology=True)
        if ft["properties"]["code"]==code: main=path(g)
        else: others.append(path(g))
    out[k]={"lo0":lo0,"la1":la1,"K":K,"S":S,"H":H,"main":main,"others":others}
    print(k,H,len(main),len(others),sum(len(o) for o in others))
json.dump(out,open("citymaps.json","w"),separators=(",",":"))

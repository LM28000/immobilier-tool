import numpy as np
def sim(prix=69000,bien=59000,apport=14000,loyer=460,vac=1,charges=138,taux=4.07,assur=0.40,dur=25,px=1.0,ly=1.5,cg=2.0,N=25,fv=0.0):
    P=prix-apport; r=taux/1200; n=dur*12
    M0=P*r/(1-(1+r)**-n); mens=M0+P*assur/1200
    flows=[-apport]; crd=P
    for m in range(1,N*12+1):
        y=(m-1)//12
        rent=loyer*(12-vac)/12*(1+ly/100)**y
        ch=charges*(1+cg/100)**y
        pay=mens if m<=n else 0
        if m<=n: crd=crd*(1+r)-M0
        flows.append(rent-ch-pay)
    val=bien*(1+px/100)**N
    flows[-1]+=val*(1-fv)-max(crd,0)
    # monthly IRR
    f=np.array(flows)
    lo,hi=-0.5,1.0
    for _ in range(200):
        mid=(lo+hi)/2
        npv=sum(f/(1+mid)**np.arange(len(f)))
        if npv>0: lo=mid
        else: hi=mid
    return ((1+mid)**12-1)*100
base=dict()
print("brut",460*12/69000*100,"net", (460*11-138*12)/69000*100)
for N in [5,10,15,20,25]:
    print(N, round(sim(N=N),1), "fv5%", round(sim(N=N,fv=0.05),1))
print("sens N=15")
for k,v in [("loyer 430",dict(loyer=430)),("loyer 490",dict(loyer=490)),("vacance 2",dict(vac=2)),("taux 4.5",dict(taux=4.5)),("prix 0%",dict(px=0)),("prix 2%",dict(px=2)),("prix 75k",dict(prix=75000,bien=65000))]:
    print(k, round(sim(N=15,**v),1), round(sim(N=25,**v),1))

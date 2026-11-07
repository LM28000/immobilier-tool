initFin();
fitVH();
loadLocal();
if(HASH0&&location.hash!==HASH0){try{history.replaceState(history.state,"",HASH0);}catch(_){}}
if(!readHash()) render();

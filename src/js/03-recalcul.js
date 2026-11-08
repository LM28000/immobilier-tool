/* recalcul après un changement de réglage, de type ou de données : les quartiers, puis l'interface (src/v2 enveloppe render) */
function render(){QBOXK=null; if(typeof VC!=="undefined") VC.clear(); computeIris();}
/* dernière action de l'utilisateur (pointeur ou clavier) */
let LASTUSER=0; ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{LASTUSER=Date.now();},true));


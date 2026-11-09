// Service worker : la page s'ouvre hors ligne avec la dernière version téléchargée.
// VERSION est réécrite par build.py à chaque construction : le navigateur installe alors la nouvelle version et vide l'ancien cache.
const VERSION = "b538ef6bbb";
const CACHE = "studio-" + VERSION, PHOTOS = "studio-photos", MAXPH = 250;
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icone-180.png", "./icons/icone-192.png", "./icons/icone-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== PHOTOS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// une bonne réponse seulement : jamais une erreur 404/500 à la place de la copie hors ligne
const good = res => res && res.ok && (res.type === "basic" || res.type === "cors");
async function trim(name, max) { const c = await caches.open(name), ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  // la page : réseau d'abord (données du jour) avec 4 s de patience, sinon la dernière copie
  if (r.mode === "navigate" || (u.origin === location.origin && u.pathname.endsWith("/index.html"))) {
    e.respondWith((async () => {
      const net = fetch(r).then(res => { if (good(res)) { const cp = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put("./index.html", cp))); } return res; });
      const slow = new Promise(ok => setTimeout(ok, 4000));
      try { const res = await Promise.race([net, slow.then(() => null)]); if (res && res.ok) return res; } catch (_) {}
      const hit = await caches.match("./index.html"); if (hit) return hit;
      return net;
    })());
    return;
  }
  // photos d'annonces : cache plafonné (250 photos), les plus anciennes partent d'abord
  if (u.host === "file.bienici.com") {
    e.respondWith(caches.open(PHOTOS).then(async c => { const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r); if (res.ok || res.type === "opaque") { e.waitUntil(c.put(r, res.clone()).then(() => trim(PHOTOS, MAXPH))); } return res; }));
    return;
  }
  // fichiers du site (dont data/fiches/*.json) et polices : cache d'abord, mis à jour en arrière-plan avec une bonne réponse seulement
  if (u.origin === location.origin || u.host.endsWith("fonts.googleapis.com") || u.host.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => { if (good(res) || (res.type === "opaque" && !hit)) { const cp = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(r, cp))); } return res; }).catch(() => hit);
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
  }
});

// Service worker : la page s'ouvre hors ligne avec la dernière version téléchargée.
const CACHE = "studio-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icone-192.png", "./icons/icone-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  // la page : réseau d'abord (données du jour), sinon la dernière copie
  if (r.mode === "navigate" || (u.origin === location.origin && u.pathname.endsWith("/index.html"))) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  // fichiers du site, polices et photos d'annonces : cache d'abord, mis à jour en arrière-plan
  if (u.origin === location.origin || u.host.endsWith("fonts.googleapis.com") || u.host.endsWith("fonts.gstatic.com") || u.host === "file.bienici.com") {
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

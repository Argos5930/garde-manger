/* Garde-manger : fonctionnement hors connexion */
const VERSION = "gm-1.0.0";
const SHELL = ["./", "index.html", "css/app.css", "js/nutri.js", "js/app.js", "manifest.webmanifest",
  "data/ingredients.json", "data/recettes.json", "data/ciqual.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "gm-runtime").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Open Food Facts : toujours en ligne
  if (url.hostname.endsWith("openfoodfacts.org")) return;
  // Polices et lecteur de code-barres : mis en cache au premier passage
  if (url.hostname.includes("fonts.g") || url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.open("gm-runtime").then(async c => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok || res.type === "opaque") await c.put(req, res.clone()); return res; }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Page partagée (?text=...) : on sert l'appli
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return res; }).catch(() => caches.match("index.html")));
    return;
  }
  // Fichiers de l'appli : cache d'abord, mise à jour en arrière-plan
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});

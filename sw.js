// Wollongong Salvo Band app: keeps the app shell available offline and shows band alerts.
// Roster data always comes live from the API. Pages are fetched fresh (no-cache) so app updates arrive straight away.
const C = "band-shell-v4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (/version\.json$/.test(u.pathname)) return;   // always straight from the network
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html"))));
});
// Alerts sent by the band's Apps Script: {title, body, tag}
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Wollongong Salvos";
  e.waitUntil(self.registration.showNotification(title, { body: d.body || "", tag: d.tag || undefined, icon: "icon-192.png", badge: "icon-192.png", data: { url: "./" } })
    .then(() => self.clients.matchAll({ type: "window" })).then(cs => cs.forEach(c => c.postMessage("refresh"))));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ("focus" in c) { c.postMessage("refresh"); return c.focus(); } }
    return self.clients.openWindow("./");
  }));
});

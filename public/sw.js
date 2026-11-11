// Service Worker: Push-Empfang, Schnellantworten per Button und eine Offline-Seite.
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("sm-v1").then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "spielerminus", body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/start", token: data.token || null },
    actions: (data.actions || []).slice(0, Notification.maxActions || 2),
  };
  event.waitUntil(self.registration.showNotification(data.title || "spielerminus", options));
});

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const { url, token } = n.data || {};
  n.close();
  if (event.action && token) {
    // Button gedrückt: Antwort im Hintergrund speichern, ohne die App zu öffnen
    event.waitUntil(
      fetch(`/api/quick-actions/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: event.action }),
      })
        .then((res) =>
          self.registration.showNotification(res.ok ? "Gespeichert ✓" : "Das hat nicht geklappt", {
            body: res.ok ? "Deine Antwort ist eingetragen." : "Tippe hier, um es in der App zu versuchen.",
            icon: "/icon-192.png",
            tag: `${n.tag || "sm"}-done`,
            data: { url: res.ok ? url : `/q/${token}` },
          }),
        )
        .catch(() => self.clients.openWindow(`/q/${token}`)),
    );
    return;
  }
  const target = token ? `/q/${token}` : url || "/start";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

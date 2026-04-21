self.addEventListener("push", function (event) {
    if (!event.data) return;

    let title = "Klinika Svjetlost Sarajevo";
    let options = {
        body: "Nova notifikacija",
        icon: "/logo-svjetlost.svg",
        badge: "/logo-svjetlost.svg",
        requireInteraction: true,
        silent: false,
        data: {
            url: "/"
        }
    };

    try {
        const data = event.data.json();
        title = data.title || "Klinika Svjetlost Sarajevo";
        options.body = data.body || "Nova notifikacija";
        options.data.url = data.url || "/";
    } catch {
        options.body = event.data.text();
    }

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const targetUrl = event.notification?.data?.url || "/";
    event.waitUntil(clients.openWindow(targetUrl));
});

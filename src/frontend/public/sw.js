// PushAlert Service Worker
self.addEventListener('push', function(event) {
    if (event.data) {
        var data = event.data.json();
        var options = {
            body: data.body,
            icon: data.icon || '/icon.png',
            badge: data.badge || '/badge.png',
            image: data.image,
            data: {
                url: data.url
            },
            requireInteraction: data.requireInteraction || false,
            actions: data.actions || []
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

self.addEventListener('pushsubscriptionchange', function(event) {
    event.waitUntil(
        self.registration.pushManager.subscribe({ userVisibleOnly: true })
    );
});

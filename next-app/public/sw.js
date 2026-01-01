// 🔹 sw.js - 브라우저 백그라운드에서 알림을 수신하는 서비스 워커

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        console.log('Push received:', data);

        const options = {
            body: data.message,
            icon: data.icon || '/next.svg',
            badge: '/next.svg',
            data: {
                url: '/', // 알림 클릭 시 이동할 경로
                groupId: data.groupId
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

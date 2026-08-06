// Old Palace — Staff app service worker (push + focus handling)
const STAFF_CACHE = 'ops-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Payload-less push: wake up, fetch what changed, show a precise notification
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'New guest activity';
    let body = 'Open the app to respond.';
    let tag = 'ops-generic';

    try {
      const [inboxRes, fbRes] = await Promise.all([
        fetch('/api/staff/inbox/1', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch('/api/staff/feedback/1', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      ]);

      const conv = inboxRes && inboxRes.conversations && inboxRes.conversations[0];
      const fb = fbRes && fbRes.feedback && fbRes.feedback[0];
      const convTime = conv && conv.last_at ? Date.parse(conv.last_at.replace(' ', 'T') + 'Z') : 0;
      const fbTime = fb && fb.submitted_at ? Date.parse(fb.submitted_at.replace(' ', 'T') + 'Z') : 0;

      if (fb && fbTime >= convTime) {
        const who = fb.guest_name || 'A guest';
        const room = fb.room_number ? ' · Room ' + fb.room_number : '';
        title = fb.is_urgent ? '🚨 Urgent feedback' : '📝 New feedback';
        body = who + room + (fb.sentiment_label ? ' · ' + fb.sentiment_label : '');
        tag = 'ops-feedback';
      } else if (conv) {
        const who = conv.guest_name || 'Guest';
        const room = conv.room_number ? ' · Room ' + conv.room_number : '';
        title = conv.is_ai_paused ? '💬 ' + who + ' replied' : '💬 New guest chat';
        body = (conv.last_message || 'Tap to open the conversation.').slice(0, 120) + (room ? '\n' + who + room : '');
        tag = 'ops-chat';
      }
    } catch (e) {}

    await self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 80, 200],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/staff/app' }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/staff/app';
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes('/staff/app')) {
        await c.focus();
        c.postMessage({ type: 'refresh' });
        return;
      }
    }
    await clients.openWindow(url);
  })());
});

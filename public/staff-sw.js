// Old Palace — Staff app service worker (push + focus handling)
const STAFF_CACHE = 'ops-shell-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// What is ringing right now. Public, so it answers on a phone that is signed out (or signed in
// without Chats) while sign-in is required, when the inbox and feedback calls get 401/403.
async function ringState() {
  try {
    const r = await fetch('/api/staff/ring-state?property_id=1', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && typeof j === 'object' ? j : null;
  } catch (e) { return null; }
}

// { status, body }: status 0 and body null when the request failed
async function getJson(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    let body = null;
    try { body = await r.json(); } catch (e) {}
    return { status: r.status, body };
  } catch (e) { return { status: 0, body: null }; }
}

// Payload-less push: wake up, fetch what changed, show a precise notification
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'New guest activity';
    let body = 'Open the app to respond.';
    let tag = 'ops-generic';

    try {
      const [inbox, fbr] = await Promise.all([
        getJson('/api/staff/inbox/1'),
        getJson('/api/staff/feedback/1')
      ]);
      const inboxRes = inbox.body, fbRes = fbr.body;

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

      // Not allowed to read the inbox on this phone: say what is ringing instead
      const denied = [inbox.status, fbr.status].some(s => s === 401 || s === 403);
      if (denied && tag === 'ops-generic') {
        const rs = await ringState();
        if (rs && rs.ringing && rs.title) {
          title = String(rs.title);
          if (rs.body) body = String(rs.body);
          tag = rs.kind === 'chat' ? 'ops-chat' : 'ops-generic';
        }
      }
    } catch (e) {}

    // Ring like an incoming call: sticky notification, long insistent
    // vibration pattern, custom klaxon, and an explicit Acknowledge action.
    await self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [700, 250, 700, 250, 700, 250, 700, 250, 700],
      sound: '/static/ops-ring.wav',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      actions: [{ action: 'ack', title: 'Acknowledge' }],
      data: { url: '/staff/app' }
    });

    // Wake any open app window so it starts the looping ringtone
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(w => { try { w.postMessage({ type: 'ring' }); } catch (e) {} });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/staff/app';
  const acked = event.action === 'ack';

  event.waitUntil((async () => {
    // Acknowledging stops the repeat-ring cron for chats + feedback
    if (acked) {
      try {
        await fetch('/api/staff/ack-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_id: 1 })
        });
      } catch (e) {}
      try {
        // Ack the chat that is ringing (ring-state is public: works with sign-in required and
        // no Chats session on this phone). A test ring is stopped instead.
        const rs = await ringState();
        let sid = rs && rs.session_id ? String(rs.session_id) : '';
        if (rs && rs.kind === 'test') {
          await fetch('/api/staff/test-ring-stop', { method: 'POST' }).catch(() => null);
        }
        // Fallback: the newest chat in the inbox (needs a Chats session while sign-in is required)
        if (!sid) {
          const inbox = await fetch('/api/staff/inbox/1', { cache: 'no-store' }).then(r => r.json()).catch(() => null);
          const top = inbox && inbox.conversations && inbox.conversations[0];
          if (top && top.session_id) sid = String(top.session_id);
        }
        if (sid) {
          await fetch('/api/staff/ack-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: 1, session_id: sid })
          });
        }
      } catch (e) {}
      const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      wins.forEach(w => { try { w.postMessage({ type: 'stopring' }); } catch (e) {} });
      return;
    }

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

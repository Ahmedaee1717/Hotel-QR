// Old Palace ⇄ Signabot WhatsApp bridge (see wrangler.toml).
// Old Palace verifies WaSender's signature itself (it is passed through untouched) and answers
// {claimed_all}. Anything it does not claim — or any failure here — goes to Signabot unchanged,
// so Signabot never depends on Old Palace being up.
const OLD_PALACE = 'https://www.oldpalaceresort.online/api/staff/wasender-webhook'

export default {
  async fetch(request) {
    if (request.method !== 'POST') return fetch(request)
    const body = await request.arrayBuffer()
    let claimed = false
    try {
      const headers = { 'content-type': 'application/json', 'x-wa-bridge': '1' }
      const sig = request.headers.get('x-webhook-signature')
      if (sig) headers['x-webhook-signature'] = sig
      const r = await fetch(OLD_PALACE, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) })
      const d = r.ok ? await r.json().catch(() => null) : null
      claimed = !!(d && d.claimed_all === true)
      console.log('old-palace', r.status, claimed ? 'claimed' : 'passed on')
    } catch (e) {
      console.log('old-palace unreachable, passed on', String(e).slice(0, 120))
    }
    if (claimed) return Response.json({ ok: true, handled_by: 'old-palace' })
    // A Worker's subrequest to its own route goes to the origin (the signalift Pages app), not back here
    return fetch(new Request(request.url, { method: 'POST', headers: request.headers, body }))
  }
}

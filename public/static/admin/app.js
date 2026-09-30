/* ═══════════════════════════════════════════════════════════════════════════
   Old Palace Resort — guest-app admin (shell, data, router, Home, Hotel & home screen).
   One screen per thing guests see; the sidebar is generated from the guest home
   tiles in guest order. Staff read tile / page / place — never database words.
   Screens for pages, room service, info pages, embeds and help live in screens.js.
   ═══════════════════════════════════════════════════════════════════════════ */
var GUEST_DOMAIN = 'https://www.oldpalaceresort.online';
var MAIN_RESTAURANT_ID = 3; // El Kasr — its table bookings live in /admin/restaurant-setup/3
var PLACEHOLDER_PHONE = '+20 123 456 7890', PLACEHOLDER_EMAIL = '@paradiseresort.com';

/* ---- auth: same localStorage the classic dashboard uses; every request carries the two headers ---- */
var AUTH = { user: null, userId: '', propertyId: '', slug: 'paradise-resort', perms: [] };
function authInit() {
  var u = null; try { u = JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch (e) {}
  if (!u || !u.user_id) { location.href = '/admin/login?next=' + encodeURIComponent('/admin/app' + location.hash); return false; }
  var q = new URLSearchParams(location.search);
  AUTH.user = u; AUTH.userId = String(u.user_id);
  AUTH.propertyId = String(q.get('property') || u.property_id || localStorage.getItem('property_id') || '1');
  try { AUTH.perms = JSON.parse(localStorage.getItem('admin_permissions') || '[]') || []; } catch (e) { AUTH.perms = []; }
  try { localStorage.setItem('gl_staff', '1'); } catch (e) {}
  return true;
}
function can(perm) { return !AUTH.perms.length || AUTH.perms.indexOf(perm) !== -1; }
async function api(method, url, body, opts) {
  opts = opts || {};
  var opt = { method: method, cache: 'no-store', headers: { 'X-User-ID': AUTH.userId, 'X-Property-ID': AUTH.propertyId } };
  if (body !== undefined && !(body instanceof FormData)) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  else if (body instanceof FormData) opt.body = body;
  var r, d = {};
  try { r = await fetch(url, opt); } catch (e) { return { ok: false, status: 0, data: { error: t('err.network') } }; }
  try { d = (await r.json()) || {}; } catch (e) { d = {}; }
  return { ok: r.ok && d.success !== false && !d.error, status: r.status, data: d };
}
function errText(res, fallback) {
  var d = res.data || {};
  if (res.status === 0) return t('err.network');
  if (res.status === 401) return t('err.signedOut');
  if (res.status === 403) return d.error || t('err.perm');
  var m = d.message || d.error;
  if (m && typeof m === 'string') return m;
  return (fallback || t('err.generic')) + (res.status ? ' (' + res.status + ')' : '');
}
function signOut() {
  ['admin_user', 'admin_token', 'admin_permissions', 'admin_resource_access', 'user_id', 'property_id'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  location.href = '/admin/login';
}

/* ---- content: one request on boot and after every save, kept in C ---- */
var C = null;
var TYPE_META = {
  restaurant: { key: 'type:restaurant', icon: 'fas fa-utensils', show: 'show_restaurants', label: 'section_restaurants_en', def: 'Dining', sub: 'Restaurants & Bars', wide: true, hash: 'dining', sc: 'sc.dining' },
  event: { key: 'type:event', icon: 'fas fa-calendar-days', show: 'show_events', label: 'section_events_en', def: 'Events', hash: 'events', sc: 'sc.events' },
  spa: { key: 'type:spa', icon: 'fas fa-spa', show: 'show_spa', label: 'section_spa_en', def: 'Spa & Wellness', hash: 'spa', sc: 'sc.spa' },
  service: { key: 'type:service', icon: 'fas fa-bell-concierge', show: 'show_service', label: 'section_service_en', def: 'Services', hash: 'services', sc: 'sc.services' },
  activity: { key: 'type:activity', icon: 'fas fa-person-hiking', show: 'show_activities', label: 'section_activities_en', def: 'Experiences', hash: 'experiences', sc: 'sc.experiences' },
};
function parseImages(v) { if (Array.isArray(v)) return v.filter(Boolean); if (!v) return []; try { var a = JSON.parse(v); return Array.isArray(a) ? a.filter(Boolean) : []; } catch (e) { return String(v).split('\n').map(function (s) { return s.trim(); }).filter(Boolean); } }
async function loadContent() {
  var r = await api('GET', '/api/admin/guest-content');
  if (!r.ok) throw new Error(errText(r, t('err.loadTitle')));
  var d = r.data;
  d.property = d.property || {}; d.customSections = d.customSections || []; d.offerings = d.offerings || []; d.infoPages = d.infoPages || [];
  d.beach = d.beach || { enabled: 0, online_booking: 0 }; d.roomService = d.roomService || { offering: null, items: [], categories: [] }; d.counts = d.counts || {};
  d.offerings.forEach(function (o) { o.images = parseImages(o.images); o.offering_id = +o.offering_id; });
  if (d.roomService.offering) d.roomService.offering.images = parseImages(d.roomService.offering.images);
  var to = d.tileOrder || d.property.tile_order; if (typeof to === 'string') { try { to = JSON.parse(to); } catch (e) { to = []; } }
  d.tileOrder = Array.isArray(to) ? to : []; d.defaultTileOrder = Array.isArray(d.defaultTileOrder) ? d.defaultTileOrder : [];
  if (d.property.slug) AUTH.slug = d.property.slug;
  C = d;
  return C;
}
function offeringsFor(key) {
  var list = key.indexOf('type:') === 0
    ? C.offerings.filter(function (o) { return o.offering_type === key.slice(5); })
    : C.offerings.filter(function (o) { return o.offering_type === 'custom' && o.custom_section_key === key.slice(3); });
  return list.sort(function (a, b) { return ((b.is_featured || 0) - (a.is_featured || 0)) || ((b.display_order || 0) - (a.display_order || 0)) || (a.offering_id - b.offering_id); });
}
function activeOf(list) { return list.filter(function (o) { return o.status === 'active'; }); }
function firstPhoto(list) { for (var i = 0; i < list.length; i++) if (list[i].images && list[i].images[0]) return list[i].images[0]; return ''; }
function isRoomServiceKey(key) { return key === 'cs:room-service'; }
function vocab(key) {
  var typ = key.indexOf('type:') === 0 ? key.slice(5) : 'place';
  var m = { restaurant: ['venue.restaurant', 'venue.restaurants'], event: ['venue.event', 'venue.events'], spa: ['venue.spa', 'venue.spas'], service: ['venue.service', 'venue.services'] }[typ] || ['venue.place', 'venue.places'];
  return { one: t(m[0]), many: t(m[1]) };
}
// The guest home tiles as the admin sees them, in guest order (all tiles, hidden ones included).
function tilesList() {
  var p = C.property, list = [];
  Object.keys(TYPE_META).forEach(function (typ) {
    var m = TYPE_META[typ], offs = activeOf(offeringsFor(m.key));
    list.push({ key: m.key, kind: 'type', type: typ, label: p[m.label] || m.def, sub: m.sub || '', icon: m.icon, img: firstPhoto(offs), visible: p[m.show] === 1, count: typ === 'activity' ? null : offs.length, hash: m.hash });
  });
  C.customSections.slice().sort(function (a, b) { return ((a.display_order || 0) - (b.display_order || 0)) || (a.section_id - b.section_id); }).forEach(function (cs) {
    var isRs = cs.section_key === 'room-service', offs = isRs ? [] : activeOf(offeringsFor('cs:' + cs.section_key));
    var rsImg = isRs && C.roomService.offering && C.roomService.offering.images[0];
    list.push({ key: 'cs:' + cs.section_key, kind: 'cs', cs: cs, id: cs.section_id, sectionKey: cs.section_key, label: cs.section_name_en || cs.section_key, sub: isRs ? 'Served to your room' : (cs.subtitle_en || ''), icon: cs.icon_class || (isRs ? 'fas fa-utensils' : 'fas fa-star'),
      img: cs.tile_image_url || rsImg || firstPhoto(offs), visible: cs.is_visible === 1, count: isRs ? C.roomService.items.length : offs.length, hash: isRs ? 'room-service' : 'page/' + 'cs:' + cs.section_key, isRs: isRs });
  });
  list.push({ key: 'beach', kind: 'beach', label: 'Beach', sub: 'Reserve your spot', icon: 'fas fa-umbrella-beach', img: '', visible: !!C.beach.enabled, count: null, hash: 'beach', locked: true });
  C.infoPages.slice().sort(function (a, b) { return ((a.display_order || 0) - (b.display_order || 0)) || (a.page_id - b.page_id); }).forEach(function (pg) {
    list.push({ key: 'info:' + pg.page_key, kind: 'info', page: pg, id: pg.page_id, label: pg.title_en || pg.page_key, sub: '', icon: pg.icon_class || 'fas fa-info-circle', img: pg.tile_image_url || '', visible: pg.is_published === 1 && pg.show_in_menu === 1, count: null, hash: 'info/' + pg.page_key });
  });
  list.push({ key: 'feedback', kind: 'feedback', label: 'Feedback', sub: 'Share your thoughts', icon: 'fas fa-comment-dots', img: '', visible: !!(p.feedback_survey_url), count: null, hash: 'feedback', locked: true });
  list.push({ key: 'map', kind: 'map', label: 'Resort Map', sub: 'Live · Find your way', icon: 'fas fa-map-location-dot', img: '', visible: p.show_hotel_map === 1, count: C.counts.pois == null ? null : +C.counts.pois, hash: 'map', locked: true });
  var order = C.tileOrder.length ? C.tileOrder : C.defaultTileOrder, idx = {};
  order.forEach(function (k, i) { if (idx[k] == null) idx[k] = i; });
  return list.map(function (tl, i) { tl._i = i; return tl; }).sort(function (a, b) {
    var ia = idx[a.key], ib = idx[b.key];
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1; if (ib != null) return 1;
    return a._i - b._i;
  });
}
function tileByKey(key) { return tilesList().find(function (tl) { return tl.key === key; }); }
function tileLabel(tl) { if (tl.kind === 'type') return C.property[TYPE_META[tl.type].label] || t(TYPE_META[tl.type].sc); if (tl.kind === 'beach') return t('sc.beach'); if (tl.kind === 'feedback') return t('sc.feedback'); if (tl.kind === 'map') return t('sc.map'); if (tl.isRs) return t('sc.roomservice'); return tl.label; }
function tileThumb(tl, cls) { return tl.img ? '<img class="' + cls + '" src="' + edAttr(tl.img) + '" alt="">' : '<span class="nav-emoji">' + edIconHtml(tl.icon) + '</span>'; }
// Preview payloads share the same shape everywhere: the home message describes the whole draft.
function pvProperty(extra) {
  var p = C.property, o = {};
  ['name', 'tagline', 'brand_logo_url', 'hero_image_url', 'primary_color', 'secondary_color', 'accent_color', 'show_restaurants', 'show_events', 'show_spa', 'show_service', 'show_activities', 'show_hotel_map', 'section_restaurants_en', 'section_events_en', 'section_spa_en', 'section_service_en', 'section_activities_en'].forEach(function (k) { if (p[k] !== undefined) o[k] = p[k]; });
  o.tile_order = C.tileOrder.length ? C.tileOrder : C.defaultTileOrder;
  return Object.assign(o, extra || {});
}
function pvHome(opts) {
  opts = opts || {};
  var pages = (opts.infoPages || C.infoPages).filter(function (pg) { return pg.is_published === 1 && pg.show_in_menu === 1; });
  return { type: 'op-preview', view: 'home', property: pvProperty(opts.property), customSections: opts.customSections || C.customSections, infoPages: pages, beachEnabled: !!C.beach.enabled, feedbackEnabled: !!C.property.feedback_survey_url, highlight: opts.highlight || null };
}
function pvCategory(key, draft, highlightId) {
  var offs = activeOf(offeringsFor(key)).map(function (o) { return Object.assign({}, o); });
  if (draft) { var i = offs.findIndex(function (o) { return String(o.offering_id) === String(draft.offering_id); }); if (i >= 0) offs[i] = Object.assign(offs[i], draft); else offs.push(draft); }
  return { type: 'op-preview', view: 'category', key: key.indexOf('type:') === 0 ? key.slice(5) : key, offerings: offs, highlightOfferingId: highlightId == null ? (draft ? draft.offering_id : null) : highlightId };
}
function pvOffering(row) { return { type: 'op-preview', view: 'offering', offering: row }; }

/* ---- shell: sidebar, crumbs, screen header, stage, router ---- */
var V3 = { screen: null, tab: null, key: null, renderQueued: false };
var SCREENS = {
  home: { i18n: 'sc.home', icon: 'fas fa-house', hash: 'home' },
  hotel: { i18n: 'sc.hotel', icon: 'fas fa-hotel', hash: 'hotel', cap: 'cap.hotel', tabs: ['look', 'tiles', 'contact'], help: 'hotel' },
  page: { hash: 'page', help: 'page' },
  roomservice: { i18n: 'sc.roomservice', icon: 'fas fa-bell-concierge', hash: 'room-service', cap: 'cap.roomservice', help: 'roomservice' },
  info: { i18n: 'sc.info', icon: 'fas fa-circle-info', hash: 'info', cap: 'cap.info', help: 'info' },
  beach: { i18n: 'sc.beach', icon: 'fas fa-umbrella-beach', hash: 'beach', cap: 'cap.beach', embed: '/admin/beach-setup?embed=1', note: 'emb.beach', classic: 'beach', help: 'beach' },
  feedback: { i18n: 'sc.feedback', icon: 'fas fa-comment-dots', hash: 'feedback', cap: 'cap.feedback', help: 'feedback' },
  map: { i18n: 'sc.map', icon: 'fas fa-map-location-dot', hash: 'map', cap: 'cap.map', embed: '/admin/map-editor?embed=1', note: 'emb.map', classic: 'resortmap', help: 'map' },
  chatbot: { i18n: 'sc.chatbot', icon: 'fas fa-robot', hash: 'chatbot', cap: 'cap.chatbot', embed: '/admin/dashboard?embed=1#chatbot', dashTab: 'chatbot', note: 'emb.chatbot', classic: 'chatbot', help: 'behind' },
  whatsapp: { i18n: 'sc.whatsapp', icon: 'fab fa-whatsapp', hash: 'whatsapp', cap: 'cap.whatsapp', embed: '/admin/escalation?embed=1', note: 'emb.whatsapp', classic: 'chatbot', help: 'behind' },
  staff: { i18n: 'sc.staff', icon: 'fas fa-users', hash: 'staff', cap: 'cap.staff', embed: '/admin/ops-staff?embed=1', note: 'emb.staff', classic: 'opsstaff', perm: 'users_view', help: 'behind' },
  elkasr: { i18n: 'sc.elkasr', icon: 'fas fa-chair', hash: 'elkasr', cap: 'cap.elkasr', embed: '/admin/restaurant-setup/' + MAIN_RESTAURANT_ID + '?embed=1', withProperty: true, note: 'emb.elkasr', classic: 'mainrestaurant', help: 'behind' },
  analytics: { i18n: 'sc.analytics', icon: 'fas fa-chart-line', hash: 'analytics', cap: 'cap.analytics', embed: '/admin/analytics?embed=1', withProperty: true, note: 'emb.analytics', classic: 'analytics', perm: 'analytics_view', help: 'behind' },
  help: { i18n: 'sc.help', icon: 'fas fa-life-ring', hash: 'help', cap: 'cap.help' },
};
function navItem(screen) {
  var s = SCREENS[screen]; if (s.perm && !can(s.perm)) return '';
  return '<button class="nav-item" type="button" data-screen="' + screen + '" data-go="' + screen + '"><span class="nav-emoji">' + edIconHtml(s.icon) + '</span><span class="nav-label">' + edEsc(t(s.i18n)) + '</span></button>';
}
function buildSidebar() {
  var nav = document.getElementById('sb-nav'); if (!nav || !C) return;
  var tiles = tilesList().filter(function (tl) { return tl.kind !== 'type' || tl.type === 'restaurant' || tl.visible; }).map(function (tl) {
    var go = tl.kind === 'type' || (tl.kind === 'cs' && !tl.isRs) ? 'page:' + tl.key : tl.isRs ? 'roomservice' : tl.kind === 'info' ? 'info:' + tl.page.page_key : tl.kind;
    return '<button class="nav-item' + (tl.visible ? '' : ' dim') + '" type="button" data-tile="' + edAttr(tl.key) + '" data-go="' + edAttr(go) + '">' + tileThumb(tl, 'nav-thumb') + '<span class="nav-label">' + edEsc(tileLabel(tl)) + '</span>' + (tl.visible ? '' : '<span class="nav-hidden-tag">' + t('tag.hidden') + '</span>') + '</button>';
  }).join('');
  nav.innerHTML = '<div class="nav-section"><div class="nav-section-label">' + t('grp.home') + '</div>' + navItem('home') + navItem('hotel') + '</div>'
    + '<div class="nav-section"><div class="nav-section-label">' + t('grp.pages') + '</div>' + tiles + '<button class="nav-add" type="button" data-go="newtile"><span class="nav-emoji">＋</span><span>' + t('nav.newTile') + '</span></button></div>'
    + '<div class="nav-section"><div class="nav-section-label">' + t('grp.behind') + '</div>' + navItem('chatbot') + navItem('whatsapp') + navItem('staff') + navItem('elkasr') + navItem('analytics') + navItem('help')
    + '<a class="nav-item" href="/admin/dashboard" target="_blank" rel="noopener"><span class="nav-emoji"><i class="fas fa-table-columns"></i></span><span class="nav-label">' + t('sc.classic') + '</span><span class="nav-ext">↗</span></a></div>';
  nav.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { navGo(b.dataset.go); }); });
  markSidebar();
}
function navGo(target) {
  if (target === 'newtile') { openNewTile(); return; }
  if (target.indexOf('page:') === 0) { openPage(target.slice(5)); return; }
  if (target.indexOf('info:') === 0) { go('info', { page: target.slice(5) }); return; }
  go(target);
}
function markSidebar() {
  document.querySelectorAll('#sb-nav .nav-item').forEach(function (b) {
    var on = V3.screen === 'page' ? b.dataset.tile === V3.key
      : V3.screen === 'roomservice' ? b.dataset.tile === 'cs:room-service'
      : V3.screen === 'info' && V3.key ? b.dataset.tile === 'info:' + V3.key
      : b.dataset.tile ? b.dataset.tile === V3.screen : b.dataset.screen === V3.screen;
    b.classList.toggle('active', !!on);
  });
}
function toggleSidebar(force) { document.body.classList.toggle('sb-open', force); }
function shellEls() { return { screen: document.getElementById('screen'), head: document.getElementById('sc-head'), body: document.getElementById('sc-body'), stage: document.getElementById('sc-stage') }; }
function setCrumbs(parts) {
  var el = document.getElementById('crumbs'); if (!el) return;
  el.innerHTML = parts.map(function (p, i) {
    var last = i === parts.length - 1, label = typeof p === 'string' ? p : p.label;
    return (i ? '<span class="sep">›</span>' : '') + (last ? '<span class="cur">' + edEsc(label) + '</span>' : '<a data-ci="' + i + '" tabindex="0" role="link">' + edEsc(label) + '</a>');
  }).join('');
  el.querySelectorAll('a[data-ci]').forEach(function (a) { var p = parts[+a.dataset.ci]; if (p && p.go) { a.addEventListener('click', p.go); a.addEventListener('keydown', function (e) { if (e.key === 'Enter') p.go(); }); } });
  var lastP = parts[parts.length - 1];
  document.title = (typeof lastP === 'string' ? lastP : lastP.label) + ' · Old Palace';
}
function renderHead(o) { // {icon, thumb, title, caption, chips:[html], actions:[html], tabs:[{id,label}], tab}
  var E = shellEls();
  E.head.innerHTML = '<div class="sc-head-row">'
    + '<div class="sc-emoji">' + (o.thumb ? '<img src="' + edAttr(o.thumb) + '" alt="">' : edIconHtml(o.icon, 'fas fa-star')) + '</div>'
    + '<div class="sc-titles"><h1 class="sc-title">' + edEsc(o.title) + '</h1>' + (o.caption ? '<div class="sc-caption">' + o.caption + '</div>' : '') + (o.chips && o.chips.length ? '<div class="sc-chips">' + o.chips.join('') + '</div>' : '') + '</div>'
    + (o.actions && o.actions.length ? '<div class="sc-actions">' + o.actions.join('') + '</div>' : '')
    + '</div>'
    + (o.tabs && o.tabs.length ? '<div class="sc-tabs">' + o.tabs.map(function (tb) { return '<button class="sc-tab' + (tb.id === o.tab ? ' on' : '') + '" type="button" data-tab="' + tb.id + '">' + edEsc(tb.label) + '</button>'; }).join('') + '</div>' : '<div style="height:16px"></div>');
  E.head.querySelectorAll('.sc-tab').forEach(function (b) { b.addEventListener('click', function () { go(V3.screen, { tab: b.dataset.tab, key: V3.key }); }); });
}
function stageReset() {
  var E = shellEls();
  E.stage.querySelectorAll(':scope > *').forEach(function (x) { x.style.display = 'none'; });
  document.querySelectorAll('#embeds .embed-host').forEach(function (x) { x.classList.remove('on'); });
  E.screen.classList.add('active');
}
function stageHost(id) {
  var E = shellEls(), w = document.getElementById(id);
  if (!w) { w = document.createElement('div'); w.id = id; E.stage.appendChild(w); }
  w.style.display = ''; return w;
}
function setActions(html) { document.getElementById('topbar-actions').innerHTML = html || ''; }
function hashFor(screen, opts) {
  opts = opts || {};
  if (screen === 'page') { var tl = tileByKey(opts.key); return tl && tl.kind === 'type' ? TYPE_META[tl.type].hash : 'page/' + opts.key; }
  if (screen === 'info' && opts.page) return 'info/' + opts.page;
  if (screen === 'hotel' && opts.tab) return 'hotel/' + opts.tab;
  return SCREENS[screen] ? SCREENS[screen].hash : 'home';
}
var _hashSelf = false;
function setHash(h) { if (('#' + h) === location.hash) return; _hashSelf = true; try { history.replaceState(null, '', '#' + h); } catch (e) { location.hash = h; } setTimeout(function () { _hashSelf = false; }, 0); }
function routeFromHash() {
  var h = (location.hash || '').replace(/^#\/?/, '');
  if (!h || h === 'home') { go('home', { fromHash: true }); return; }
  var parts = h.split('/'), a = parts[0], b = parts.slice(1).join('/');
  var typ = Object.keys(TYPE_META).find(function (k) { return TYPE_META[k].hash === a; });
  if (typ) { openPage(TYPE_META[typ].key, { fromHash: true }); return; }
  if (a === 'page' && b) { openPage(b, { fromHash: true }); return; }
  if (a === 'room-service') { go('roomservice', { fromHash: true }); return; }
  if (a === 'info') { go('info', { page: b || null, fromHash: true }); return; }
  if (a === 'hotel') { go('hotel', { tab: b || 'look', fromHash: true }); return; }
  if (SCREENS[a]) { go(a, { fromHash: true }); return; }
  go('home', { fromHash: true });
}
window.addEventListener('hashchange', function () { if (!_hashSelf) routeFromHash(); });
function helpChapterFor() { var s = SCREENS[V3.screen]; if (V3.screen === 'page') { var tl = tileByKey(V3.key); return tl && tl.type === 'restaurant' ? 'dining' : 'page'; } return (s && s.help) || 'home'; }
function go(screen, opts) {
  opts = opts || {};
  var s = SCREENS[screen]; if (!s || screen === 'page') { screen = 'home'; s = SCREENS.home; }
  if (s.perm && !can(s.perm)) { screen = 'home'; s = SCREENS.home; }
  toggleSidebar(false); closeModal();
  var tabs = (s.tabs || []).map(function (id) { return { id: id, label: t('tab.' + id) }; });
  var tab = opts.tab && tabs.some(function (tb) { return tb.id === opts.tab; }) ? opts.tab : (tabs[0] && tabs[0].id) || null;
  var same = V3.screen === screen && V3.tab === tab;
  if (!same) edUnmountPhones();
  V3.screen = screen; V3.tab = tab; V3.key = screen === 'info' ? (opts.page || null) : null;
  var E = shellEls();
  stageReset(); setActions('');
  setHash(hashFor(screen, { tab: tab, page: opts.page }));
  var home = { label: t('crumb.home'), go: function () { go('home'); } };
  if (screen === 'home') { renderHome(); markSidebar(); return; }
  var crumbs = [home]; if (tabs.length > 1) { crumbs.push({ label: t(s.i18n), go: function () { go(screen); } }); crumbs.push(t('tab.' + tab)); } else crumbs.push(t(s.i18n));
  setCrumbs(crumbs);
  if (s.embed) { E.screen.classList.remove('active'); renderEmbed(screen); markSidebar(); return; }
  var actions = [];
  if (screen !== 'help') actions.push('<button class="btn btn-secondary btn-sm" type="button" onclick="openGuest()">' + t('act.openGuest') + '</button>');
  renderHead({ icon: s.icon, title: t(s.i18n), caption: s.cap ? t(s.cap) : '', tabs: tabs, tab: tab, actions: actions });
  if (screen === 'hotel') renderHotel(tab);
  else if (screen === 'roomservice') renderRoomService();
  else if (screen === 'info') renderInfoList(opts.page || null);
  else if (screen === 'feedback') renderFeedback();
  else if (screen === 'help') renderHelp(opts.chapter);
  markSidebar();
  try { E.body.scrollTop = 0; document.getElementById('content').scrollTop = 0; } catch (e) {}
}
function openGuest() { window.open('/hotel/' + encodeURIComponent(AUTH.slug), '_blank', 'noopener'); }
function openHelp() { var ch = helpChapterFor(); go('help', { chapter: ch }); }
// Re-render the current screen after content changed (sidebar always; the open editor keeps its own state).
async function refresh(opts) {
  opts = opts || {};
  try { await loadContent(); } catch (e) { toast(e.message, 'error'); return; }
  buildSidebar();
  if (modalOpen() && !opts.force) return;
  if (V3.screen === 'page') openPage(V3.key, { keepPhone: true });
  else if (V3.screen === 'home') renderHome();
  else if (V3.screen === 'hotel') renderHotel(V3.tab);
  else if (V3.screen === 'roomservice') renderRoomService(true);
  else if (V3.screen === 'info') renderInfoList(null);
  edSchedule(0);
}

/* ---- HOME: what needs attention, common tasks, the tiles, the phone, the QR ---- */
function computeAttention() {
  var out = [], p = C.property, tiles = tilesList();
  var dining = tiles.find(function (tl) { return tl.key === 'type:restaurant'; });
  if (dining && dining.visible && !activeOf(offeringsFor('type:restaurant')).length) out.push({ k: 'warn', ico: 'fas fa-utensils', t: t('att.diningEmpty'), s: t('att.diningEmptySub'), go: function () { openPage('type:restaurant'); } });
  var byName = {};
  tiles.forEach(function (tl) {
    if (!(tl.kind === 'type' && tl.type !== 'activity') && !(tl.kind === 'cs' && !tl.isRs)) return;
    var offs = activeOf(offeringsFor(tl.key));
    if (tl.kind === 'cs' && tl.visible && !offs.length) out.push({ k: 'warn', ico: tl.icon, t: t('att.csEmpty', { name: tl.label }), s: t('att.csEmptySub'), go: function () { openPage(tl.key); } });
    if (!tl.visible) return;
    offs.forEach(function (o) {
      var n = (o.title_en || '').trim().toLowerCase(); if (n) (byName[n] = byName[n] || []).push({ o: o, key: tl.key });
      if (!o.images.length) out.push({ k: 'warn', ico: 'fas fa-image', t: t('att.noPhoto', { name: o.title_en }), s: t('att.noPhotoSub'), go: function () { openPage(tl.key); openVenueEditor(tl.key, o.offering_id); } });
      if (!(o.opening_hours || '').trim() && tl.type !== 'event') out.push({ k: 'info', ico: 'fas fa-clock', t: t('att.noHours', { name: o.title_en }), s: t('att.noHoursSub'), go: function () { openPage(tl.key); openVenueEditor(tl.key, o.offering_id); } });
      if (tl.type === 'restaurant' && !(+o.menu_pages || 0)) out.push({ k: 'info', ico: 'fas fa-book-open', t: t('att.noMenu', { name: o.title_en }), s: t('att.noMenuSub'), go: function () { openPage(tl.key); openVenueEditor(tl.key, o.offering_id); } });
      if (tl.type === 'event' && o.event_date && new Date(o.event_date + 'T23:59:59') < new Date()) out.push({ k: 'warn', ico: 'fas fa-calendar-xmark', t: t('att.pastEvent', { name: o.title_en }), s: t('att.pastEventSub'), go: function () { openPage(tl.key); openVenueEditor(tl.key, o.offering_id); } });
    });
  });
  Object.keys(byName).forEach(function (n) { var g = byName[n]; if (g.length > 1) out.push({ k: 'warn', ico: 'fas fa-clone', t: t('att.dup', { name: g[0].o.title_en, n: g.length }), s: t('att.dupSub'), go: function () { openPage(g[0].key); } }); });
  C.infoPages.forEach(function (pg) { if (pg.is_published === 1 && !edPlain(pg.content_en)) out.push({ k: 'warn', ico: pg.icon_class || 'fas fa-info-circle', t: t('att.infoEmpty', { name: pg.title_en }), s: t('att.infoEmptySub'), go: function () { go('info', { page: pg.page_key }); } }); });
  if ((p.contact_phone || '').replace(/\s/g, '') === PLACEHOLDER_PHONE.replace(/\s/g, '')) out.push({ k: 'info', ico: 'fas fa-phone', t: t('att.phone'), s: t('att.phoneSub'), go: function () { go('hotel', { tab: 'contact' }); } });
  if ((p.contact_email || '').toLowerCase().indexOf(PLACEHOLDER_EMAIL) !== -1) out.push({ k: 'info', ico: 'fas fa-envelope', t: t('att.email'), s: t('att.emailSub'), go: function () { go('hotel', { tab: 'contact' }); } });
  if (!p.feedback_survey_url) out.push({ k: 'info', ico: 'fas fa-comment-dots', t: t('att.survey'), s: t('att.surveySub'), go: function () { go('feedback'); } });
  if (C.beach.enabled && !C.beach.online_booking) out.push({ k: 'info', ico: 'fas fa-umbrella-beach', t: t('att.beach'), s: t('att.beachSub'), go: function () { go('beach'); } });
  return out.sort(function (a, b) { return (a.k === 'warn' ? 0 : 1) - (b.k === 'warn' ? 0 : 1); });
}
function renderHome() {
  var E = shellEls();
  setCrumbs([t('crumb.home')]); setActions('');
  var h = new Date().getHours(), greet = t(h < 12 ? 'home.morning' : h < 18 ? 'home.afternoon' : 'home.evening');
  var u = AUTH.user || {}, name = u.first_name || u.name || (u.email ? u.email.split('@')[0] : '');
  E.head.innerHTML = '<div class="sc-head-row"><div class="sc-titles"><h1 class="hm-hello">' + edEsc(greet + (name ? (LANG === 'ar' ? '، ' : ', ') + name : '')) + '</h1>'
    + '<div class="hm-sub"><span class="hm-live">' + t('home.live') + '</span><span>' + edEsc(C.property.name || '') + '</span></div></div>'
    + '<div class="sc-actions"><button class="btn btn-secondary btn-sm" type="button" onclick="openCmdk()">' + t('home.find') + ' <kbd style="font-size:10px;border:1px solid var(--border);border-radius:4px;padding:0 4px;margin-left:4px">Ctrl K</kbd></button>'
    + '<button class="btn btn-secondary btn-sm" type="button" onclick="openGuest()">' + t('act.openGuest') + '</button></div></div><div style="height:6px"></div>';
  var w = stageHost('hm-wrap');
  if (!w.firstChild) w.innerHTML = '<div class="hm-grid"><div id="hm-left"></div><div><div id="hm-phone-host"></div><div style="height:16px"></div><div class="hm-qr" id="hm-qr"></div></div></div>';
  var tiles = tilesList();
  var tasks = [
    { ico: '🍽', t: t('task.menu'), s: t('sc.dining'), go: function () { openPage('type:restaurant'); } },
    { ico: '🕒', t: t('task.hours'), s: t('sc.dining'), go: function () { openPage('type:restaurant'); } },
    { ico: '🖼', t: t('task.photo'), s: t('sc.dining'), go: function () { openPage('type:restaurant'); } },
    { ico: 'ℹ️', t: t('task.info'), s: t('sc.info'), go: function () { go('info'); openInfoEditor(null); } },
    { ico: '👁', t: t('task.tile'), s: t('sc.hotel'), go: function () { go('hotel', { tab: 'tiles' }); } },
    { ico: '🔳', t: t('task.qr'), s: t('home.qr'), go: function () { var q = document.getElementById('hm-qr'); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
  ];
  var att = computeAttention();
  document.getElementById('hm-left').innerHTML =
    '<div class="hm-h">' + t('home.attention') + '</div><div class="hm-att" id="hm-att">'
    + (att.length ? att.map(function (a, i) { return '<button class="hm-att-row ' + a.k + '" type="button" data-att="' + i + '"><div class="hm-att-ico">' + edIconHtml(a.ico) + '</div><div class="hm-att-text"><div class="hm-att-title">' + edEsc(a.t) + '</div><div class="hm-att-sub">' + edEsc(a.s) + '</div></div><span class="hm-att-go">' + t('act.open') + '</span></button>'; }).join('')
      : '<div class="hm-att-row good" style="cursor:default"><div class="hm-att-ico">✅</div><div class="hm-att-text"><div class="hm-att-title">' + t('home.allGood') + '</div><div class="hm-att-sub">' + t('home.allGoodSub') + '</div></div></div>') + '</div>'
    + '<div class="hm-h">' + t('home.tasks') + '</div><div class="hm-tasks">' + tasks.map(function (tk, i) { return '<button class="hm-task" type="button" data-task="' + i + '"><span class="hm-task-ico">' + tk.ico + '</span><span class="hm-task-t">' + edEsc(tk.t) + '</span><span class="hm-task-s">' + edEsc(tk.s) + '</span></button>'; }).join('') + '</div>'
    + '<div class="hm-h">' + t('home.tiles') + '</div><div class="hm-tiles">' + tiles.map(function (tl) {
      var status = tl.count == null ? '' : tl.count ? t('tiles.count', { n: tl.count, what: tl.isRs ? t('tiles.rsSub') : tl.kind === 'map' ? 'pins' : vocab(tl.key)[tl.count === 1 ? 'one' : 'many'] }) : 'EMPTY';
      if (tl.kind === 'map' && tl.count) status = tl.count + ' pins';
      return '<button class="hm-tile' + (tl.visible ? '' : ' off') + '" type="button" data-tile="' + edAttr(tl.key) + '">' + (tl.img ? '<div class="hm-tile-bg" style="background-image:url(\'' + edAttr(tl.img) + '\')"></div>' : '') + '<div class="hm-tile-ov"></div>'
        + (status ? '<div class="hm-tile-s' + (status === 'EMPTY' ? ' warn' : '') + '">' + edEsc(status) + '</div>' : '') + (tl.visible ? '' : '<div class="hm-tile-s right">' + t('tag.hidden') + '</div>')
        + '<div class="hm-tile-t">' + edIconHtml(tl.icon) + edEsc(tileLabel(tl)) + '</div></button>';
    }).join('') + '</div>';
  var left = document.getElementById('hm-left');
  left.querySelectorAll('[data-att]').forEach(function (b) { b.addEventListener('click', function () { att[+b.dataset.att].go(); }); });
  left.querySelectorAll('[data-task]').forEach(function (b) { b.addEventListener('click', function () { tasks[+b.dataset.task].go(); }); });
  left.querySelectorAll('[data-tile]').forEach(function (b) { b.addEventListener('click', function () { openTile(b.dataset.tile); }); });
  var url = GUEST_DOMAIN + '/hotel/' + encodeURIComponent(AUTH.slug) + '?src=qr';
  document.getElementById('hm-qr').innerHTML = '<div class="hm-qr-t">' + t('home.qr') + '</div><img class="hm-qr-img" alt="QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url) + '"><div class="hm-qr-url">' + edEsc(url) + '</div>'
    + '<div class="hm-qr-actions"><button class="btn btn-primary btn-sm" type="button" id="hm-qr-dl">⬇ ' + t('home.qrDownload') + '</button><button class="btn btn-secondary btn-sm" type="button" id="hm-qr-print">🖨 ' + t('home.qrPrint') + '</button></div>';
  document.getElementById('hm-qr-dl').addEventListener('click', function () { downloadQR(url); });
  document.getElementById('hm-qr-print').addEventListener('click', function () { printQR(url); });
  edPhone('hm-phone-host', [['home', t('tab.home')], ['category', t('sc.dining')]], 'home', function (tab) { return tab === 'home' ? pvHome() : pvCategory('type:restaurant'); });
}
function openTile(key) {
  var tl = tileByKey(key); if (!tl) return;
  if (tl.kind === 'type' || (tl.kind === 'cs' && !tl.isRs)) openPage(key);
  else if (tl.isRs) go('roomservice');
  else if (tl.kind === 'info') go('info', { page: tl.page.page_key });
  else go(tl.kind);
}
async function downloadQR(url) {
  var png = 'https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=' + encodeURIComponent(url);
  try {
    var r = await fetch(png); if (!r.ok) throw new Error('x');
    var b = await r.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'old-palace-guest-app-qr.png'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  } catch (e) { window.open(png, '_blank', 'noopener'); }
}
function printQR(url) {
  var win = window.open('', '_blank'); if (!win) return;
  win.document.write('<html><head><title>QR</title></head><body style="text-align:center;padding:50px;font-family:Georgia,serif"><h1>' + edEsc(C.property.name || '') + '</h1><img src="https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=' + encodeURIComponent(url) + '" style="width:500px;height:500px"><p>' + edEsc(url) + '</p></body></html>');
  win.document.close(); setTimeout(function () { win.print(); }, 400);
}

/* ---- HOTEL & HOME SCREEN: Look · Tiles · Contact ---- */
var HOTEL = { draft: null, highlight: null };
function renderHotel(tab) {
  var p = C.property, host = stageHost('hotel-wrap');
  if (tab === 'look') {
    host.innerHTML = '<div class="ed-grid"><div class="ed-form">' + edEnglishNote()
      + '<div class="ed-group"><div class="ed-group-title">' + t('look.group') + '</div>'
      + edField('f-name', t('look.name'), p.name) + edField('f-tagline', t('look.tagline'), p.tagline, { hint: t('look.taglineHint') })
      + '<div class="form-row"><div>' + edPhotoField('f-logo', t('look.logo'), t('look.logoHint'), p.brand_logo_url) + '</div><div>' + edPhotoField('f-hero', t('look.hero'), t('look.heroHint'), p.hero_image_url) + '</div></div></div>'
      + '<div class="ed-group"><div class="ed-group-title">' + t('look.colours') + ' <span class="ed-hint">' + t('look.coloursHint') + '</span></div><div class="form-row" style="grid-template-columns:1fr 1fr 1fr">'
      + '<div>' + edColorField('f-c1', t('look.primary'), p.primary_color || '#972626') + '</div><div>' + edColorField('f-c2', t('look.secondary'), p.secondary_color || '#6B1529') + '</div><div>' + edColorField('f-c3', t('look.accent'), p.accent_color || '#D4AF37') + '</div></div></div>'
      + '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="button" id="look-save">' + t('act.saveChanges') + '</button></div>'
      + '</div><div id="hotel-phone"></div></div>';
    var draft = function () { return { name: edVal('f-name').trim(), tagline: edVal('f-tagline').trim(), brand_logo_url: edVal('f-logo').trim(), hero_image_url: edVal('f-hero').trim(), primary_color: edVal('f-c1'), secondary_color: edVal('f-c2'), accent_color: edVal('f-c3') }; };
    var upd = function () { edSchedule(); };
    edWatch(['f-name', 'f-tagline'], upd); edWirePhoto('f-logo', upd); edWirePhoto('f-hero', upd); edWireColor('f-c1', upd); edWireColor('f-c2', upd); edWireColor('f-c3', upd);
    document.getElementById('look-save').addEventListener('click', async function () {
      var b = draft(), btn = this; btn.disabled = true;
      var r = await api('PATCH', '/api/admin/property-settings', b); btn.disabled = false;
      if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
      toast(t('toast.saved'), 'success'); await refresh();
    });
    edPhone('hotel-phone', [['home', t('tab.home')]], 'home', function () { return pvHome({ property: draft() }); });
  } else if (tab === 'tiles') {
    host.innerHTML = '<div class="ed-grid"><div class="ed-form" id="tiles-block"></div><div id="hotel-phone"></div></div>';
    renderTilesBlock();
    edPhone('hotel-phone', [['home', t('tab.home')]], 'home', function () { return pvHome({ highlight: HOTEL.highlight }); });
  } else {
    host.innerHTML = '<div class="ed-form" style="max-width:640px"><div class="sc-note"><span>ℹ️</span><div>' + t('contact.note') + '</div></div>'
      + '<div class="ed-group"><div class="ed-group-title">' + t('contact.group') + '</div>'
      + edField('f-phone', t('contact.phone'), p.contact_phone, { type: 'tel', ph: '+20 …' }) + edField('f-wa', t('contact.whatsapp'), p.guest_whatsapp, { type: 'tel', ph: '+20 …' }) + edField('f-email', t('contact.email'), p.contact_email, { type: 'email' }) + '</div>'
      + '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="button" id="contact-save">' + t('act.saveChanges') + '</button></div></div>';
    document.getElementById('contact-save').addEventListener('click', async function () {
      var btn = this; btn.disabled = true;
      var r = await api('PATCH', '/api/admin/property-settings', { contact_phone: edVal('f-phone').trim(), guest_whatsapp: edVal('f-wa').trim(), contact_email: edVal('f-email').trim() }); btn.disabled = false;
      if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
      toast(t('toast.saved'), 'success'); await refresh();
    });
  }
}
function tileSub(tl) {
  if (tl.kind === 'beach') return t('tiles.beachSub');
  if (tl.kind === 'feedback') return t('tiles.feedbackSub');
  if (tl.kind === 'map') return t('tiles.mapSub');
  if (tl.kind === 'info') return t('tiles.infoSub');
  if (tl.isRs) return t('tiles.count', { n: tl.count, what: t('tiles.rsSub') });
  if (tl.type === 'activity') return t('tiles.expSub');
  var v = vocab(tl.key); return t('tiles.count', { n: tl.count, what: tl.count === 1 ? v.one : v.many });
}
function renderTilesBlock() {
  var host = document.getElementById('tiles-block'); if (!host) return;
  var list = tilesList();
  host.innerHTML = '<div class="ed-group-title" style="margin-top:4px">' + t('tiles.title') + ' <span class="ed-hint">' + t('tiles.hint') + '</span></div>'
    + list.map(function (tl, i) {
      var lockedVis = tl.kind === 'beach' || tl.kind === 'feedback';
      return '<div class="tl-row' + (tl.visible ? '' : ' off') + (HOTEL.highlight === tl.key ? ' flash' : '') + '" data-key="' + edAttr(tl.key) + '"><span class="tl-num">' + (i + 1) + '</span>'
        + '<div class="tl-thumb">' + (tl.img ? '<img src="' + edAttr(tl.img) + '" alt="">' : edIconHtml(tl.icon)) + '</div>'
        + '<div class="tl-name">' + edEsc(tileLabel(tl)) + '<span class="tl-sub">' + edEsc(tileSub(tl)) + (tl.visible ? '' : ' · ' + t('tiles.hiddenSub')) + '</span></div>'
        + '<div class="tl-actions"><button class="ed-mini" type="button" data-tl="up" data-key="' + edAttr(tl.key) + '"' + (i === 0 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveUp')) + '">↑</button>'
        + '<button class="ed-mini" type="button" data-tl="down" data-key="' + edAttr(tl.key) + '"' + (i === list.length - 1 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveDown')) + '">↓</button>'
        + '<button class="ed-mini" type="button" data-tl="vis" data-key="' + edAttr(tl.key) + '" title="' + edAttr(tl.visible ? t('act.hide') : t('act.show')) + '"' + (lockedVis ? ' aria-describedby="tl-note"' : '') + '>' + (tl.visible ? '👁' : '🚫') + '</button>'
        + '<button class="ed-mini" type="button" data-tl="look" data-key="' + edAttr(tl.key) + '" title="' + edAttr(t('act.editTile')) + '">✎</button>'
        + '<button class="ed-mini" type="button" data-tl="open" data-key="' + edAttr(tl.key) + '" title="' + edAttr(t('act.openPage')) + '">→</button></div></div>';
    }).join('')
    + '<button class="pg-add" type="button" style="margin-top:8px" onclick="openNewTile()">＋ ' + t('nav.newTile') + '</button>';
  host.querySelectorAll('[data-tl]').forEach(function (b) { b.addEventListener('click', function () { tileAction(b.dataset.tl, b.dataset.key); }); });
}
async function tileAction(act, key) {
  var tl = tileByKey(key); if (!tl) return;
  HOTEL.highlight = key;
  if (act === 'look') { openTileLook(key); return; }
  if (act === 'open') { openTile(key); return; }
  if (act === 'vis') {
    var r;
    if (tl.kind === 'type') { var b = {}; b[TYPE_META[tl.type].show] = tl.visible ? 0 : 1; r = await api('PATCH', '/api/admin/property-settings', b); }
    else if (tl.kind === 'cs') r = await api('PUT', '/api/admin/custom-sections/' + tl.id, { is_visible: tl.visible ? 0 : 1 });
    else if (tl.kind === 'info') r = await api('PATCH', '/api/admin/info-pages/' + tl.id, tl.visible ? { show_in_menu: 0 } : { show_in_menu: 1, is_published: 1 });
    else if (tl.kind === 'map') r = await api('PATCH', '/api/admin/property-settings', { show_hotel_map: tl.visible ? 0 : 1 });
    else { openTileLook(key); return; }
    if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
    toast(tl.visible ? t('toast.hidden') : t('toast.shown'), 'success');
    await refresh(); return;
  }
  if (act === 'up' || act === 'down') {
    var keys = tilesList().map(function (x) { return x.key; }), i = keys.indexOf(key), j = act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= keys.length) return;
    var tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
    var r2 = await api('PATCH', '/api/admin/property-settings', { tile_order: keys });
    if (!r2.ok) { toast(errText(r2, t('toast.orderFail')), 'error'); return; }
    toast(t('toast.order'), 'success'); await refresh();
  }
}
// ✎ on a tile: label / small line / icon / colour / photo, depending on what the guest app can show for that tile.
function openTileLook(key) {
  var tl = tileByKey(key); if (!tl) return;
  var body = '', onSave = null, draftFn = null;
  if (tl.kind === 'type') {
    var m = TYPE_META[tl.type];
    body = edEnglishNote() + '<div class="ed-group"><div class="ed-group-title">' + t('tl.group') + '</div>' + edField('f-tl-label', t('tl.label'), C.property[m.label] || m.def) + '<div class="form-hint">' + t('tl.builtinNote') + '</div><div style="height:10px"></div></div>';
    draftFn = function () { var o = {}; o[m.label] = edVal('f-tl-label').trim() || m.def; return { property: o, highlight: key }; };
    onSave = async function () { var b = {}; b[m.label] = edVal('f-tl-label').trim() || m.def; var r = await api('PATCH', '/api/admin/property-settings', b); if (!r.ok) throw new Error(errText(r, t('toast.fail'))); closeModal(); toast(t('toast.saved'), 'success'); await refresh(); };
  } else if (tl.kind === 'cs') {
    var cs = tl.cs;
    body = edEnglishNote() + '<div class="ed-group"><div class="ed-group-title">' + t('tl.group') + '</div>' + edField('f-tl-name', t('tl.label'), cs.section_name_en)
      + (tl.isRs ? '' : edField('f-tl-sub', t('tl.subtitle'), cs.subtitle_en, { hint: '' })) + edIconField('f-tl-icon', t('tl.icon'), cs.icon_class) + edColorField('f-tl-color', t('tl.colour'), cs.color_class) + '</div>'
      + '<div class="ed-group"><div class="ed-group-title">' + t('tl.photo') + '</div>' + edPhotoField('f-tl-img', '', t('tl.photoHint'), cs.tile_image_url) + '</div>';
    draftFn = function () {
      var rows = C.customSections.map(function (x) { return x.section_id === cs.section_id ? Object.assign({}, x, { section_name_en: edVal('f-tl-name').trim() || x.section_name_en, translated_name: null, subtitle_en: tl.isRs ? x.subtitle_en : edVal('f-tl-sub').trim(), icon_class: edVal('f-tl-icon'), color_class: edVal('f-tl-color'), tile_image_url: edVal('f-tl-img').trim() }) : x; });
      return { customSections: rows, highlight: key };
    };
    onSave = async function () {
      var b = { section_name_en: edVal('f-tl-name').trim() || cs.section_name_en, icon_class: edVal('f-tl-icon'), color_class: edVal('f-tl-color'), tile_image_url: edVal('f-tl-img').trim() || null };
      if (!tl.isRs) b.subtitle_en = edVal('f-tl-sub').trim();
      var r = await api('PUT', '/api/admin/custom-sections/' + cs.section_id, b); if (!r.ok) throw new Error(errText(r, t('toast.fail')));
      closeModal(); toast(t('toast.saved'), 'success'); await refresh();
    };
  } else if (tl.kind === 'info') { openInfoEditor(tl.id); return; }
  else if (tl.kind === 'map') {
    body = '<div class="ed-group">' + edSwitch('f-tl-map', t('tl.showMap'), t('tl.showMapSub'), C.property.show_hotel_map === 1) + '<div class="form-hint">' + t('tiles.mapNote') + '</div><div style="height:10px"></div></div>';
    draftFn = function () { return { property: { show_hotel_map: edChecked('f-tl-map') ? 1 : 0 }, highlight: key }; };
    onSave = async function () { var r = await api('PATCH', '/api/admin/property-settings', { show_hotel_map: edChecked('f-tl-map') ? 1 : 0 }); if (!r.ok) throw new Error(errText(r, t('toast.fail'))); closeModal(); toast(t('toast.saved'), 'success'); await refresh(); };
  } else {
    var isBeach = tl.kind === 'beach';
    body = '<div class="sc-note"><span>ℹ️</span><div>' + t(isBeach ? 'tiles.beachNote' : 'tiles.feedbackNote') + '</div><button class="btn btn-secondary btn-sm" type="button" onclick="go(\'' + (isBeach ? 'beach' : 'feedback') + '\')">' + t(isBeach ? 'sc.beach' : 'sc.feedback') + ' →</button></div>';
    openModal(t('tl.editTitle', { name: tileLabel(tl) }), body, { saveLabel: false, width: 560 }); return;
  }
  openModal(t('tl.editTitle', { name: tileLabel(tl) }), '<div class="ed-grid"><div class="ed-form">' + body + '</div>' + edPreviewPane([['home', t('tab.home')]]) + '</div>', { width: 1180, onSave: onSave });
  var upd = function () { edSchedule(); };
  edWatch(['f-tl-label', 'f-tl-name', 'f-tl-sub', 'f-tl-map'], upd); edWireIcon('f-tl-icon', upd); edWireColor('f-tl-color', upd); edWirePhoto('f-tl-img', upd);
  edStartPreview('home', function () { return pvHome(draftFn()); });
}
// ＋ New tile: a page with places (custom section) or an info page.
function openNewTile() {
  var body = '<div class="rm-choice-t" style="font-weight:600;margin-bottom:12px">' + t('new.q') + '</div><div class="rm-choice-b">'
    + '<button class="rm-choice-card" type="button" id="nt-cs"><span class="rm-choice-ico"><i class="fas fa-layer-group"></i></span><b>' + t('new.cs') + '</b><span>' + t('new.csSub') + '</span></button>'
    + '<button class="rm-choice-card" type="button" id="nt-info"><span class="rm-choice-ico"><i class="fas fa-circle-info"></i></span><b>' + t('new.info') + '</b><span>' + t('new.infoSub') + '</span></button></div>';
  openModal(t('new.title'), body, { saveLabel: false, width: 640 });
  document.getElementById('nt-info').addEventListener('click', function () { openInfoEditor(null); });
  document.getElementById('nt-cs').addEventListener('click', function () {
    var b2 = edEnglishNote() + '<div class="ed-group"><div class="ed-group-title">' + t('new.cs') + '</div>' + edField('f-nt-name', t('new.csName'), '', { ph: t('new.csNamePh') }) + edField('f-nt-sub', t('tl.subtitle'), '') + edIconField('f-nt-icon', t('tl.icon'), 'fas fa-star') + edColorField('f-nt-color', t('tl.colour'), '#6b1529') + '</div>'
      + '<div class="ed-group"><div class="ed-group-title">' + t('tl.photo') + '</div>' + edPhotoField('f-nt-img', '', t('tl.photoHint'), '') + '</div>';
    openModal(t('new.title'), '<div class="ed-grid"><div class="ed-form">' + b2 + '</div>' + edPreviewPane([['home', t('tab.home')]]) + '</div>', { width: 1180, saveLabel: t('act.create'), onSave: async function () {
      var name = edVal('f-nt-name').trim(); if (!name) { toast(t('ve.nameRequired'), 'error'); document.getElementById('f-nt-name').focus(); return; }
      var r = await api('POST', '/api/admin/custom-sections', { section_name_en: name, subtitle_en: edVal('f-nt-sub').trim(), icon_class: edVal('f-nt-icon'), color_class: edVal('f-nt-color'), tile_image_url: edVal('f-nt-img').trim() || null, is_visible: 1 });
      if (!r.ok) throw new Error(errText(r, t('toast.fail')));
      closeModal(); toast(t('new.created'), 'success'); await refresh({ force: true });
      var k = r.data.section_key || (r.data.section && r.data.section.section_key); var cs = k ? C.customSections.find(function (x) { return x.section_key === k; }) : C.customSections.find(function (x) { return x.section_name_en === name; });
      if (cs) openPage('cs:' + cs.section_key, { justCreated: true });
    } });
    var upd = function () { edSchedule(); };
    edWatch(['f-nt-name', 'f-nt-sub'], upd); edWireIcon('f-nt-icon', upd); edWireColor('f-nt-color', upd); edWirePhoto('f-nt-img', upd);
    edStartPreview('home', function () {
      var draft = { section_id: 'draft', section_key: 'draft-' + edSlug(edVal('f-nt-name')) || 'draft', section_name_en: edVal('f-nt-name').trim() || t('new.csName'), subtitle_en: edVal('f-nt-sub').trim(), icon_class: edVal('f-nt-icon'), color_class: edVal('f-nt-color'), tile_image_url: edVal('f-nt-img').trim(), is_visible: 1, display_order: 999 };
      return pvHome({ customSections: C.customSections.concat([draft]), highlight: 'cs:' + draft.section_key });
    });
  });
}

/* ---- interface language ---- */
function setLang(lang) {
  LANG = lang === 'ar' ? 'ar' : 'en';
  document.body.classList.toggle('lang-ar', LANG === 'ar');
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem('op_admin_lang', LANG); } catch (e) {}
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.dataset.i18nTitle); });
  var ci = document.getElementById('cmdk-in'); if (ci) ci.placeholder = t('cmdk.ph');
  var lb = document.getElementById('tb-lang'); if (lb) { lb.textContent = t('lang.btn'); lb.title = t('lang.switch'); }
  if (C) { buildSidebar(); if (V3.screen === 'page') openPage(V3.key, { keepPhone: true }); else if (V3.screen) go(V3.screen, { tab: V3.tab, page: V3.key }); }
}

/* ---- boot ---- */
function showBootSkeleton() {
  document.getElementById('sc-head').innerHTML = '<div class="sc-head-row"><div class="sk" style="width:52px;height:52px"></div><div class="sc-titles"><div class="sk sk-line" style="width:40%;height:24px"></div><div class="sk sk-line" style="width:70%"></div></div></div><div style="height:16px"></div>';
  document.getElementById('sc-stage').innerHTML = '<div class="hm-grid"><div><div class="sk sk-block"></div><div class="sk sk-block"></div><div class="sk sk-block"></div></div><div><div class="sk" style="height:520px;border-radius:38px"></div></div></div>';
  document.getElementById('sb-nav').innerHTML = '<div style="padding:10px">' + [70, 55, 65, 50, 60, 45].map(function (w) { return '<div class="sk sk-line" style="width:' + w + '%;background:rgba(255,255,255,.08)"></div>'; }).join('') + '</div>';
}
function showBootError(msg) {
  document.getElementById('sc-head').innerHTML = '';
  document.getElementById('sc-stage').innerHTML = '<div class="err-card"><div class="ico">⚠️</div><h2>' + t('err.loadTitle') + '</h2><p>' + edEsc(msg || t('err.loadBody')) + '</p><button class="btn btn-primary" type="button" onclick="boot()">' + t('act.retry') + '</button></div>';
}
async function boot() {
  if (!authInit()) return;
  var savedLang = 'en'; try { savedLang = localStorage.getItem('op_admin_lang') || 'en'; } catch (e) {}
  LANG = savedLang === 'ar' ? 'ar' : 'en'; document.body.classList.toggle('lang-ar', LANG === 'ar'); document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
  var lb = document.getElementById('tb-lang'); lb.textContent = t('lang.btn'); lb.title = t('lang.switch');
  document.getElementById('cmdk-in').placeholder = t('cmdk.ph');
  var u = AUTH.user || {}, nm = u.first_name ? (u.first_name + ' ' + (u.last_name || '')).trim() : (u.email || '');
  document.getElementById('sb-user-name').textContent = nm; document.getElementById('sb-avatar').textContent = (nm || '?').charAt(0).toUpperCase();
  showBootSkeleton();
  try { await loadContent(); } catch (e) { showBootError(e.message); return; }
  if (C.property.name) document.getElementById('sb-hotel-name').textContent = C.property.name;
  if (C.property.brand_logo_url) document.getElementById('sb-logo').innerHTML = '<img src="' + edAttr(C.property.brand_logo_url) + '" alt="">';
  document.getElementById('sc-stage').innerHTML = '';
  buildSidebar();
  routeFromHash();
}
(function wireShell() {
  document.getElementById('tb-menu').addEventListener('click', function () { toggleSidebar(); });
  document.getElementById('sb-overlay').addEventListener('click', function () { toggleSidebar(false); });
  document.getElementById('tb-search').addEventListener('click', openCmdk);
  document.getElementById('tb-help').addEventListener('click', openHelp);
  document.getElementById('tb-lang').addEventListener('click', function () { setLang(LANG === 'ar' ? 'en' : 'ar'); toast(t(LANG === 'ar' ? 'toast.langAr' : 'toast.langEn'), 'success'); });
  document.getElementById('sb-open-guest').addEventListener('click', openGuest);
  document.getElementById('sb-logout').addEventListener('click', signOut);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (document.getElementById('cmdk').classList.contains('open')) closeCmdk(); else if (document.body.classList.contains('sb-open')) toggleSidebar(false); else if (modalOpen() && !document.getElementById('v3-confirm')) closeModal(); }
  });
  document.addEventListener('DOMContentLoaded', boot);
})();

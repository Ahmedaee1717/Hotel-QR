/* ═══════════════════════════════════════════════════════════════════════════
   Screens: a guest page (Dining, Events, Spa, Services, each custom tile) with its
   venue editor and menu pages; Room service; Info pages; Feedback; the embedded
   classic screens; Help; and the Ctrl+K palette. Needs app.js (data, router).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ---- THE PAGE SCREEN: a guest page = places beside the live phone ---- */
var PG = { highlight: null };
function openPage(key, opts) {
  opts = opts || {};
  var tl = tileByKey(key); if (!tl || !(tl.kind === 'type' || (tl.kind === 'cs' && !tl.isRs))) { go('home'); return; }
  toggleSidebar(false); closeModal();
  var same = V3.screen === 'page' && V3.key === key;
  if (!same && !opts.keepPhone) edUnmountPhones();
  V3.screen = 'page'; V3.key = key; V3.tab = null;
  stageReset(); setActions(''); setHash(hashFor('page', { key: key }));
  var name = tileLabel(tl), v = vocab(key), offs = offeringsFor(key), act = activeOf(offs);
  setCrumbs([{ label: t('crumb.home'), go: function () { go('home'); } }, name]);
  var chips = ['<span class="chip">' + edEsc(t('tiles.count', { n: act.length, what: act.length === 1 ? v.one : v.many })) + '</span>', tl.visible ? '<span class="chip ok">' + t('chip.visible') + '</span>' : '<span class="chip off">' + t('chip.hidden') + '</span>', '<span class="chip gold">' + t('chip.langs') + '</span>'];
  var actions = ['<button class="btn btn-secondary btn-sm" type="button" onclick="openTileLook(\'' + edAttr(key) + '\')">' + t('act.editTile') + '</button>', '<button class="btn btn-secondary btn-sm" type="button" onclick="openGuest()">' + t('act.openGuest') + '</button>'];
  if (tl.kind === 'cs') actions.push('<button class="btn btn-secondary btn-sm btn-quiet-danger" type="button" onclick="deleteTile(\'' + edAttr(key) + '\')">' + t('act.deleteTile') + '</button>');
  renderHead({ icon: tl.icon, thumb: tl.img, title: name, caption: t('cap.page', { name: edEsc(name) }) + (tl.visible ? '' : ' <b style="color:var(--amber-text)">' + t('cap.pageHidden') + '</b>'), chips: chips, actions: actions });
  renderPageScreen(tl, opts);
  markSidebar();
  try { document.getElementById('content').scrollTop = 0; } catch (e) {}
}
function venueChips(o, tl) {
  var c = [];
  if (!o.images.length) c.push('<span class="chip warn">' + t('chip.noPhoto') + '</span>');
  if (o.opening_hours) c.push('<span class="chip" dir="ltr">🕒 ' + edEsc(o.opening_hours) + '</span>');
  if (o.price != null && o.price !== '' && +o.price > 0) c.push('<span class="chip">' + edEsc((+o.price).toLocaleString()) + ' ' + edEsc(o.currency || 'EGP') + '</span>');
  if ((tl.type === 'restaurant' && o.enable_booking === 1) || (tl.type !== 'restaurant' && o.requires_booking === 1)) c.push('<span class="chip ok">' + t('chip.booking') + '</span>');
  if (tl.type === 'restaurant') { var mp = +o.menu_pages || 0; c.push(o.offering_id === MAIN_RESTAURANT_ID && !mp ? '<span class="chip">' + t('chip.elkasr') + '</span>' : mp ? '<span class="chip ok">📄 ' + t('chip.menuPages', { n: mp }) + '</span>' : '<span class="chip warn">' + t('chip.noMenu') + '</span>'); }
  if (tl.type === 'event' && o.event_date) c.push('<span class="chip' + (new Date(o.event_date + 'T23:59:59') < new Date() ? ' warn' : '') + '">📅 ' + edEsc(o.event_date) + (o.event_start_time ? ' · ' + edEsc(o.event_start_time) : '') + (new Date(o.event_date + 'T23:59:59') < new Date() ? ' · ' + t('chip.past') : '') + '</span>');
  if (o.is_featured === 1) c.push('<span class="chip gold">' + t('chip.featured') + '</span>');
  if (o.status !== 'active') c.push('<span class="chip off">' + t('chip.hidden') + '</span>');
  return c.join('');
}
function renderPageScreen(tl, opts) {
  opts = opts || {};
  var w = stageHost('pg-wrap'), v = vocab(tl.key), offs = offeringsFor(tl.key), name = tileLabel(tl);
  if (!w.firstChild) w.innerHTML = '<div class="pg-grid"><div class="pg-cards" id="pg-cards-host"></div><div id="pg-phone-host"></div></div>';
  var note = '';
  if (tl.type === 'activity') note = '<div class="sc-note"><span>ℹ️</span><div>' + t('cap.experiences') + '</div><a class="btn btn-secondary btn-sm" href="/admin/dashboard#activities" target="_blank" rel="noopener">' + t('sc.classic') + ' ↗</a></div>';
  if (opts.justCreated) note += '<div class="sc-note"><span>🎉</span><div>' + t('new.created') + '</div></div>';
  var cards = offs.length ? offs.map(function (o, i) {
    var sub = o.tile_subtitle || edPlain(o.short_description_en).slice(0, 110);
    return '<div class="pg-card' + (o.status === 'active' ? '' : ' off') + (PG.highlight === o.offering_id ? ' flash' : '') + '" data-oid="' + o.offering_id + '"><div class="pg-card-hd">'
      + '<div class="pg-card-thumb">' + (o.images[0] ? '<img src="' + edAttr(o.images[0]) + '" alt="">' : edIconHtml(tl.icon)) + '</div>'
      + '<div class="pg-card-main"><div class="pg-card-title">' + edEsc(o.title_en) + '</div>' + (sub ? '<div class="pg-card-sub">' + edEsc(sub) + '</div>' : '') + '<div class="pg-chips">' + venueChips(o, tl) + '</div></div>'
      + '<div class="pg-card-meta"><button class="ed-mini" type="button" data-pg="up" data-id="' + o.offering_id + '"' + (i === 0 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveUp')) + '">↑</button><button class="ed-mini" type="button" data-pg="down" data-id="' + o.offering_id + '"' + (i === offs.length - 1 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveDown')) + '">↓</button>'
      + '<button class="ed-mini" type="button" data-pg="vis" data-id="' + o.offering_id + '" title="' + edAttr(o.status === 'active' ? t('act.hide') : t('act.show')) + '">' + (o.status === 'active' ? '👁' : '🚫') + '</button>'
      + '<button class="ed-mini" type="button" data-pg="edit" data-id="' + o.offering_id + '" title="' + edAttr(t('act.edit')) + '">✎</button>'
      + '<button class="ed-mini danger" type="button" data-pg="del" data-id="' + o.offering_id + '" title="' + edAttr(t('pg.delete')) + '">🗑</button></div></div></div>';
  }).join('') : (tl.type === 'activity' ? '' : '<div class="pg-empty"><b>' + t('pg.empty') + '</b>' + t('pg.emptySub', { name: edEsc(name), one: edEsc(v.one) }) + '</div>');
  var host = document.getElementById('pg-cards-host');
  host.innerHTML = note + cards + (tl.type === 'activity' ? '' : '<button class="pg-add" type="button" data-pg="add">' + edEsc(t('pg.add', { one: v.one })) + '</button><div class="pg-legend"><span>' + edEsc(t('pg.legend', { many: v.many })) + '</span></div>');
  host.querySelectorAll('[data-pg]').forEach(function (b) { b.addEventListener('click', function () { pgAction(b.dataset.pg, b.dataset.id ? +b.dataset.id : null, tl); }); });
  edPhone('pg-phone-host', [['category', t('tab.page')], ['home', t('tab.homeTile')]], 'category', function (tab) { return tab === 'home' ? pvHome({ highlight: tl.key }) : pvCategory(tl.key, null, PG.highlight); });
}
async function pgAction(act, id, tl) {
  var v = vocab(tl.key);
  if (act === 'add') { openVenueEditor(tl.key, null); return; }
  if (act === 'edit') { openVenueEditor(tl.key, id); return; }
  var o = C.offerings.find(function (x) { return x.offering_id === id; }); if (!o) return;
  PG.highlight = id;
  if (act === 'del') {
    if (!(await v3Confirm(t('pg.confirmDelete', { name: o.title_en })))) return;
    var d = await api('DELETE', '/api/admin/offerings/' + id); if (!d.ok) { toast(errText(d, t('toast.deleteFail')), 'error'); return; }
    toast(t('toast.deleted'), 'success'); await refresh(); return;
  }
  if (act === 'vis') {
    var r = await api('PATCH', '/api/admin/offerings/' + id, { status: o.status === 'active' ? 'hidden' : 'active' }); if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
    toast(o.status === 'active' ? t('toast.hidden') : t('toast.shown'), 'success'); await refresh(); return;
  }
  if (act === 'up' || act === 'down') {
    var list = offeringsFor(tl.key), i = list.findIndex(function (x) { return x.offering_id === id; }), j = act === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return;
    var ids = list.map(function (x) { return x.offering_id; }); var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    var r2 = await api('POST', '/api/admin/offerings/reorder', { ids: ids }); if (!r2.ok) { toast(errText(r2, t('toast.orderFail')), 'error'); return; }
    toast(t('toast.order'), 'success'); await refresh();
  }
}
async function deleteTile(key) {
  var tl = tileByKey(key); if (!tl || tl.kind !== 'cs') return;
  var n = offeringsFor(key).length, name = tileLabel(tl);
  if (!(await v3Confirm(t('pg.deleteTileConfirm', { name: name })))) return;
  var r = await api('DELETE', '/api/admin/custom-sections/' + tl.id);
  if (r.status === 409 || (!r.ok && n)) { if (!(await v3Confirm(t('pg.deleteTileForce', { name: name, n: n })))) return; r = await api('DELETE', '/api/admin/custom-sections/' + tl.id + '?force=1'); }
  if (!r.ok) { toast(errText(r, t('toast.deleteFail')), 'error'); return; }
  toast(t('pg.tileDeleted'), 'success'); V3.screen = null; await refresh({ force: true }); go('hotel', { tab: 'tiles' });
}

/* ---- VENUE EDITOR: two columns, the phone pinned on the venue sheet ---- */
var VE = { key: null, id: null, menus: null };
function veDraft(tl, cur) {
  var typ = tl.type || 'custom', price = edVal('f-ve-price').trim();
  var d = Object.assign({}, cur || {}, {
    offering_id: cur ? cur.offering_id : 'draft', offering_type: cur ? cur.offering_type : (tl.kind === 'cs' ? 'custom' : typ), custom_section_key: tl.kind === 'cs' ? tl.sectionKey : (cur ? cur.custom_section_key : null),
    title_en: edVal('f-ve-name').trim() || t('ve.new', { one: vocab(tl.key).one }), tile_subtitle: edVal('f-ve-sub').trim(), short_description_en: edVal('f-ve-sub').trim() || (cur ? cur.short_description_en : ''), full_description_en: edVal('f-ve-about'),
    images: edPhotosGet('f-ve-photos'), opening_hours: edVal('f-ve-hours').trim(), location: edVal('f-ve-loc').trim(),
    price: edChecked('f-ve-free') || !price ? null : +price, currency: 'EGP', status: edChecked('f-ve-visible') ? 'active' : 'hidden', is_featured: edChecked('f-ve-featured') ? 1 : 0,
  });
  if (typ === 'restaurant') { d.cuisine_type = edVal('f-ve-cuisine').trim(); d.dress_code = edVal('f-ve-dress').trim(); d.enable_booking = edChecked('f-ve-book') ? 1 : 0; }
  else d.requires_booking = edChecked('f-ve-book') ? 1 : 0;
  if (typ === 'event') { d.event_date = edVal('f-ve-date'); d.event_start_time = edVal('f-ve-start'); d.event_end_time = edVal('f-ve-end'); }
  if (typ === 'spa' || typ === 'service' || typ === 'custom') { var m = parseInt(edVal('f-ve-dur'), 10); d.duration_minutes = isNaN(m) ? null : m; }
  if (VE.menus) d.menus = VE.menus.filter(function (m) { return m.page_url; }).map(function (m) { return { page_url: m.page_url, page_no: m.page_no }; });
  return d;
}
function openVenueEditor(key, id) {
  var tl = tileByKey(key); if (!tl) return;
  var cur = id ? C.offerings.find(function (o) { return o.offering_id === id; }) : null, typ = tl.type || 'custom', v = vocab(key);
  VE.key = key; VE.id = id || null; VE.menus = null; PG.highlight = id || null;
  var o = cur || { images: [], status: 'active' };
  var isRest = typ === 'restaurant', isEvent = typ === 'event';
  var body = edEnglishNote()
    + '<div class="ed-group"><div class="ed-group-title">' + t('ve.photos') + ' <span class="ed-hint">' + t('ve.photosHint') + '</span></div>' + edPhotosField('f-ve-photos', o.images, 12) + '</div>'
    + '<div class="ed-group"><div class="ed-group-title">' + t('ve.basics') + '</div>' + edField('f-ve-name', t('ve.name'), o.title_en) + edField('f-ve-sub', t('ve.oneLine'), o.tile_subtitle || o.short_description_en, { hint: t('ve.oneLineHint') })
    + '<div class="form-group"><label class="form-label">' + t('ve.about') + ' <span class="ed-hint">' + t('ve.aboutHint') + '</span></label>' + edRichField('f-ve-about', '') + '</div></div>'
    + '<div class="ed-group"><div class="ed-group-title">' + t('ve.details') + '</div>'
    + (isEvent ? '' : '<div class="form-row">' + '<div>' + edField('f-ve-hours', t('ve.hours'), o.opening_hours, { ph: t('ve.hoursPh') }) + '</div><div>' + edField('f-ve-loc', t('ve.location'), o.location, { ph: t('ve.locationPh') }) + '</div></div>')
    + (isEvent ? '<div class="form-row"><div>' + edField('f-ve-loc', t('ve.location'), o.location, { ph: t('ve.locationPh') }) + '</div><div>' + edField('f-ve-hours', t('ve.hours'), o.opening_hours, { ph: t('ve.hoursPh') }) + '</div></div>' : '')
    + '<div class="form-row"><div>' + edField('f-ve-price', t('ve.price'), o.price == null ? '' : o.price, { type: 'number', step: '1', suffix: t('egp') }) + '</div><div style="padding-top:22px">' + edSwitch('f-ve-free', t('ve.free'), t('ve.freeSub'), !(o.price > 0)) + '</div></div>'
    + (isRest ? '<div class="form-row"><div>' + edField('f-ve-cuisine', t('ve.cuisine'), o.cuisine_type, { ph: t('ve.cuisinePh') }) + '</div><div>' + edField('f-ve-dress', t('ve.dress'), o.dress_code, { ph: t('ve.dressPh') }) + '</div></div>' : '')
    + (!isRest && !isEvent ? edField('f-ve-dur', t('ve.duration'), o.duration_minutes, { type: 'number', suffix: t('ve.minutes') }) : '')
    + (isEvent ? '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr"><div>' + edField('f-ve-date', t('ve.date'), o.event_date, { type: 'date' }) + '</div><div>' + edField('f-ve-start', t('ve.start'), o.event_start_time, { type: 'time' }) + '</div><div>' + edField('f-ve-end', t('ve.end'), o.event_end_time, { type: 'time' }) + '</div></div>' : '')
    + edSwitch('f-ve-book', isRest ? t('ve.bookTable') : t('ve.bookReq'), isRest ? t('ve.bookTableSub') : t('ve.bookReqSub'), isRest ? o.enable_booking === 1 : o.requires_booking === 1) + '<div style="height:6px"></div></div>'
    + (isRest ? '<div class="ed-group"><div class="ed-group-title">' + t('ve.menus') + ' <span class="ed-hint">' + t('ve.menusHint') + '</span></div><div id="ve-menus"></div></div>' : '')
    + '<details class="ed-adv"><summary>' + t('ve.advanced') + '</summary><div class="ed-group">' + edSwitch('f-ve-visible', t('ve.visible'), '', o.status === 'active') + edSwitch('f-ve-featured', t('ve.featured'), '', o.is_featured === 1) + '<div style="height:6px"></div></div></details>';
  openModal(cur ? t('ve.edit', { name: cur.title_en }) : t('ve.new', { one: v.one }), '<div class="ed-grid"><div class="ed-form">' + body + '</div>' + edPreviewPane([['offering', t('tab.sheet')], ['category', t('tab.page')]]) + '</div>', {
    width: 1180, onSave: async function () {
      var name = edVal('f-ve-name').trim(); if (!name) { toast(t('ve.nameRequired'), 'error'); document.getElementById('f-ve-name').focus(); return; }
      var d = veDraft(tl, cur), b = { title_en: d.title_en, tile_subtitle: d.tile_subtitle, short_description_en: d.tile_subtitle || d.short_description_en || '', full_description_en: d.full_description_en, images: d.images, opening_hours: d.opening_hours, location: d.location, price: d.price, currency: 'EGP', status: d.status, is_featured: d.is_featured };
      if (isRest) { b.cuisine_type = d.cuisine_type; b.dress_code = d.dress_code; b.enable_booking = d.enable_booking; } else b.requires_booking = d.requires_booking;
      if (isEvent) { b.event_date = d.event_date || null; b.event_start_time = d.event_start_time || null; b.event_end_time = d.event_end_time || null; }
      if (d.duration_minutes !== undefined) b.duration_minutes = d.duration_minutes;
      var r;
      if (cur) r = await api('PATCH', '/api/admin/offerings/' + cur.offering_id, b);
      else { b.offering_type = tl.kind === 'cs' ? 'custom' : typ; b.custom_section_key = tl.kind === 'cs' ? tl.sectionKey : null; r = await api('POST', '/api/admin/offerings', b); }
      if (!r.ok) throw new Error(errText(r, t('toast.fail')));
      var newId = !cur && (r.data.offering_id || (r.data.offering && r.data.offering.offering_id) || r.data.id);
      closeModal(); toast(cur ? t('toast.saved') : t('ve.created'), 'success');
      PG.highlight = cur ? cur.offering_id : (newId ? +newId : null);
      await refresh();
    }, onClose: function () { VE.id = null; VE.menus = null; }
  });
  var upd = function () { edSchedule(); };
  edWatch(['f-ve-name', 'f-ve-sub', 'f-ve-hours', 'f-ve-loc', 'f-ve-price', 'f-ve-free', 'f-ve-cuisine', 'f-ve-dress', 'f-ve-dur', 'f-ve-date', 'f-ve-start', 'f-ve-end', 'f-ve-book', 'f-ve-visible', 'f-ve-featured'], upd);
  edWirePhotos('f-ve-photos', upd); edWireRich('f-ve-about', o.full_description_en, upd);
  var freeEl = document.getElementById('f-ve-free'), priceEl = document.getElementById('f-ve-price');
  var syncFree = function () { priceEl.disabled = freeEl.checked; }; freeEl.addEventListener('change', syncFree); priceEl.addEventListener('input', function () { if (priceEl.value && +priceEl.value > 0) { freeEl.checked = false; } }); syncFree();
  if (isRest) renderMenus(cur);
  edStartPreview('offering', function (tab) { var d = veDraft(tl, cur); return tab === 'category' ? pvCategory(key, d, d.offering_id) : pvOffering(d); });
}
/* menu pages: photos of the printed menu, one row per page */
async function renderMenus(cur) {
  var host = document.getElementById('ve-menus'); if (!host) return;
  if (!cur) { host.innerHTML = '<div class="ed-empty">' + t('ve.menusSaveFirst') + '</div>'; return; }
  if (cur.offering_id === MAIN_RESTAURANT_ID) host.insertAdjacentHTML('beforeend', '<div class="sc-note"><span>🍽</span><div>' + t('ve.elkasrNote') + '</div><button class="btn btn-secondary btn-sm" type="button" onclick="closeModal();go(\'elkasr\')">' + t('sc.elkasr') + ' →</button></div>');
  if (!VE.menus) {
    var r = await api('GET', '/api/admin/offerings/' + cur.offering_id + '/menus');
    if (!document.getElementById('ve-menus')) return;
    VE.menus = r.ok ? (r.data.menus || r.data.data || (Array.isArray(r.data) ? r.data : [])) : [];
  }
  var pages = VE.menus.slice().sort(function (a, b) { return ((a.page_no || 0) - (b.page_no || 0)) || (a.menu_id - b.menu_id); }), withUrl = pages.filter(function (m) { return m.page_url; });
  var grid = document.getElementById('ve-menus-grid') || document.createElement('div'); grid.id = 've-menus-grid';
  grid.innerHTML = (pages.length ? '<div class="mn-grid">' + pages.map(function (m, i) {
    return '<div class="mn-page">' + (m.page_url ? '<img src="' + edAttr(m.page_url) + '" alt=""><span class="mn-no">' + (withUrl.indexOf(m) + 1) + '</span>' : '<div class="mn-legacy">' + t('ve.menuLegacy') + '</div>')
      + '<div class="ed-ph-bar"><button class="ed-mini" type="button" data-mn="up" data-id="' + m.menu_id + '"' + (i === 0 || !m.page_url ? ' disabled' : '') + '>↑</button><button class="ed-mini" type="button" data-mn="down" data-id="' + m.menu_id + '"' + (i === pages.length - 1 || !m.page_url ? ' disabled' : '') + '>↓</button><button class="ed-mini danger" type="button" data-mn="del" data-id="' + m.menu_id + '">✕</button></div></div>';
  }).join('') + '</div>' : '<div class="ed-empty">' + t('ve.menusEmpty') + '</div>')
    + '<div class="ed-drop compact" id="ve-mn-drop" tabindex="0" role="button" data-replace=""><div class="ed-drop-ph"><b>' + t('ve.menusUpload') + '</b> ' + t('ph.orClick') + '<small>' + t('ve.menusUploadHint') + '</small></div><div class="ed-drop-busy"><span>' + t('ph.uploading') + '</span><div class="ed-prog"><div id="ve-mn-prog"></div></div></div></div>'
    + '<input type="file" id="ve-mn-file" accept="image/jpeg,image/png,image/webp" multiple hidden><div style="height:10px"></div>';
  if (!grid.parentElement) host.appendChild(grid);
  var drop = document.getElementById('ve-mn-drop'), file = document.getElementById('ve-mn-file');
  async function upload(files) {
    files = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type) && f.size <= UPLOAD_MAX_MB * 1024 * 1024; });
    if (!files.length) { toast(t('up.badType'), 'error'); return; }
    var fd = new FormData(); files.forEach(function (f) { fd.append('files[]', f, f.name); });
    drop.classList.add('busy');
    var r = await api('POST', '/api/admin/offerings/' + cur.offering_id + '/menus/pages', fd);
    drop.classList.remove('busy');
    if (!r.ok) { toast(errText(r, t('up.failed')), 'error'); return; }
    toast(t('ve.menuPageAdded'), 'success'); VE.menus = null; await renderMenus(cur); edSchedule(0);
  }
  drop.addEventListener('click', function () { file.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); });
  file.addEventListener('change', function () { if (file.files.length) upload(file.files); file.value = ''; });
  grid.querySelectorAll('[data-mn]').forEach(function (b) {
    b.addEventListener('click', async function () {
      var id = +b.dataset.id, act = b.dataset.mn;
      if (act === 'del') {
        var r = await api('DELETE', '/api/admin/menus/' + id); if (!r.ok) { toast(errText(r, t('toast.deleteFail')), 'error'); return; }
        toast(t('ve.menuDeleted'), 'success');
      } else {
        var ids = pages.map(function (m) { return m.menu_id; }), i = ids.indexOf(id), j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ids.length) return;
        var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
        var r2 = await api('POST', '/api/admin/offerings/' + cur.offering_id + '/menus/reorder', { ids: ids }); if (!r2.ok) { toast(errText(r2, t('toast.orderFail')), 'error'); return; }
      }
      VE.menus = null; await renderMenus(cur); edSchedule(0);
    });
  });
}

/* ---- ROOM SERVICE: intro + hours + photo, then the menu items by category ---- */
function rsCategoryLabel(cat) { var c = (C.roomService.categories || []).find(function (x) { return x.key === cat; }); if (c) return c.label; return String(cat || t('rs.uncategorised')).replace(/_\d+$/, '').replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }
function renderRoomService(keepPhone) {
  var host = stageHost('rs-wrap'), rs = C.roomService, off = rs.offering;
  if (!off) {
    host.innerHTML = '<div class="pg-empty"><b>' + t('rs.notSetUp') + '</b>' + t('rs.notSetUpSub') + '<div style="margin-top:12px"><a class="btn btn-secondary btn-sm" href="/admin/dashboard#restaurants" target="_blank" rel="noopener">' + t('sc.classic') + ' ↗</a></div></div>';
    return;
  }
  var cs = C.customSections.find(function (x) { return x.section_key === 'room-service'; }) || {};
  var groups = {}, order = [];
  rs.items.forEach(function (it) { var k = it.category || ''; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(it); });
  host.innerHTML = '<div class="pg-grid"><div class="pg-cards">'
    + '<div class="ed-note">✍️ ' + t('ed.englishNote') + '</div>'
    + '<div class="ed-group-title">' + t('rs.intro') + '</div><div class="rs-intro">'
    + '<div class="wide">' + edField('f-rs-intro', t('rs.introText'), off.short_description_en, { ph: t('rs.introPh') }) + '</div>'
    + '<div>' + edField('f-rs-hours', t('rs.hours'), off.opening_hours, { ph: t('rs.hoursPh') }) + '</div><div>' + edPhotoField('f-rs-img', t('rs.photo'), '', off.images[0], true) + '</div>'
    + '<div class="rs-intro-actions"><button class="btn btn-primary btn-sm" type="button" id="rs-save">' + t('act.saveChanges') + '</button></div></div>'
    + '<div class="ed-group-title" style="display:flex;align-items:center;gap:10px">' + t('rs.items') + ' <span class="ed-hint">' + rs.items.length + '</span><button class="btn btn-secondary btn-sm" type="button" style="margin-left:auto" data-rs="add">' + t('rs.addItem') + '</button></div>'
    + (order.length ? order.map(function (k) {
      return '<div class="rs-cat"><div class="rs-cat-hd">' + edEsc(rsCategoryLabel(k)) + '<span class="chip">' + groups[k].length + '</span></div>' + groups[k].map(function (it) {
        return '<div class="rs-item' + (it.is_available === 0 ? ' off' : '') + '"><div class="rs-ico">' + (it.image_url ? '<img src="' + edAttr(it.image_url) + '" alt="">' : '<i class="fas fa-utensils"></i>') + '</div>'
          + '<div class="rs-main"><div class="rs-title">' + (it.is_premium === 1 ? '★ ' : '') + edEsc(it.item_name) + (it.is_available === 0 ? ' <span class="chip off">' + t('rs.unavailable') + '</span>' : '') + '</div>' + (it.description ? '<div class="rs-sub">' + edEsc(it.description) + '</div>' : '') + '</div>'
          + '<span class="rs-price">' + edEsc((+it.cost_to_hotel || 0).toLocaleString()) + ' ' + t('egp') + '</span>'
          + '<button class="ed-mini" type="button" data-rs="vis" data-id="' + it.item_id + '" title="' + edAttr(it.is_available === 0 ? t('act.show') : t('act.hide')) + '">' + (it.is_available === 0 ? '🚫' : '👁') + '</button>'
          + '<button class="ed-mini" type="button" data-rs="edit" data-id="' + it.item_id + '" title="' + edAttr(t('act.edit')) + '">✎</button><button class="ed-mini danger" type="button" data-rs="del" data-id="' + it.item_id + '" title="' + edAttr(t('act.delete')) + '">🗑</button></div>';
      }).join('') + '</div>';
    }).join('') : '<div class="pg-empty"><b>' + t('rs.noItems') + '</b></div>')
    + '<button class="pg-add" type="button" data-rs="add">' + t('rs.addItem') + '</button>'
    + '</div><div id="rs-phone-host"></div></div>';
  edWirePhoto('f-rs-img', null);
  document.getElementById('rs-save').addEventListener('click', async function () {
    var btn = this; btn.disabled = true;
    var img = edVal('f-rs-img').trim();
    var r = await api('PATCH', '/api/admin/room-service', { short_description_en: edVal('f-rs-intro').trim(), opening_hours: edVal('f-rs-hours').trim(), images: img ? [img] : [] }); btn.disabled = false;
    if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
    toast(t('rs.saved'), 'success'); await refresh(); rsReloadPhone();
  });
  host.querySelectorAll('[data-rs]').forEach(function (b) { b.addEventListener('click', function () { rsAction(b.dataset.rs, b.dataset.id ? +b.dataset.id : null); }); });
  edPhone('rs-phone-host', [['room-service', t('sc.roomservice')], ['home', t('tab.homeTile')]], 'room-service', function (tab) { return tab === 'home' ? pvHome({ highlight: 'cs:room-service' }) : { type: 'op-preview', view: 'room-service' }; }, t('rs.pvNote'));
}
function rsReloadPhone() { var f = document.getElementById('ed-pv-frame'); if (f) { ED.ready = false; f.src = f.src; } }
async function rsAction(act, id) {
  if (act === 'add') { openRsItemEditor(null); return; }
  var it = C.roomService.items.find(function (x) { return x.item_id === id; }); if (!it) return;
  if (act === 'edit') { openRsItemEditor(it); return; }
  if (act === 'del') {
    if (!(await v3Confirm(t('rs.deleteConfirm', { name: it.item_name })))) return;
    var d = await api('DELETE', '/api/admin/room-service/items/' + id); if (!d.ok) { toast(errText(d, t('toast.deleteFail')), 'error'); return; }
    toast(t('toast.deleted'), 'success'); await refresh(); rsReloadPhone(); return;
  }
  if (act === 'vis') {
    var r = await api('PATCH', '/api/admin/room-service/items/' + id, { is_available: it.is_available === 0 ? 1 : 0 }); if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
    toast(it.is_available === 0 ? t('toast.shown') : t('toast.hidden'), 'success'); await refresh(); rsReloadPhone();
  }
}
function openRsItemEditor(it) {
  var cats = (C.roomService.categories || []).slice(); C.roomService.items.forEach(function (x) { if (x.category && !cats.some(function (c) { return c.key === x.category; })) cats.push({ key: x.category, label: rsCategoryLabel(x.category) }); });
  var cur = it || {}, curLabel = cur.category ? rsCategoryLabel(cur.category) : '';
  var body = edEnglishNote() + '<div class="ed-group"><div class="ed-group-title">' + t('rs.item') + '</div>' + edField('f-ri-name', t('rs.itemName'), cur.item_name) + edField('f-ri-desc', t('rs.itemDesc'), cur.description, { textarea: true, rows: 2 })
    + '<div class="form-row"><div>' + edField('f-ri-price', t('rs.itemPrice'), cur.cost_to_hotel, { type: 'number', step: '1', suffix: t('egp') }) + '</div><div>' + edField('f-ri-cat', t('rs.category'), curLabel, { ph: t('rs.categoryPh'), hint: t('rs.categoryHint'), list: 'f-ri-cats' }) + '<datalist id="f-ri-cats">' + cats.map(function (c) { return '<option value="' + edAttr(c.label) + '">'; }).join('') + '</datalist></div></div>'
    + edSwitch('f-ri-avail', t('rs.available'), t('rs.availableSub'), cur.is_available !== 0) + edSwitch('f-ri-prem', t('rs.premium'), '', cur.is_premium === 1) + '<div style="height:6px"></div></div>'
    + '<div class="ed-group"><div class="ed-group-title">' + t('rs.photo') + '</div>' + edPhotoField('f-ri-img', '', '', cur.image_url, true) + '</div>';
  openModal(it ? t('rs.editItem', { name: it.item_name }) : t('rs.newItem'), '<div class="ed-form" style="max-width:640px">' + body + '</div>', { width: 720, onSave: async function () {
    var name = edVal('f-ri-name').trim(); if (!name) { toast(t('ve.nameRequired'), 'error'); document.getElementById('f-ri-name').focus(); return; }
    var lab = edVal('f-ri-cat').trim(), known = cats.find(function (c) { return c.label.toLowerCase() === lab.toLowerCase(); });
    var b = { item_name: name, description: edVal('f-ri-desc').trim(), cost_to_hotel: +edVal('f-ri-price') || 0, category: known ? known.key : (edSlug(lab).replace(/-/g, '_') || 'other'), is_available: edChecked('f-ri-avail') ? 1 : 0, is_premium: edChecked('f-ri-prem') ? 1 : 0, image_url: edVal('f-ri-img').trim() || null };
    var r = it ? await api('PATCH', '/api/admin/room-service/items/' + it.item_id, b) : await api('POST', '/api/admin/room-service/items', b);
    if (!r.ok) throw new Error(errText(r, t('toast.fail')));
    closeModal(); toast(t('rs.saved'), 'success'); await refresh(); rsReloadPhone();
  } });
  edWirePhoto('f-ri-img', null);
}

/* ---- INFO PAGES: list + editor with the phone on the info sheet ---- */
var INFO_THEMES = ['blue', 'green', 'purple', 'orange', 'red', 'teal', 'gold'];
function renderInfoList(openKey) {
  var host = stageHost('info-wrap'), pages = C.infoPages.slice().sort(function (a, b) { return ((a.display_order || 0) - (b.display_order || 0)) || (a.page_id - b.page_id); });
  host.innerHTML = '<div class="pg-grid"><div class="pg-cards">' + (pages.length ? pages.map(function (pg, i) {
    var words = edPlain(pg.content_en).split(/\s+/).filter(Boolean).length, vis = pg.is_published === 1 && pg.show_in_menu === 1;
    var chips = (pg.is_published !== 1 ? '<span class="chip off">' + t('info.chipDraft') + '</span>' : vis ? '<span class="chip ok">' + t('info.chipTile') + '</span>' : '<span class="chip">' + t('info.chipMenu') + '</span>') + (words ? '<span class="chip">' + t('info.words', { n: words }) + '</span>' : '<span class="chip warn">' + t('info.chipEmpty') + '</span>');
    return '<div class="pg-card' + (vis ? '' : ' off') + '"><div class="pg-card-hd"><div class="pg-card-thumb">' + (pg.tile_image_url ? '<img src="' + edAttr(pg.tile_image_url) + '" alt="">' : edIconHtml(pg.icon_class, 'fas fa-info-circle')) + '</div>'
      + '<div class="pg-card-main"><div class="pg-card-title">' + edEsc(pg.title_en) + '</div><div class="pg-card-sub">' + edEsc(edPlain(pg.content_en).slice(0, 110)) + '</div><div class="pg-chips">' + chips + '</div></div>'
      + '<div class="pg-card-meta"><button class="ed-mini" type="button" data-ip="up" data-id="' + pg.page_id + '"' + (i === 0 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveUp')) + '">↑</button><button class="ed-mini" type="button" data-ip="down" data-id="' + pg.page_id + '"' + (i === pages.length - 1 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveDown')) + '">↓</button>'
      + '<button class="ed-mini" type="button" data-ip="vis" data-id="' + pg.page_id + '" title="' + edAttr(vis ? t('act.hide') : t('act.show')) + '">' + (vis ? '👁' : '🚫') + '</button><button class="ed-mini" type="button" data-ip="edit" data-id="' + pg.page_id + '" title="' + edAttr(t('act.edit')) + '">✎</button><button class="ed-mini danger" type="button" data-ip="del" data-id="' + pg.page_id + '" title="' + edAttr(t('act.delete')) + '">🗑</button></div></div></div>';
  }).join('') : '<div class="pg-empty"><b>' + t('info.empty') + '</b>' + t('info.emptySub') + '</div>')
    + '<button class="pg-add" type="button" data-ip="add">' + t('info.add') + '</button></div><div id="info-phone-host"></div></div>';
  host.querySelectorAll('[data-ip]').forEach(function (b) { b.addEventListener('click', function () { infoAction(b.dataset.ip, b.dataset.id ? +b.dataset.id : null); }); });
  var first = pages.find(function (p) { return p.is_published === 1; }) || pages[0];
  edPhone('info-phone-host', [['home', t('tab.home')], ['info', t('tab.sheet')]], first ? 'info' : 'home', function (tab) { return tab === 'home' || !first ? pvHome({ highlight: first ? 'info:' + first.page_key : null }) : { type: 'op-preview', view: 'info', page: { title_en: first.title_en, content_en: first.content_en, icon_class: first.icon_class, color_theme: first.color_theme } }; });
  if (openKey) { var pg = pages.find(function (p) { return p.page_key === openKey; }); if (pg) openInfoEditor(pg.page_id); }
}
async function infoAction(act, id) {
  if (act === 'add') { openInfoEditor(null); return; }
  if (act === 'edit') { openInfoEditor(id); return; }
  var pg = C.infoPages.find(function (x) { return x.page_id === id; }); if (!pg) return;
  if (act === 'del') {
    if (!(await v3Confirm(t('info.deleteConfirm', { name: pg.title_en })))) return;
    var d = await api('DELETE', '/api/admin/info-pages/' + id); if (!d.ok) { toast(errText(d, t('toast.deleteFail')), 'error'); return; }
    toast(t('toast.deleted'), 'success'); await refresh(); return;
  }
  if (act === 'vis') {
    var vis = pg.is_published === 1 && pg.show_in_menu === 1;
    var r = await api('PATCH', '/api/admin/info-pages/' + id, vis ? { show_in_menu: 0 } : { show_in_menu: 1, is_published: 1 }); if (!r.ok) { toast(errText(r, t('toast.fail')), 'error'); return; }
    toast(vis ? t('toast.hidden') : t('toast.shown'), 'success'); await refresh(); return;
  }
  if (act === 'up' || act === 'down') {
    var list = C.infoPages.slice().sort(function (a, b) { return ((a.display_order || 0) - (b.display_order || 0)) || (a.page_id - b.page_id); }), ids = list.map(function (p) { return p.page_id; });
    var i = ids.indexOf(id), j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ids.length) return;
    var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    var r2 = await api('POST', '/api/admin/info-pages/reorder', { ids: ids }); if (!r2.ok) { toast(errText(r2, t('toast.orderFail')), 'error'); return; }
    toast(t('toast.order'), 'success'); await refresh();
  }
}
function openInfoEditor(id) {
  var cur = id ? C.infoPages.find(function (p) { return p.page_id === id; }) : null, o = cur || { is_published: 1, show_in_menu: 1, icon_class: 'fas fa-info-circle', color_theme: 'blue' };
  if (V3.screen !== 'info') { V3.screen = 'info'; }
  V3.key = cur ? cur.page_key : null; markSidebar();
  var body = edEnglishNote() + '<div class="ed-group"><div class="ed-group-title">' + t('info.title') + '</div>' + edField('f-ip-title', t('info.title'), o.title_en, { ph: t('info.titlePh') }) + edIconField('f-ip-icon', t('tl.icon'), o.icon_class)
    + '<div class="form-group"><label class="form-label" for="f-ip-theme">' + t('info.theme') + '</label><select class="form-input form-select" id="f-ip-theme">' + INFO_THEMES.map(function (th) { return '<option value="' + th + '"' + ((o.color_theme || 'blue') === th ? ' selected' : '') + '>' + t('theme.' + th) + '</option>'; }).join('') + '</select></div></div>'
    + '<div class="ed-group"><div class="ed-group-title">' + t('info.body') + '</div>' + edRichField('f-ip-body', t('info.bodyPh')) + '<div style="height:10px"></div></div>'
    + '<div class="ed-group"><div class="ed-group-title">' + t('tl.photo') + '</div>' + edPhotoField('f-ip-img', '', t('tl.photoHint'), o.tile_image_url, true) + '</div>'
    + '<div class="ed-group">' + edSwitch('f-ip-pub', t('info.published'), t('info.publishedSub'), o.is_published === 1) + edSwitch('f-ip-tile', t('info.tile'), t('info.tileSub'), o.show_in_menu === 1) + '<div style="height:6px"></div></div>';
  var draft = function () { return { page_id: cur ? cur.page_id : 'draft', page_key: cur ? cur.page_key : ('draft-' + (edSlug(edVal('f-ip-title')) || 'new')), title_en: edVal('f-ip-title').trim() || t('info.new'), content_en: edVal('f-ip-body'), icon_class: edVal('f-ip-icon'), color_theme: edVal('f-ip-theme'), tile_image_url: edVal('f-ip-img').trim(), is_published: edChecked('f-ip-pub') ? 1 : 0, show_in_menu: edChecked('f-ip-tile') ? 1 : 0, display_order: cur ? cur.display_order : 999 }; };
  openModal(cur ? t('info.edit', { name: cur.title_en }) : t('info.new'), '<div class="ed-grid"><div class="ed-form">' + body + '</div>' + edPreviewPane([['info', t('tab.sheet')], ['home', t('tab.homeTile')]]) + '</div>', {
    width: 1180, onSave: async function () {
      var d = draft(); if (!edVal('f-ip-title').trim()) { toast(t('info.titleRequired'), 'error'); document.getElementById('f-ip-title').focus(); return; }
      var b = { title_en: d.title_en, content_en: d.content_en, icon_class: d.icon_class, color_theme: d.color_theme, is_published: d.is_published, show_in_menu: d.show_in_menu, tile_image_url: d.tile_image_url || null };
      var r;
      if (cur) r = await api('PATCH', '/api/admin/info-pages/' + cur.page_id, b);
      else { b.page_key = edSlug(d.title_en) || ('page-' + Date.now().toString(36)); if (C.infoPages.some(function (p) { return p.page_key === b.page_key; })) b.page_key += '-' + Date.now().toString(36).slice(-4); b.display_order = C.infoPages.length + 1; r = await api('POST', '/api/admin/info-pages', b); }
      if (!r.ok) throw new Error(errText(r, t('toast.fail')));
      closeModal(); toast(t('toast.saved'), 'success'); V3.key = null;
      if (V3.screen !== 'info') go('info'); else await refresh();
    }, onClose: function () { V3.key = null; markSidebar(); setHash('info'); }
  });
  setHash(cur ? 'info/' + cur.page_key : 'info/new');
  var upd = function () { edSchedule(); };
  edWatch(['f-ip-title', 'f-ip-theme', 'f-ip-pub', 'f-ip-tile'], upd); edWireIcon('f-ip-icon', upd); edWirePhoto('f-ip-img', upd); edWireRich('f-ip-body', o.content_en, upd);
  edStartPreview('info', function (tab) {
    var d = draft();
    if (tab === 'home') { var rows = C.infoPages.filter(function (p) { return !cur || p.page_id !== cur.page_id; }).concat([Object.assign({}, d, { is_published: 1, show_in_menu: 1 })]); return pvHome({ infoPages: rows, highlight: 'info:' + d.page_key }); }
    return { type: 'op-preview', view: 'info', page: { title_en: d.title_en, content_en: d.content_en, icon_class: d.icon_class, color_theme: d.color_theme } };
  });
}

/* ---- FEEDBACK: the survey picker as one dropdown ---- */
async function renderFeedback() {
  var host = stageHost('fb-wrap');
  host.innerHTML = '<div class="fb-box"><div class="sc-note plain"><span>⭐</span><div>' + t('fb.note') + '</div></div><div class="sk sk-line" style="width:60%"></div><div class="sk sk-line" style="width:40%"></div></div>';
  var r = await api('GET', '/api/admin/feedback/surveys?property_id=' + encodeURIComponent(AUTH.propertyId));
  if (V3.screen !== 'feedback') return;
  var d = r.data || {}, surveys = d.surveys || [], current = d.current || C.property.feedback_survey_url || '';
  host.innerHTML = '<div class="fb-box"><div class="sc-note plain"><span>⭐</span><div>' + t('fb.note') + '</div></div>'
    + '<div class="form-group"><label class="form-label" for="fb-sel">' + t('fb.pick') + '</label><select class="form-input form-select" id="fb-sel"><option value="">' + t('fb.none') + '</option>' + surveys.map(function (s) { return '<option value="' + edAttr(s.url) + '"' + (s.url === current ? ' selected' : '') + '>' + edEsc(s.title || 'Untitled') + (s.status && s.status !== 'active' ? ' (' + edEsc(s.status) + ')' : '') + ' · ' + edEsc(t('fb.responses', { n: s.responses || 0 })) + '</option>'; }).join('') + '</select></div>'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" type="button" id="fb-save">' + t('act.saveChanges') + '</button><a class="btn btn-secondary" id="fb-open" href="' + edAttr(current || '#') + '" target="_blank" rel="noopener" style="' + (current ? '' : 'display:none') + '">' + t('fb.open') + '</a>'
    + '<span class="chip ' + (d.connected ? 'ok' : 'warn') + '" style="margin-left:auto">' + (d.connected ? '● ' + t('fb.connected') : '⚠ ' + t('fb.notConnected')) + '</span></div></div>';
  var sel = document.getElementById('fb-sel'), openA = document.getElementById('fb-open');
  sel.addEventListener('change', function () { openA.href = sel.value || '#'; openA.style.display = sel.value ? '' : 'none'; });
  document.getElementById('fb-save').addEventListener('click', async function () {
    var btn = this; btn.disabled = true;
    var r2 = await api('POST', '/api/admin/feedback/survey-select', { property_id: AUTH.propertyId, url: sel.value }); btn.disabled = false;
    if (!r2.ok) { toast(errText(r2, t('toast.fail')), 'error'); return; }
    toast(sel.value ? t('fb.saved') : t('fb.savedNone'), 'success'); await refresh();
  });
}

/* ---- EMBEDDED CLASSIC SCREENS: each iframe is mounted once, then only shown/hidden ---- */
function renderEmbed(screen) {
  var s = SCREENS[screen], id = 'emb-' + screen, host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div'); host.id = id; host.className = 'embed-host';
    var src = s.embed + (s.withProperty ? '&property=' + encodeURIComponent(AUTH.propertyId) : '');
    host.innerHTML = '<div class="embed-note"><span>ℹ️</span><span class="emb-note-t"></span><a class="btn btn-secondary btn-sm" href="/admin/dashboard#' + edAttr(s.classic || '') + '" target="_blank" rel="noopener">' + t('emb.openClassic') + '</a></div><iframe src="' + edAttr(src) + '" title="' + edAttr(t(s.i18n)) + '"></iframe>';
    document.getElementById('embeds').appendChild(host);
  }
  host.querySelector('.emb-note-t').textContent = t(s.note);
  host.classList.add('on');
  if (s.dashTab) { try { host.querySelector('iframe').contentWindow.postMessage({ type: 'op-admin-tab', tab: s.dashTab }, location.origin); } catch (e) {} }
}

/* ---- HELP: chapters as data (help.js), one per screen, EN + AR ---- */
function renderHelp(chapter) {
  var host = stageHost('help-wrap'), isAr = LANG === 'ar', arNum = function (n) { return '١٢٣٤٥٦٧٨٩'.charAt(n - 1) || String(n); };
  var vocabHtml = '<div class="hm-h">' + t('help.vocab') + '</div><div class="sg-vocab">' + [['help.tile', 'help.tileD', 'fas fa-square'], ['help.page', 'help.pageD', 'fas fa-file'], ['help.place', 'help.placeD', 'fas fa-utensils'], ['help.phone', 'help.phoneD', 'fas fa-mobile-screen']].map(function (v) { return '<div><b>' + edIconHtml(v[2]) + ' ' + t(v[0]) + '</b>' + t(v[1]) + '</div>'; }).join('') + '</div>';
  host.innerHTML = vocabHtml + '<div class="sg-chips">' + HELP_CHAPTERS.map(function (c) { return '<button class="chip link" type="button" data-jump="' + c.id + '">' + edIconHtml(c.icon) + ' ' + edEsc(isAr ? c.titleAr : c.title) + '</button>'; }).join('') + '</div>'
    + HELP_CHAPTERS.map(function (c) {
      var steps = isAr ? c.ar : c.en, tip = isAr ? c.arTip : c.enTip;
      return '<div class="sg-card' + (c.id === chapter ? ' open' : '') + '" id="sg-' + c.id + '"><button class="sg-card-hdr" type="button" data-toggle="' + c.id + '" aria-expanded="' + (c.id === chapter) + '"><div style="display:flex;align-items:center;gap:12px;min-width:0"><div class="sg-ico">' + edIconHtml(c.icon) + '</div><div style="min-width:0"><div class="sg-t">' + edEsc(isAr ? c.titleAr : c.title) + '</div><div class="sg-d">' + edEsc(isAr ? c.descAr : c.desc) + '</div></div></div><div class="sg-chevron">▼</div></button>'
        + '<div class="sg-card-body">' + (c.go ? '<div style="padding-top:12px"><button class="btn btn-secondary btn-sm" type="button" data-open="' + c.id + '">' + t('act.openForMe') + '</button></div>' : '')
        + '<div class="sg-steps">' + steps.map(function (s, i) { return '<div class="sg-step"><div class="sg-step-num">' + (isAr ? arNum(i + 1) : (i + 1)) + '</div><div class="sg-step-text">' + s + '</div></div>'; }).join('') + '</div>'
        + (tip ? '<div class="sg-tip">💡 ' + tip + '</div>' : '') + '</div></div>';
    }).join('');
  host.querySelectorAll('[data-toggle]').forEach(function (b) { b.addEventListener('click', function () { var card = document.getElementById('sg-' + b.dataset.toggle); card.classList.toggle('open'); b.setAttribute('aria-expanded', card.classList.contains('open')); }); });
  host.querySelectorAll('[data-jump]').forEach(function (b) { b.addEventListener('click', function () { var card = document.getElementById('sg-' + b.dataset.jump); card.classList.add('open'); card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
  host.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { var c = HELP_CHAPTERS.find(function (x) { return x.id === b.dataset.open; }); if (c && c.go) c.go(); }); });
  if (chapter) setTimeout(function () { var card = document.getElementById('sg-' + chapter); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
}

/* ---- Ctrl+K: jump to any tile, place, dish, info page or screen ---- */
function cmdkItems() {
  var items = [];
  tilesList().forEach(function (tl) { items.push({ ico: tl.icon, t: tileLabel(tl), path: t('cmdk.tile'), go: function () { openTile(tl.key); } }); });
  tilesList().forEach(function (tl) {
    if (!(tl.kind === 'type' && tl.type !== 'activity') && !(tl.kind === 'cs' && !tl.isRs)) return;
    offeringsFor(tl.key).forEach(function (o) { items.push({ ico: o.images[0] ? null : tl.icon, img: o.images[0], t: o.title_en, path: tileLabel(tl), go: function () { openPage(tl.key); openVenueEditor(tl.key, o.offering_id); } }); });
  });
  C.roomService.items.forEach(function (it) { items.push({ ico: 'fas fa-utensils', t: it.item_name, path: t('cmdk.rs'), go: function () { go('roomservice'); openRsItemEditor(it); } }); });
  C.infoPages.forEach(function (pg) { items.push({ ico: pg.icon_class || 'fas fa-info-circle', t: pg.title_en, path: t('cmdk.info'), go: function () { go('info', { page: pg.page_key }); } }); });
  Object.keys(SCREENS).forEach(function (k) { var s = SCREENS[k]; if (!s.i18n || (s.perm && !can(s.perm))) return; items.push({ ico: s.icon, t: t(s.i18n), path: t('cmdk.screen'), go: function () { go(k); } }); });
  [['tab.tiles', 'hotel', 'tiles'], ['tab.contact', 'hotel', 'contact'], ['tab.look', 'hotel', 'look']].forEach(function (p) { items.push({ ico: 'fas fa-arrow-right', t: t(p[0]), path: t('sc.hotel'), go: function () { go(p[1], { tab: p[2] }); } }); });
  return items;
}
var _ck = { items: [], sel: 0, res: [] };
function openCmdk() {
  if (!C) return;
  var box = document.getElementById('cmdk');
  _ck.items = cmdkItems(); _ck.sel = 0;
  box.classList.add('open'); var inp = document.getElementById('cmdk-in'); inp.value = ''; renderCmdk(''); setTimeout(function () { inp.focus(); }, 30);
}
function closeCmdk() { document.getElementById('cmdk').classList.remove('open'); }
function renderCmdk(q) {
  q = q.trim().toLowerCase();
  var list = document.getElementById('cmdk-list');
  var res = (q ? _ck.items.filter(function (i) { return (i.t + ' ' + i.path).toLowerCase().indexOf(q) !== -1; }) : _ck.items.filter(function (i) { return i.path === t('cmdk.tile') || i.path === t('cmdk.screen'); })).slice(0, 14);
  _ck.res = res; if (_ck.sel >= res.length) _ck.sel = 0;
  list.innerHTML = res.length ? res.map(function (i, k) { return '<div class="cmdk-it' + (k === _ck.sel ? ' sel' : '') + '" data-k="' + k + '" role="option"><span class="ck-ico">' + (i.img ? '<img src="' + edAttr(i.img) + '" alt="" style="width:24px;height:24px;border-radius:6px;object-fit:cover">' : edIconHtml(i.ico)) + '</span><span>' + edEsc(i.t) + '</span><span class="ck-path">' + edEsc(i.path) + '</span></div>'; }).join('')
    : '<div class="cmdk-empty">' + edEsc(t('cmdk.empty', { q: q })) + '<br><button class="btn btn-secondary btn-sm" type="button" style="margin-top:8px" id="cmdk-add-tile">' + t('cmdk.addTile') + '</button> <button class="btn btn-secondary btn-sm" type="button" style="margin-top:8px" id="cmdk-add-venue">' + edEsc(t('cmdk.addVenue', { page: t('sc.dining') })) + '</button></div>';
  list.querySelectorAll('.cmdk-it').forEach(function (el) { el.addEventListener('click', function () { closeCmdk(); res[+el.dataset.k].go(); }); });
  var at = document.getElementById('cmdk-add-tile'); if (at) at.addEventListener('click', function () { closeCmdk(); openNewTile(); });
  var av = document.getElementById('cmdk-add-venue'); if (av) av.addEventListener('click', function () { closeCmdk(); openPage('type:restaurant'); openVenueEditor('type:restaurant', null); setTimeout(function () { var n = document.getElementById('f-ve-name'); if (n) n.value = q.replace(/\b\w/g, function (m) { return m.toUpperCase(); }); edSchedule(0); }, 50); });
}
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); return; }
  var box = document.getElementById('cmdk'); if (!box || !box.classList.contains('open')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _ck.sel = Math.min(_ck.sel + 1, _ck.res.length - 1); renderCmdk(document.getElementById('cmdk-in').value); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _ck.sel = Math.max(_ck.sel - 1, 0); renderCmdk(document.getElementById('cmdk-in').value); }
  else if (e.key === 'Enter') { var r = _ck.res[_ck.sel]; if (r) { closeCmdk(); r.go(); } }
});
(function () {
  var ci = document.getElementById('cmdk-in'); if (ci) ci.addEventListener('input', function () { _ck.sel = 0; renderCmdk(ci.value); });
  var ck = document.getElementById('cmdk'); if (ck) ck.addEventListener('click', function (e) { if (e.target === ck) closeCmdk(); });
})();

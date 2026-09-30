/* ═══════════════════════════════════════════════════════════════════════════
   Editor widgets shared by every screen — photo upload, rich text, icon picker,
   the live phone (guest page in ?preview=1 mode driven by postMessage), modal,
   toast and confirm. Ported from the Marsa Alam admin (recon/admin-editors.js).
   Content is written in English only; guests get their own language automatically.
   ═══════════════════════════════════════════════════════════════════════════ */
var ED = { ready: false, pending: null, timer: null, tab: null, render: null, lastMsg: null };
var UPLOAD_MAX_MB = 12;
var ED_ICONS = ['fas fa-utensils', 'fas fa-mug-hot', 'fas fa-martini-glass-citrus', 'fas fa-pizza-slice', 'fas fa-ice-cream', 'fas fa-cake-candles', 'fas fa-champagne-glasses',
  'fas fa-bell-concierge', 'fas fa-spa', 'fas fa-dumbbell', 'fas fa-person-swimming', 'fas fa-water-ladder', 'fas fa-umbrella-beach', 'fas fa-water', 'fas fa-ship', 'fas fa-person-hiking', 'fas fa-bicycle', 'fas fa-child', 'fas fa-gamepad', 'fas fa-music', 'fas fa-calendar-days', 'fas fa-gift', 'fas fa-star', 'fas fa-heart',
  'fas fa-wifi', 'fas fa-tv', 'fas fa-phone', 'fas fa-clock', 'fas fa-info-circle', 'fas fa-circle-question', 'fas fa-map-location-dot', 'fas fa-car', 'fas fa-plane', 'fas fa-taxi', 'fas fa-shield-halved', 'fas fa-hotel', 'fas fa-bed', 'fas fa-key', 'fas fa-bag-shopping', 'fas fa-shirt', 'fas fa-briefcase-medical', 'fas fa-paw', 'fas fa-leaf', 'fas fa-sun', 'fas fa-moon', 'fas fa-camera', 'fas fa-comment-dots', 'fas fa-store', 'fas fa-square-parking', 'fas fa-hand-holding-heart', 'fas fa-book', 'fas fa-flag'];

function edEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
function edAttr(s) { return edEsc(s); }
function edVal(id) { var el = document.getElementById(id); return el ? String(el.value == null ? '' : el.value) : ''; }
function edChecked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
function edSlug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function edIconHtml(cls, fallback) { var c = String(cls || fallback || 'fas fa-star').trim(); if (!/^fa[srb]? fa-[a-z0-9-]+$/.test(c)) c = fallback || 'fas fa-star'; return '<i class="' + edAttr(c) + '"></i>'; }
function edEnglishNote() { return '<div class="ed-note">✍️ ' + t('ed.englishNote') + '</div>'; }
function edPlain(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }

/* ---- live preview: same-origin iframe of the guest page in ?preview=1 mode ---- */
window.addEventListener('message', function (ev) {
  if (ev.origin !== location.origin) return;
  if (ev.data && ev.data.type === 'op-preview-ready') { ED.ready = true; edFlush(); }
});
function edPreviewSrc() { var lang = document.body.classList.contains('lang-ar') ? '' : ''; return '/hotel/' + encodeURIComponent(AUTH.slug || 'paradise-resort') + '?preview=1' + lang; }
function edPreviewPane(tabs, note) {
  return '<div class="ed-pv">'
    + '<div class="ed-pv-tabs">' + tabs.map(function (tb, i) { return '<button type="button" class="ed-pv-tab' + (i === 0 ? ' on' : '') + '" data-pv-tab="' + tb[0] + '">' + edEsc(tb[1]) + '</button>'; }).join('') + '</div>'
    + '<div class="ed-phone"><div class="ed-phone-notch"></div><div class="ed-phone-screen">'
    + '<iframe id="ed-pv-frame" src="' + edAttr(edPreviewSrc()) + '" title="' + edAttr(t('pv.title')) + '"></iframe>'
    + '<div class="ed-pv-loading" id="ed-pv-loading">' + t('pv.loading') + '</div></div></div>'
    + '<div class="ed-pv-note">' + (note || t('pv.note')) + '</div>'
    + '</div>';
}
function edStartPreview(tab, render) {
  ED.ready = false; ED.pending = null; ED.tab = tab; ED.render = render; ED.lastMsg = null;
  document.querySelectorAll('.ed-pv-tab').forEach(function (b) {
    b.classList.toggle('on', b.dataset.pvTab === tab);
    b.addEventListener('click', function () { edSetTab(b.dataset.pvTab); });
  });
  edSchedule(0);
}
function edSetTab(tab) {
  ED.tab = tab;
  document.querySelectorAll('.ed-pv-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.pvTab === tab); });
  edSchedule(0);
}
function edSchedule(delay) {
  clearTimeout(ED.timer);
  ED.timer = setTimeout(function () {
    try { ED.pending = ED.render ? ED.render(ED.tab) : null; } catch (e) { console.error('preview render', e); }
    edFlush();
  }, delay == null ? 180 : delay);
}
function edFlush() {
  var f = document.getElementById('ed-pv-frame');
  if (!f || !ED.ready || !ED.pending) return;
  var ld = document.getElementById('ed-pv-loading'); if (ld) ld.style.display = 'none';
  try { ED.lastMsg = ED.pending; f.contentWindow.postMessage(ED.pending, location.origin); } catch (e) {}
}
function edUnmountPhones() { document.querySelectorAll('.ed-pv').forEach(function (e) { e.remove(); }); clearTimeout(ED.timer); ED.render = null; ED.pending = null; ED.ready = false; }
// A phone pinned on a screen: reuses the existing iframe when one is already mounted in that host.
function edPhone(hostId, tabs, tab, render, note) {
  var host = document.getElementById(hostId); if (!host) return;
  if (host.querySelector('#ed-pv-frame')) {
    ED.render = render;
    if (!tabs.some(function (tb) { return tb[0] === ED.tab; })) ED.tab = tab;
    document.querySelectorAll('.ed-pv-tab').forEach(function (b) { var tb = tabs.find(function (x) { return x[0] === b.dataset.pvTab; }); if (tb) b.textContent = tb[1]; b.classList.toggle('on', b.dataset.pvTab === ED.tab); });
    var nt = host.querySelector('.ed-pv-note'); if (nt) nt.innerHTML = note || t('pv.note');
    edSchedule(0); return;
  }
  edUnmountPhones();
  host.innerHTML = edPreviewPane(tabs, note).replace('class="ed-pv"', 'class="ed-pv pg-phone-wrap"');
  edStartPreview(tab, render);
}

/* ---- upload to storage (R2 through the worker) with progress ---- */
function edUpload(file, onProgress) {
  return new Promise(function (resolve, reject) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) && ['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(ext) === -1) { reject(new Error(t('up.badType'))); return; }
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) { reject(new Error(t('up.tooBig', { mb: UPLOAD_MAX_MB }))); return; }
    var fd = new FormData(); fd.append('file', file, file.name);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.setRequestHeader('X-User-ID', AUTH.userId); xhr.setRequestHeader('X-Property-ID', AUTH.propertyId);
    xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onerror = function () { reject(new Error(t('up.network'))); };
    xhr.onload = function () {
      var d = {}; try { d = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
      if (xhr.status >= 200 && xhr.status < 300 && d.success && d.url) resolve(d);
      else reject(new Error(xhr.status === 413 ? t('up.tooBig', { mb: UPLOAD_MAX_MB }) : xhr.status === 415 ? t('up.badType') : (d.error || t('up.failed'))));
    };
    xhr.send(fd);
  });
}

/* ---- single photo field: drop zone / click to upload, or paste a link ---- */
function edPhotoField(id, label, hint, url, compact) {
  var has = url && String(url).trim();
  return '<div class="ed-photo">'
    + (label ? '<label class="form-label">' + label + '</label>' : '')
    + '<div class="ed-drop' + (has ? ' has' : '') + (compact ? ' compact' : '') + '" id="' + id + '-drop" tabindex="0" role="button" aria-label="' + edAttr(t('ph.upload')) + '" data-replace="' + edAttr(t('ph.replace')) + '">'
    + '<img id="' + id + '-img" alt=""' + (has ? ' src="' + edAttr(url) + '"' : '') + '>'
    + '<div class="ed-drop-ph"><b>' + t('ph.drop') + '</b> ' + t('ph.orClick') + '<small>' + (hint || '') + '</small></div>'
    + '<div class="ed-drop-busy"><span>' + t('ph.uploading') + '</span><div class="ed-prog"><div id="' + id + '-prog"></div></div></div></div>'
    + '<div class="ed-photo-row"><input class="form-input" id="' + id + '" dir="ltr" placeholder="' + edAttr(t('ph.paste')) + '" value="' + edAttr(url || '') + '">'
    + '<button type="button" class="btn btn-secondary btn-sm" id="' + id + '-clear">' + t('ph.remove') + '</button></div>'
    + '<input type="file" id="' + id + '-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>'
    + '</div>';
}
function edWirePhoto(id, onChange) {
  var drop = document.getElementById(id + '-drop'), file = document.getElementById(id + '-file'),
      inp = document.getElementById(id), img = document.getElementById(id + '-img'), prog = document.getElementById(id + '-prog');
  if (!drop) return;
  function show(u) {
    if (u && String(u).trim()) { img.src = u; drop.classList.add('has'); } else { img.removeAttribute('src'); drop.classList.remove('has'); }
    if (onChange) onChange();
  }
  async function upload(f) {
    drop.classList.add('busy'); if (prog) prog.style.width = '0%';
    try {
      var d = await edUpload(f, function (p) { if (prog) prog.style.width = p + '%'; });
      inp.value = d.url; show(d.url); toast(t('ph.uploaded'), 'success');
    } catch (e) { toast(e.message || t('up.failed'), 'error'); }
    finally { drop.classList.remove('busy'); }
  }
  drop.addEventListener('click', function () { file.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); });
  file.addEventListener('change', function () { if (file.files[0]) upload(file.files[0]); file.value = ''; });
  inp.addEventListener('input', function () { show(inp.value); });
  document.getElementById(id + '-clear').addEventListener('click', function () { inp.value = ''; show(''); });
}

/* ---- photo strip: up to N photos, first = cover, ↑ ↓ remove, drop zone + paste link ---- */
function edPhotosField(id, urls, max) {
  return '<div class="ed-photos-wrap" id="' + id + '-wrap" data-max="' + (max || 12) + '">'
    + '<div class="ed-photos" id="' + id + '-list"></div>'
    + '<div class="ed-drop compact" id="' + id + '-drop" tabindex="0" role="button" aria-label="' + edAttr(t('ph.upload')) + '" data-replace="">'
    + '<div class="ed-drop-ph"><b>' + t('ph.dropMany') + '</b> ' + t('ph.orClick') + '<small>' + t('ph.manyHint', { n: max || 12 }) + '</small></div>'
    + '<div class="ed-drop-busy"><span id="' + id + '-busy-t">' + t('ph.uploading') + '</span><div class="ed-prog"><div id="' + id + '-prog"></div></div></div></div>'
    + '<div class="ed-photo-row"><input class="form-input" id="' + id + '-link" dir="ltr" placeholder="' + edAttr(t('ph.paste')) + '">'
    + '<button type="button" class="btn btn-secondary btn-sm" id="' + id + '-add">' + t('ph.addLink') + '</button></div>'
    + '<input type="file" id="' + id + '-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>'
    + '<input type="hidden" id="' + id + '" value="' + edAttr(JSON.stringify(urls || [])) + '">'
    + '</div>';
}
function edPhotosGet(id) { try { var v = JSON.parse(edVal(id) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function edWirePhotos(id, onChange) {
  var wrap = document.getElementById(id + '-wrap'); if (!wrap) return;
  var max = +wrap.dataset.max || 12, hid = document.getElementById(id), list = document.getElementById(id + '-list');
  var drop = document.getElementById(id + '-drop'), file = document.getElementById(id + '-file'), prog = document.getElementById(id + '-prog'), busyT = document.getElementById(id + '-busy-t');
  function get() { return edPhotosGet(id); }
  function set(arr) { hid.value = JSON.stringify(arr.slice(0, max)); render(); if (onChange) onChange(); }
  function render() {
    var arr = get();
    list.innerHTML = arr.map(function (u, i) {
      return '<div class="ed-ph"><img src="' + edAttr(u) + '" alt="">' + (i === 0 ? '<span class="ed-ph-cover">' + t('ph.cover') + '</span>' : '')
        + '<div class="ed-ph-bar"><button type="button" class="ed-mini" data-ph="up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveUp')) + '">↑</button>'
        + '<button type="button" class="ed-mini" data-ph="down" data-i="' + i + '"' + (i === arr.length - 1 ? ' disabled' : '') + ' title="' + edAttr(t('act.moveDown')) + '">↓</button>'
        + '<button type="button" class="ed-mini danger" data-ph="del" data-i="' + i + '" title="' + edAttr(t('ph.remove')) + '">✕</button></div></div>';
    }).join('');
    list.querySelectorAll('[data-ph]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = get(), i = +b.dataset.i, act = b.dataset.ph;
        if (act === 'del') a.splice(i, 1);
        else { var j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= a.length) return; var tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
        set(a);
      });
    });
    drop.style.display = arr.length >= max ? 'none' : '';
  }
  async function uploadMany(files) {
    var arr = get(), room = max - arr.length;
    if (room <= 0) { toast(t('ph.maxReached', { n: max }), 'error'); return; }
    files = Array.prototype.slice.call(files, 0, room);
    drop.classList.add('busy');
    for (var k = 0; k < files.length; k++) {
      if (busyT) busyT.textContent = t('ph.uploadingN', { i: k + 1, n: files.length });
      if (prog) prog.style.width = '0%';
      try { var d = await edUpload(files[k], function (p) { if (prog) prog.style.width = p + '%'; }); arr = get(); arr.push(d.url); set(arr); }
      catch (e) { toast(e.message || t('up.failed'), 'error'); }
    }
    drop.classList.remove('busy');
    if (busyT) busyT.textContent = t('ph.uploading');
  }
  drop.addEventListener('click', function () { file.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) uploadMany(e.dataTransfer.files); });
  file.addEventListener('change', function () { if (file.files.length) uploadMany(file.files); file.value = ''; });
  var addLink = function () {
    var inp = document.getElementById(id + '-link'), u = inp.value.trim(); if (!u) return;
    if (!/^(https?:\/\/|\/api\/img\/|\/static\/)/i.test(u)) { toast(t('ph.badLink'), 'error'); return; }
    var a = get(); if (a.length >= max) { toast(t('ph.maxReached', { n: max }), 'error'); return; }
    a.push(u); inp.value = ''; set(a);
  };
  document.getElementById(id + '-add').addEventListener('click', addLink);
  document.getElementById(id + '-link').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addLink(); } });
  render();
}

/* ---- rich text (headings, bold, italic, lists, links, photos) — stored as clean HTML ---- */
function edRichField(id, hint) {
  return '<div class="ed-rt">'
    + '<div class="ed-rt-bar">'
    + '<button type="button" data-rt="h2" title="' + edAttr(t('rt.heading')) + '">' + t('rt.heading') + '</button>'
    + '<button type="button" data-rt="bold" title="' + edAttr(t('rt.bold')) + '"><b>B</b></button>'
    + '<button type="button" data-rt="italic" title="' + edAttr(t('rt.italic')) + '"><i>I</i></button>'
    + '<button type="button" data-rt="insertUnorderedList" title="' + edAttr(t('rt.list')) + '">• ' + t('rt.list') + '</button>'
    + '<button type="button" data-rt="insertOrderedList" title="' + edAttr(t('rt.numbered')) + '">1. ' + t('rt.numbered') + '</button>'
    + '<button type="button" data-rt="createLink" title="' + edAttr(t('rt.link')) + '">🔗 ' + t('rt.link') + '</button>'
    + '<button type="button" data-rt="photo" title="' + edAttr(t('rt.photo')) + '">🖼 ' + t('rt.photo') + '</button>'
    + '<button type="button" data-rt="removeFormat" title="' + edAttr(t('rt.clear')) + '">' + t('rt.clear') + '</button>'
    + '</div>'
    + '<div class="ed-rt-area" id="' + id + '-area" contenteditable="true" data-ph="' + edAttr(hint || '') + '"></div>'
    + '<input type="file" id="' + id + '-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>'
    + '</div><textarea id="' + id + '" hidden></textarea>';
}
function edCleanHtml(html) {
  var box = document.createElement('div'); box.innerHTML = html || '';
  var OK = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, P: 1, DIV: 1, UL: 1, OL: 1, LI: 1, A: 1, H2: 1, H3: 1, IMG: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1 };
  (function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      if (ch.nodeType === 1) {
        if (ch.tagName === 'SCRIPT' || ch.tagName === 'STYLE') { node.removeChild(ch); return; }
        walk(ch);
        if (!OK[ch.tagName]) { while (ch.firstChild) node.insertBefore(ch.firstChild, ch); node.removeChild(ch); return; }
        Array.prototype.slice.call(ch.attributes).forEach(function (a) {
          var keep = (ch.tagName === 'A' && a.name === 'href' && /^(https?:|tel:|mailto:)/i.test(a.value))
            || (ch.tagName === 'IMG' && a.name === 'src' && /^(https?:\/\/|\/api\/img\/|\/static\/)/i.test(a.value))
            || (ch.tagName === 'IMG' && a.name === 'alt');
          if (!keep) ch.removeAttribute(a.name);
        });
        if (ch.tagName === 'A') { ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener'); }
        if (ch.tagName === 'IMG' && !ch.getAttribute('src')) node.removeChild(ch);
      } else if (ch.nodeType !== 3) node.removeChild(ch);
    });
  })(box);
  var out = box.innerHTML.trim();
  return /^(<br>|<div><br><\/div>|<p><br><\/p>)?$/.test(out) ? '' : out;
}
function edToEditable(content) {
  var c = String(content || '');
  if (/<[a-z][\s\S]*>/i.test(c)) return edCleanHtml(c);
  return edEsc(c).replace(/\r\n/g, '\n').replace(/\n/g, '<br>'); // legacy plain text → lines guests can read
}
function edWireRich(id, content, onChange) {
  var area = document.getElementById(id + '-area'), ta = document.getElementById(id), file = document.getElementById(id + '-file');
  if (!area) return;
  area.innerHTML = edToEditable(content);
  ta.value = edCleanHtml(area.innerHTML);
  function sync() { ta.value = edCleanHtml(area.innerHTML); if (onChange) onChange(); }
  area.addEventListener('input', sync);
  area.addEventListener('paste', function (e) { // paste as plain text so foreign formatting never sneaks in
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });
  file.addEventListener('change', async function () {
    var f = file.files[0]; file.value = ''; if (!f) return;
    toast(t('ph.uploading'), 'success');
    try { var d = await edUpload(f); area.focus(); document.execCommand('insertHTML', false, '<img src="' + edAttr(d.url) + '" alt=""><br>'); sync(); }
    catch (e) { toast(e.message || t('up.failed'), 'error'); }
  });
  area.parentElement.querySelectorAll('[data-rt]').forEach(function (b) {
    b.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep the text selection
    b.addEventListener('click', function () {
      area.focus();
      var cmd = b.dataset.rt;
      if (cmd === 'createLink') {
        var u = prompt(t('rt.linkPrompt'));
        if (!u) return;
        if (!/^(https?:|tel:|mailto:)/i.test(u)) u = 'https://' + u;
        document.execCommand('createLink', false, u);
      } else if (cmd === 'photo') { file.click(); return; }
      else if (cmd === 'h2') { document.execCommand('formatBlock', false, area.querySelector('h2') && document.queryCommandValue('formatBlock') === 'h2' ? 'p' : 'h2'); }
      else document.execCommand(cmd, false, null);
      sync();
    });
  });
}

/* ---- icon picker (Font Awesome classes, shown as icons — staff never see the class name) ---- */
function edIconField(id, label, value) {
  var v = value || ED_ICONS[0];
  return '<div class="form-group"><label class="form-label">' + label + '</label>'
    + '<div class="ed-icon-row"><div class="ed-icon-cur" id="' + id + '-cur">' + edIconHtml(v) + '</div><input type="hidden" id="' + id + '" value="' + edAttr(v) + '">'
    + '<div class="ed-icon-pal">' + ED_ICONS.map(function (c) { return '<button type="button" data-icon="' + edAttr(c) + '" class="' + (c === v ? 'on' : '') + '" aria-label="' + edAttr(c.replace('fas fa-', '').replace(/-/g, ' ')) + '"><i class="' + edAttr(c) + '"></i></button>'; }).join('') + '</div></div></div>';
}
function edWireIcon(id, onChange) {
  var inp = document.getElementById(id); if (!inp) return;
  var row = inp.closest('.ed-icon-row');
  row.querySelectorAll('[data-icon]').forEach(function (b) {
    b.addEventListener('click', function () {
      inp.value = b.dataset.icon; document.getElementById(id + '-cur').innerHTML = edIconHtml(inp.value);
      row.querySelectorAll('[data-icon]').forEach(function (x) { x.classList.toggle('on', x === b); });
      if (onChange) onChange();
    });
  });
}
/* ---- one colour ---- */
function edColorField(id, label, value, hint) {
  var v = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#6b1529';
  return '<div class="form-group"><label class="form-label">' + label + (hint ? ' <span class="ed-hint">' + hint + '</span>' : '') + '</label>'
    + '<div class="color-row"><div class="color-swatch" id="' + id + '-sw" style="background:' + edAttr(v) + '"><input type="color" id="' + id + '-cp" value="' + edAttr(v) + '" aria-label="' + edAttr(label) + '"></div>'
    + '<input class="form-input" id="' + id + '" dir="ltr" value="' + edAttr(v) + '" maxlength="7"></div></div>';
}
function edWireColor(id, onChange) {
  var inp = document.getElementById(id), cp = document.getElementById(id + '-cp'), sw = document.getElementById(id + '-sw');
  if (!inp) return;
  function set(v) { inp.value = v; sw.style.background = v; if (/^#[0-9a-f]{6}$/i.test(v)) cp.value = v; if (onChange) onChange(); }
  cp.addEventListener('input', function () { set(this.value); });
  inp.addEventListener('input', function () { set(this.value); });
}
function edSwitch(id, label, sub, checked) {
  return '<label class="switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="sw"></span><span class="sw-t">' + label + (sub ? '<span class="sw-s">' + sub + '</span>' : '') + '</span></label>';
}
function edWatch(ids, fn) {
  ids.forEach(function (i) {
    var el = document.getElementById(i);
    if (!el) return;
    el.addEventListener('input', fn); el.addEventListener('change', fn);
  });
}
function edField(id, label, value, opts) {
  opts = opts || {};
  var hint = opts.hint ? ' <span class="ed-hint">' + opts.hint + '</span>' : '';
  var inp = opts.textarea
    ? '<textarea class="form-input" id="' + id + '" rows="' + (opts.rows || 3) + '" dir="ltr" placeholder="' + edAttr(opts.ph || '') + '">' + edEsc(value) + '</textarea>'
    : '<input class="form-input" id="' + id + '" dir="ltr" type="' + (opts.type || 'text') + '" value="' + edAttr(value == null ? '' : value) + '" placeholder="' + edAttr(opts.ph || '') + '"' + (opts.list ? ' list="' + opts.list + '"' : '') + (opts.step ? ' step="' + opts.step + '"' : '') + '>';
  if (opts.suffix) inp = '<div class="input-suffix">' + inp + '<span>' + opts.suffix + '</span></div>';
  return '<div class="form-group"><label class="form-label" for="' + id + '">' + label + hint + '</label>' + inp + (opts.help ? '<div class="form-hint">' + opts.help + '</div>' : '') + '</div>';
}

/* ---- modal ---- */
var MODAL = { onSave: null, onClose: null };
function openModal(title, bodyHtml, opts) {
  opts = opts || {};
  edUnmountPhones();
  var ov = document.getElementById('modal-overlay'), m = document.getElementById('modal');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  var foot = document.getElementById('modal-footer');
  foot.innerHTML = (opts.note ? '<span class="mf-note">' + opts.note + '</span>' : '')
    + (opts.extra || '')
    + '<button type="button" class="btn btn-secondary" id="modal-cancel">' + t('act.cancel') + '</button>'
    + (opts.saveLabel === false ? '' : '<button type="button" class="btn btn-primary" id="modal-save">' + edEsc(opts.saveLabel || t('act.save')) + '</button>');
  foot.style.display = opts.noFooter ? 'none' : '';
  m.style.maxWidth = (opts.width || 520) + 'px';
  MODAL.onSave = opts.onSave || null; MODAL.onClose = opts.onClose || null;
  ov.classList.add('open');
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  var sb = document.getElementById('modal-save'), saveLabel = opts.saveLabel || t('act.save');
  if (sb) sb.addEventListener('click', async function () {
    if (!MODAL.onSave) { closeModal(); return; }
    sb.disabled = true; sb.textContent = t('act.saving');
    try { await MODAL.onSave(); } catch (e) { console.error(e); toast(e.message || t('err.generic'), 'error'); }
    finally { sb.disabled = false; sb.textContent = saveLabel; }
  });
  m.scrollTop = 0;
  setTimeout(function () { var f = m.querySelector('input:not([type=hidden]):not([type=file]),textarea,[contenteditable]'); if (f && window.innerWidth > 900) { try { f.focus(); } catch (e) {} } }, 60);
}
function closeModal() {
  var ov = document.getElementById('modal-overlay');
  if (!ov.classList.contains('open')) return;
  ov.classList.remove('open');
  edUnmountPhones();
  var cb = MODAL.onClose; MODAL.onSave = null; MODAL.onClose = null;
  if (cb) { try { cb(); } catch (e) { console.error(e); } }
}
function modalOpen() { return document.getElementById('modal-overlay').classList.contains('open'); }

/* ---- toast + confirm ---- */
function toast(msg, kind) {
  var host = document.getElementById('toast'); if (!host) return;
  var el = document.createElement('div'); el.className = 'toast-item ' + (kind || 'success');
  el.innerHTML = '<span class="toast-dot"></span><span></span>'; el.lastChild.textContent = msg;
  host.appendChild(el);
  setTimeout(function () { el.remove(); }, kind === 'error' ? 5600 : 3600);
}
function v3Confirm(msg, opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var old = document.getElementById('v3-confirm'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'v3-confirm'; el.className = 'v3-confirm';
    el.innerHTML = '<div class="v3-confirm-box" role="alertdialog"><div class="v3-confirm-msg">' + edEsc(msg).replace(/\n/g, '<br>') + '</div>'
      + '<div class="v3-confirm-actions"><button class="btn btn-secondary" id="v3-confirm-cancel" type="button">' + edEsc(opts.cancel || t('act.cancel')) + '</button>'
      + '<button class="btn ' + (opts.danger === false ? 'btn-primary' : 'btn-danger') + '" id="v3-confirm-ok" type="button">' + edEsc(opts.ok || t('act.delete')) + '</button></div></div>';
    document.body.appendChild(el);
    var onKey = function (e) { if (e.key === 'Escape') done(false); else if (e.key === 'Enter') done(true); };
    var done = function (v) { el.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', function (e) { if (e.target === el) done(false); });
    document.getElementById('v3-confirm-cancel').onclick = function () { done(false); };
    document.getElementById('v3-confirm-ok').onclick = function () { done(true); };
    setTimeout(function () { try { document.getElementById('v3-confirm-ok').focus(); } catch (e) {} }, 30);
  });
}

/* Live beach rows — shared by the guest beach map and Beach setup.
   A row marked "live" is drawn by the app: the photo has that row emptied (beach-clean-v1.jpg) and
   each spot gets a real umbrella set cut from the original photo (beach-sets-v1.webp, 21 frames).
   Everything is placed in percent of the photo, so it scales with whatever size the map is shown at.
   Spot geometry (as stored): map_x = centre x %, map_y = top %, map_h = height % of the spot's box. */
(function () {
  var IMG = { w: 1774, h: 887 };                       // the photo's pixel grid
  var FRAME = { w: 80, h: 96, count: 21, poleX: 44, poleToTop: 81 };
  var SHEET = '/static/beach/beach-sets-v1.webp';
  var COLORS = { pets: ['rgba(230,170,60,.40)', '#e6aa3c'], quiet: ['rgba(70,170,150,.40)', '#46aa96'], other: ['rgba(150,130,200,.38)', '#9682c8'] };
  var ICON = { pets: '🐾', quiet: '🌿', other: '◆' };

  function css() {
    if (document.getElementById('bl-style')) return;
    var st = document.createElement('style'); st.id = 'bl-style';
    st.textContent =
      '.bl-layer{position:absolute;inset:0;pointer-events:none}' +
      '.bl-set{position:absolute;background-repeat:no-repeat;background-size:' + (FRAME.count * 100) + '% 100%}' +
      '.bl-set.maint{filter:grayscale(1) brightness(.85);opacity:.7}' +
      '.bl-set.dim{opacity:.38;filter:saturate(.4)}' +
      '.bl-band{position:absolute;border-radius:999px;border:1.5px solid}' +
      '.bl-label{position:absolute;transform:translateX(-50%);white-space:nowrap;padding:3px 10px;border-radius:999px;border:1.5px solid;background:rgba(18,10,14,.84);color:#f6f0e3;font:700 10.5px/1.3 Montserrat,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}';
    document.head.appendChild(st);
  }
  function num(v) { var n = parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10); return isFinite(n) ? n : 0; }
  function liveRows(rows) { var o = {}; (rows || []).forEach(function (r) { if (r.live === true || Number(r.live) === 1) o[Number(r.row_no)] = r; }); return o; }
  function geom(s) {
    var x = Number(s.map_x), y = Number(s.map_y), h = s.map_h != null ? Number(s.map_h) : 5.2;
    return { cx: x / 100 * IMG.w, cy: (y + h / 2) / 100 * IMG.h };
  }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Umbrella sets for every spot in a live row. opts.dim(spot) → true greys it (e.g. not allowed with a pet).
  function setsHtml(spots, rows, opts) {
    css(); opts = opts || {};
    var live = liveRows(rows), out = [];
    (spots || []).filter(function (s) { return live[Number(s.row_no)] && s.map_x != null && s.map_x !== ''; })
      .sort(function (a, b) { return Number(a.map_x) - Number(b.map_x); })
      .forEach(function (s) {
        var g = geom(s), n = num(s.spot_number), frame = ((Math.max(1, n) - 1) * 7) % FRAME.count;
        var left = (g.cx - FRAME.poleX) / IMG.w * 100, top = (g.cy - FRAME.poleToTop) / IMG.h * 100;
        var cls = 'bl-set' + (Number(s.maintenance_mode) === 1 ? ' maint' : '') + (opts.dim && opts.dim(s) ? ' dim' : '');
        out.push('<div class="' + cls + '" style="left:' + left.toFixed(3) + '%;top:' + top.toFixed(3) + '%;width:' + (FRAME.w / IMG.w * 100).toFixed(3) + '%;height:' + (FRAME.h / IMG.h * 100).toFixed(3) + '%;background-image:url(' + SHEET + ');background-position:' + (frame / (FRAME.count - 1) * 100).toFixed(3) + '% 0"></div>');
      });
    return out.length ? '<div class="bl-layer">' + out.join('') + '</div>' : '';
  }

  // Coloured bands under each area of a row, with a label (e.g. 🐾 PETS WELCOME · 1–6)
  function areasHtml(areas, spots, opts) {
    css(); opts = opts || {};
    var out = [];
    (areas || []).forEach(function (a) {
      var inA = (spots || []).filter(function (s) { var n = num(s.spot_number); return Number(s.row_no) === Number(a.row_no) && n >= Number(a.from_num) && n <= Number(a.to_num) && s.map_x != null && s.map_x !== ''; });
      if (!inA.length) return;
      var xs = inA.map(function (s) { return Number(s.map_x); }), bottoms = inA.map(function (s) { return Number(s.map_y) + (s.map_h != null ? Number(s.map_h) : 5.2); });
      var pad = 1.6, x0 = Math.max(0, Math.min.apply(null, xs) - pad), x1 = Math.min(100, Math.max.apply(null, xs) + pad);
      var y = Math.max.apply(null, bottoms) + 0.5, c = COLORS[a.kind] || COLORS.other;
      out.push('<div class="bl-band" style="left:' + x0.toFixed(2) + '%;width:' + (x1 - x0).toFixed(2) + '%;top:' + y.toFixed(2) + '%;height:1.7%;background:' + c[0] + ';border-color:' + c[1] + '"></div>');
      if (opts.labels !== false) out.push('<div class="bl-label" style="left:' + ((x0 + x1) / 2).toFixed(2) + '%;top:' + (y + 2.6).toFixed(2) + '%;border-color:' + c[1] + '">' + (ICON[a.kind] || '') + ' ' + esc(a.label) + ' · ' + Number(a.from_num) + '–' + Number(a.to_num) + '</div>');
    });
    return out.length ? '<div class="bl-layer">' + out.join('') + '</div>' : '';
  }

  // Positions for a row of `count` spots from x_start to x_end (spot centres, percent); numbering ltr|rtl
  function rowPositions(count, xs, xe, numbering) {
    var o = [];
    for (var k = 1; k <= count; k++) {
      var slot = numbering === 'rtl' ? count - k + 1 : k;
      o.push({ n: k, x: count === 1 ? (xs + xe) / 2 : xs + (xe - xs) * (slot - 1) / (count - 1) });
    }
    return o;
  }
  // Which areas contain this spot
  function areasOf(areas, s) { var n = num(s.spot_number); return (areas || []).filter(function (a) { return Number(a.row_no) === Number(s.row_no) && n >= Number(a.from_num) && n <= Number(a.to_num); }); }

  window.BeachLive = { IMG: IMG, FRAME: FRAME, SHEET: SHEET, COLORS: COLORS, ICON: ICON, setsHtml: setsHtml, areasHtml: areasHtml, rowPositions: rowPositions, areasOf: areasOf, liveRows: liveRows, num: num,
    // y_top that puts a 5.2%-tall box exactly on the emptied row's line in the default photo
    DEFAULT_Y_TOP: Math.round((615 / IMG.h * 100 - 2.6) * 100) / 100 };
})();

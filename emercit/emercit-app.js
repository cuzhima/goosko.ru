/* ==========================================================================
   goosko.ru/emercit/ — логика страницы: каталог постов, загрузка CSV
   с pub.emercit.ru через прокси, график на canvas, сводка, таблица, экспорт.
   Без внешних библиотек.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------ Настройки ------------------------------ */
  var DEFAULT_PROXY = 'https://emercitproxy.cuzhima.workers.dev/csv.php';
  var PROXY_KEY = 'goosko.emercit.proxy';
  var CHUNK_DAYS = 10;          // источник надёжно отдаёт ~10 дней за запрос
  var CONCURRENCY = 3;
  var MAX_DAYS = 366;
  var CACHE_TTL = 5 * 60 * 1000;
  var COLORS = ['#1c4b39', '#bd5730', '#b8862a', '#2f7a5c', '#7a5c9e'];
  var MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var MONTHS_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* --------------------------- Параметры данных --------------------------- */
  var MODES = {
    river_level: {
      label: 'Уровень воды', multi: false, defaultSeries: 1,
      cols: [
        { label: 'Уровень воды (по датчику)', unit: 'м', dec: 3 },
        { label: 'Уровень воды (по БСВ)', unit: 'м', dec: 3 }
      ],
      apis: ['old', 'pub']
    },
    precipitation: {
      label: 'Осадки', bar: true, multi: false,
      cols: [{ label: 'Осадки за интервал', unit: 'мм', dec: 2 }],
      apis: ['old', 'pub']
    },
    temperature: {
      label: 'Температура воздуха', multi: false,
      cols: [{ label: 'Температура', unit: '°C', dec: 1 }],
      apis: ['old', 'pub']
    },
    humidity: {
      label: 'Относительная влажность', multi: false,
      cols: [{ label: 'Влажность', unit: '%', dec: 1 }],
      apis: ['old', 'pub']
    },
    abs_pressure: {
      label: 'Атмосферное давление', multi: false,
      cols: [{ label: 'Давление', unit: 'мм рт. ст.', dec: 1 }],
      apis: ['old', 'pub']
    },
    dew_point: {
      label: 'Точка росы', multi: false,
      cols: [{ label: 'Точка росы', unit: '°C', dec: 1 }],
      apis: ['old']
    },
    wind: {
      label: 'Ветер', multi: false,
      cols: [
        { label: 'Скорость ветра', unit: 'м/с', dec: 1 },
        { label: 'Направление ветра', unit: '°', dec: 0 }
      ],
      apis: ['old', 'pub']
    },
    discharge: {
      label: 'Расход воды', multi: false,
      cols: [{ label: 'Расход воды', unit: 'м³/с', dec: 2 }],
      apis: ['old']
    },
    waves: {
      label: 'Волнение моря', multi: true,
      cols: [
        { label: 'Высота волны', unit: 'м', dec: 2 },
        { label: 'Высота волны (макс.)', unit: 'м', dec: 2 }
      ],
      apis: ['old']
    },
    meds: {
      label: 'Радиация (МЭД)', multi: false,
      cols: [{ label: 'Мощность дозы', unit: 'мкР/ч', dec: 3 }],
      apis: ['old']
    },
    global_radiation: {
      label: 'Солнечная радиация', multi: false,
      cols: [{ label: 'Солнечная радиация', unit: 'Вт/м²', dec: 1 }],
      apis: ['old']
    },
    soil_humidity: {
      label: 'Влажность почвы', multi: true, byDepth: true,
      cols: [
        { label: 'Влажность почвы', unit: '%', dec: 2 },
        { label: 'Глубина', unit: 'см', dec: 0 }
      ],
      apis: ['old']
    },
    soil_temperature: {
      label: 'Температура почвы', multi: true, byDepth: true,
      cols: [
        { label: 'Температура почвы', unit: '°C', dec: 2 },
        { label: 'Глубина', unit: 'см', dec: 0 }
      ],
      apis: ['old']
    },
    voltage: {
      label: 'Напряжение АКБ', multi: false,
      cols: [{ label: 'Напряжение', unit: 'В', dec: 2 }],
      apis: ['old']
    },
    tech_signal: {
      label: 'Технический сигнал (дисперсия)', multi: false,
      cols: [{ label: 'Дисперсия', unit: '', dec: 2 }],
      apis: ['old']
    },
    'gas:2': { label: 'Хлор (Cl₂)', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] },
    'gas:4': { label: 'Аммиак (NH₃)', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] },
    'gas:7': { label: 'Сумма углеводородов', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] },
    'gas:8': { label: 'Угарный газ (CO)', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] },
    'gas:9': { label: 'Сернистый газ (SO₂)', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] },
    'gas:10': { label: 'Диоксид азота (NO₂)', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] },
    'gas:11': { label: 'Оксид азота (NO)', multi: false, cols: [{ label: 'Концентрация', unit: 'мкг/м³', dec: 2 }], apis: ['old'] }
  };
  var MODE_ORDER = [
    'river_level', 'precipitation', 'temperature', 'humidity', 'abs_pressure',
    'dew_point', 'wind', 'discharge', 'waves', 'meds', 'global_radiation',
    'soil_humidity', 'soil_temperature', 'voltage', 'tech_signal',
    'gas:2', 'gas:4', 'gas:7', 'gas:8', 'gas:9', 'gas:10', 'gas:11'
  ];

  /* ------------------------------ Состояние ------------------------------ */
  var STATIONS = [];
  var STATION_BY_ID = {};
  var state = {
    station: null,
    mode: 'river_level',
    api: 'pub',  // 'pub' для pub.emercit.ru, 'old' для emercit.com
    from: null,
    to: null,
    rows: [],
    series: [],
    visible: [],
    loadedKey: '',
    loading: false,
    error: '',
    controller: null,
    geom: null
  };
  var cache = {};
  var hover = null;
  var rafId = null;

  /* ------------------------------- Утилиты ------------------------------- */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDateHuman(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtDateShort(d) { return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function fmtStampFull(d) {
    return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  var nfCache = {};
  function fmtNum(v, dec) {
    if (v == null || !isFinite(v)) return '—';
    var key = dec || 0;
    var nf = nfCache[key];
    if (!nf) {
      try { nf = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: key, maximumFractionDigits: key }); }
      catch (e) { nf = null; }
      nfCache[key] = nf;
    }
    if (nf) return nf.format(v);
    return v.toFixed(key).replace('.', ',');
  }
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ------------------------------ Каталог ------------------------------ */
  function stationGroup(s) {
    if (s.name.indexOf('АГК') === 0) return 'АГК';
    if (s.name.indexOf('ЭМЕРСИТ') === 0) return 'ЭМЕРСИТ';
    return 'Другие';
  }
  function filterStations(q) {
    q = String(q || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return STATIONS;
    var digits = q.replace(/\D/g, '');
    return STATIONS.filter(function (s) {
      var n = s.name.toLowerCase();
      if (n.indexOf(q) !== -1) return true;
      if (s.river && s.river.toLowerCase().indexOf(q) !== -1) return true;
      if (digits) {
        var nd = s.name.replace(/\D/g, '');
        if (nd === digits) return true;
        if (nd.replace(/^0+/, '') === digits.replace(/^0+/, '')) return true;
        if (String(s.id) === digits) return true;
      }
      return false;
    });
  }
  function fillStationSelect(list, keepId) {
    var sel = $('#stSelect');
    var groups = { 'АГК': [], 'ЭМЕРСИТ': [], 'Другие': [] };
    list.forEach(function (s) { groups[stationGroup(s)].push(s); });
    var html = '';
    ['АГК', 'ЭМЕРСИТ', 'Другие'].forEach(function (g) {
      if (!groups[g].length) return;
      html += '<optgroup label="' + g + ' (' + groups[g].length + ')">';
      groups[g].forEach(function (s) {
        html += '<option value="' + s.id + '">' + esc(s.name) + (s.archived ? ' · архив' : '') + '</option>';
      });
      html += '</optgroup>';
    });
    if (!html) html = '<option value="">Ничего не найдено</option>';
    sel.innerHTML = html;
    if (keepId && STATION_BY_ID[keepId]) sel.value = String(keepId);
    else if (list.length) sel.value = String(list[0].id);
  }
  function setStation(s, opts) {
    if (!s) return;
    state.station = s;
    $('#stSelect').value = String(s.id);
    updateStationMeta();
    rebuildModes(opts && opts.mode);
  }
  function updateStationMeta() {
    var s = state.station;
    if (!s) { $('#stMeta').textContent = '—'; return; }
    var sensors = (s.sensors || '').split(';').filter(Boolean).map(function (k) {
      return MODES[k] ? MODES[k].label : k;
    });
    var bits = ['ID ' + s.id];
    if (s.river) bits.push('Река: ' + s.river);
    if (isFinite(s.lat) && isFinite(s.lon)) bits.push(s.lat.toFixed(4) + '° N, ' + s.lon.toFixed(4) + '° E');
    if (s.archived) bits.push('<b>архивный пост</b>');
    var html = esc(bits.join(' · '));
    html += '<br>Датчики: ' + (sensors.length ? esc(sensors.join(', ')) : 'нет данных в каталоге');
    if (isFinite(s.lat) && isFinite(s.lon)) {
      html += ' · <a href="https://yandex.ru/maps/?pt=' + s.lon + ',' + s.lat + '&z=12&l=map" target="_blank" rel="noopener">на карте</a>';
    }
    $('#stMeta').innerHTML = html;
  }
  function availableModes(s, api) {
    var set = {};
    (s && s.sensors ? s.sensors : '').split(';').forEach(function (k) { if (k) set[k] = 1; });
    var keys = MODE_ORDER.filter(function (k) { return set[k] && MODES[k].apis && MODES[k].apis.indexOf(api) !== -1; });
    if (!keys.length) keys = MODE_ORDER.filter(function (k) { return MODES[k].apis && MODES[k].apis.indexOf(api) !== -1; });
    return keys;
  }
  function rebuildModes(prefer) {
    var sel = $('#modeSelect');
    var keys = availableModes(state.station, state.api);
    sel.innerHTML = keys.map(function (k) {
      return '<option value="' + k + '">' + esc(MODES[k].label) + '</option>';
    }).join('');
    var want = prefer || state.mode;
    if (keys.indexOf(want) === -1) {
      want = keys.indexOf('river_level') !== -1 ? 'river_level' : keys[0];
    }
    state.mode = want;
    sel.value = want;
    updateChartHeaderIdle();
  }

  /* ------------------------------- Даты ------------------------------- */
  function markPreset(days) {
    $$('#presets .epreset').forEach(function (b) {
      b.classList.toggle('is-on', String(b.getAttribute('data-days')) === String(days));
    });
  }
  function applyPreset(days) {
    var t = today();
    var from = days === 1 ? addDays(t, -1) : addDays(t, -(days - 1));
    $('#fromDate').value = ymd(from);
    $('#toDate').value = ymd(t);
    markPreset(days);
  }
  function syncPresetFromDates() {
    var f = parseYmd($('#fromDate').value), t = parseYmd($('#toDate').value);
    if (!f || !t) { markPreset(0); return; }
    var match = [1, 7, 30, 90, 365].filter(function (d) {
      var ff = d === 1 ? addDays(today(), -1) : addDays(today(), -(d - 1));
      return ymd(ff) === ymd(f) && ymd(today()) === ymd(t);
    })[0];
    markPreset(match || 0);
  }

  /* ------------------------------ Загрузка ------------------------------ */
  function getProxy() {
    try { return localStorage.getItem(PROXY_KEY) || DEFAULT_PROXY; } catch (e) { return DEFAULT_PROXY; }
  }
  function splitChunks(from, to) {
    var out = [], cur = new Date(from), end = new Date(to);
    while (cur <= end) {
      var e = addDays(cur, CHUNK_DAYS - 1);
      if (e > end) e = new Date(end);
      out.push({ a: ymd(cur), b: ymd(e) });
      cur = addDays(e, 1);
    }
    return out;
  }
  function parseCsv(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var lines = text.split(/\r?\n/), out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var cols = line.split(';');
      if (cols.length < 2) continue;
      var stamp = cols[0].trim();
      if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(stamp)) continue;
      var t = new Date(stamp.replace(' ', 'T'));
      if (isNaN(t.getTime())) continue;
      var vals = [];
      var rawVals = [];
      for (var j = 1; j < cols.length; j++) {
        var raw = cols[j].trim().replace(/\s+/g, '');
        rawVals.push(raw);
        var num = raw === '' ? NaN : parseFloat(raw.replace(',', '.'));
        vals.push(isNaN(num) ? null : num);
      }
      // Ключ включает значения: у почвенных датчиков несколько строк
      // с одинаковой отметкой времени (разные глубины).
      out.push({ t: t, stamp: stamp, key: stamp + '|' + rawVals.join(';'), vals: vals });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }
  function fetchOnce(url, signal) {
    var ctrl = new AbortController();
    var onAbort = function () { ctrl.abort(); };
    if (signal) {
      if (signal.aborted) ctrl.abort();
      else signal.addEventListener('abort', onAbort);
    }
    var timer = setTimeout(function () { ctrl.abort(); }, 100000);
    return fetch(url, { cache: 'no-store', signal: ctrl.signal }).then(function (r) {
      return r.text().then(function (text) { return { ok: r.ok, status: r.status, text: text }; });
    }).then(function (res) {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      return res;
    }, function (err) {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      throw err;
    });
  }
  function fetchChunkSmart(id, mode, a, b, signal, depth, api) {
    depth = depth || 0;
    var url;
    if (api === 'pub') {
      url = getProxy() + '?id=' + encodeURIComponent(id) +
        '&a=' + a + '&b=' + b + '&mode=' + encodeURIComponent(mode) +
        '&encoding=0&divider=0&point=0&nocache=' + Date.now() + '&api=pub';
    } else {
      url = getProxy() + '?id=' + encodeURIComponent(id) +
        '&a=' + a + '&b=' + b + '&mode=' + encodeURIComponent(mode) +
        '&encoding=0&divider=0&point=0&nocache=' + Date.now() + '&api=old';
    }
    return fetchOnce(url, signal).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var trimmed = r.text.trim();
      if (/^error code/i.test(trimmed)) throw new Error(trimmed);
      if (/missing required params/i.test(trimmed)) throw new Error('прокси отклонил запрос');
      return parseCsv(r.text);
    }).catch(function (err) {
      if (signal && signal.aborted) throw err;
      if (depth >= 3) throw err;
      var d0 = parseYmd(a), d1 = parseYmd(b);
      var span = d0 && d1 ? daysBetween(d0, d1) : 0;
      if (depth >= 1 && span >= 3) {
        var mid = addDays(d0, Math.floor(span / 2));
        var a2 = ymd(addDays(mid, 1));
        return Promise.all([
          fetchChunkSmart(id, mode, a, ymd(mid), signal, depth + 1, api),
          fetchChunkSmart(id, mode, a2, b, signal, depth + 1, api)
        ]).then(function (arr) { return arr[0].concat(arr[1]); });
      }
      return delay(1200 + depth * 900).then(function () {
        return fetchChunkSmart(id, mode, a, b, signal, depth + 1, api);
      });
    });
  }
  function mergeRows(parts) {
    var map = {}, out = [];
    parts.forEach(function (rows) {
      (rows || []).forEach(function (r) {
        if (!map[r.key]) { map[r.key] = r; out.push(r); }
      });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }
  function fetchAll(id, mode, from, to, onProgress, signal, api) {
    var key = id + '|' + mode + '|' + ymd(from) + '|' + ymd(to) + '|' + api;
    var c = cache[key];
    if (c && (Date.now() - c.at) < CACHE_TTL) {
      onProgress(1, 1);
      return Promise.resolve(c.rows);
    }
    var parts = splitChunks(from, to);
    var results = new Array(parts.length);
    var done = 0, next = 0;
    function step() {
      if (next >= parts.length) return Promise.resolve();
      var idx = next++;
      return fetchChunkSmart(id, mode, parts[idx].a, parts[idx].b, signal, 0, api).then(function (rows) {
        results[idx] = rows;
      }, function (err) {
        if (signal && signal.aborted) throw err;
        results[idx] = [];
        throw err;
      }).then(function () {
        done++;
        onProgress(done, parts.length);
        return step();
      });
    }
    var workers = [];
    for (var w = 0; w < Math.min(CONCURRENCY, parts.length); w++) workers.push(step());
    return Promise.all(workers).then(function () {
      var rows = mergeRows(results);
      cache[key] = { at: Date.now(), rows: rows };
      return rows;
    });
  }

  /* ------------------------------- Ряды ------------------------------- */
  function buildSeries(rows, mode) {
    var meta = MODES[mode] || {};
    var out = [];
    if (meta.byDepth) {
      var groups = {};
      rows.forEach(function (r) {
        var v = r.vals[0];
        var d = r.vals[1];
        if (v == null) return;
        var depth = d == null ? null : d;
        var key = depth == null ? '—' : String(depth);
        if (!groups[key]) groups[key] = { depth: depth, points: [] };
        groups[key].points.push({ t: r.t, v: v });
      });
      Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) {
        return (a.depth == null ? 1e9 : a.depth) - (b.depth == null ? 1e9 : b.depth);
      }).forEach(function (g) {
        var label = g.depth == null ? 'Глубина не указана' : 'Глубина ' + fmtNum(g.depth, 0) + ' см';
        out.push({
          label: label, short: label, unit: meta.cols[0].unit, dec: meta.cols[0].dec,
          points: g.points, col: 0, depth: g.depth
        });
      });
      return out;
    }
    var ncols = 0;
    rows.forEach(function (r) { if (r.vals.length > ncols) ncols = r.vals.length; });
    for (var i = 0; i < ncols; i++) {
      var pts = [];
      rows.forEach(function (r) { if (r.vals[i] != null) pts.push({ t: r.t, v: r.vals[i] }); });
      if (!pts.length) continue;
      var def = (meta.cols && meta.cols[i]) || { label: 'Ряд ' + (i + 1), unit: '', dec: 2 };
      out.push({
        label: def.label, short: def.label, unit: def.unit, dec: def.dec,
        points: pts, col: i
      });
    }
    return out;
  }
  function defaultVisible(series, mode) {
    var meta = MODES[mode] || {};
    var vis = series.map(function (s, i) {
      if (meta.multi) return true;
      if (meta.defaultSeries != null) return i === meta.defaultSeries;
      return i === 0;
    });
    if (vis.length && vis.indexOf(true) === -1) vis[0] = true;
    return vis;
  }

  /* ------------------------------ График ------------------------------ */
  var canvas = $('#chart');
  var ctx = canvas.getContext('2d');
  var wrap = $('#chartWrap');
  var tip = $('#tip');

  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width || canvas.clientWidth || 600));
    var h = Math.max(1, Math.round(rect.height || canvas.clientHeight || 320));
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }
  function msg(text, dim) {
    var s = sizeCanvas();
    ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = dim ? 'rgba(108,125,116,.7)' : 'rgba(61,77,69,.8)';
    ctx.font = '13px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, s.w / 2, s.h / 2);
  }
  function niceScale(min, max, count) {
    if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
    if (min === max) {
      var d = Math.abs(min) * 0.1 || 1;
      min -= d; max += d;
    }
    var span = max - min;
    var raw = span / count;
    var step = Math.pow(10, Math.floor(Math.log10(raw)));
    var err = raw / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    step = +step.toPrecision(12);
    var lo = Math.floor(min / step) * step;
    var hi = Math.ceil(max / step) * step;
    lo = +lo.toPrecision(12);
    hi = +hi.toPrecision(12);
    if (lo === hi) hi = lo + step;
    var ticks = [];
    for (var v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return { min: lo, max: hi, step: step, ticks: ticks };
  }
  function decimalsForStep(step) {
    var s = String(step);
    var e = s.indexOf('e-');
    if (e !== -1) return Math.min(6, parseInt(s.slice(e + 2), 10));
    var dot = s.indexOf('.');
    return dot === -1 ? 0 : s.length - dot - 1;
  }
  function fmtAxis(v, step) {
    return v.toFixed(decimalsForStep(step)).replace('.', ',');
  }
  function fmtTick(d, span) {
    if (span <= 2 * 864e5) return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    if (span <= 40 * 864e5) return d.getDate() + ' ' + MONTHS[d.getMonth()];
    if (span <= 400 * 864e5) return MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
    return String(d.getFullYear());
  }
  function reducePoints(points, buckets) {
    if (points.length <= buckets * 2) return points;
    var t0 = points[0].t.getTime(), t1 = points[points.length - 1].t.getTime();
    var span = t1 - t0 || 1;
    var out = [], bucket = -1, mn = null, mx = null;
    function flush() {
      if (!mn) return;
      if (mn.t <= mx.t) { out.push(mn); if (mx !== mn) out.push(mx); }
      else { out.push(mx); if (mn !== mx) out.push(mn); }
    }
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var b = Math.floor((p.t.getTime() - t0) / span * buckets);
      if (b !== bucket) { flush(); bucket = b; mn = p; mx = p; }
      else {
        if (p.v < mn.v) mn = p;
        if (p.v > mx.v) mx = p;
      }
    }
    flush();
    return out;
  }
  function visibleSeries() {
    var out = [];
    state.series.forEach(function (s, i) {
      if (state.visible[i]) out.push({ s: s, color: COLORS[i % COLORS.length], idx: i });
    });
    return out;
  }
  function domainOf(vis) {
    var tmin = Infinity, tmax = -Infinity, vmin = Infinity, vmax = -Infinity;
    vis.forEach(function (o) {
      o.s.points.forEach(function (p) {
        if (p.t < tmin) tmin = p.t;
        if (p.t > tmax) tmax = p.t;
        if (p.v < vmin) vmin = p.v;
        if (p.v > vmax) vmax = p.v;
      });
    });
    return { tmin: tmin, tmax: tmax, vmin: vmin, vmax: vmax };
  }
  function draw() {
    var s = sizeCanvas();
    var w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    if (!state.rows.length) {
      msg(state.loading ? 'Загрузка данных…' : (state.error ? 'Данные недоступны' : 'Выберите пост и нажмите «Построить график»'), !state.loading);
      state.geom = null;
      return;
    }
    var vis = visibleSeries();
    if (!vis.length) { msg('Включите хотя бы один ряд в легенде', true); state.geom = null; return; }
    var meta = MODES[state.mode] || {};
    var pad = { l: 62, r: 16, t: 16, b: 36 };
    var cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    var dom = domainOf(vis);
    if (!isFinite(dom.tmin) || !isFinite(dom.vmin)) { msg('Нет числовых данных', true); return; }
    if (meta.bar) {
      var anyRain = false;
      vis.forEach(function (o) { o.s.points.forEach(function (p) { if (p.v > 0) anyRain = true; }); });
      if (!anyRain) { msg('Осадков за выбранный период не было', true); state.geom = null; return; }
    }
    var vmin = dom.vmin, vmax = dom.vmax;
    if (meta.bar) vmin = Math.min(0, vmin);
    var sc = niceScale(vmin, vmax, 5);
    var tmin = dom.tmin.getTime(), tmax = dom.tmax.getTime();
    if (tmax === tmin) { tmax = tmin + 60000; }
    function X(t) { return pad.l + (t - tmin) / (tmax - tmin || 1) * cw; }
    function Y(v) { return pad.t + ch - (v - sc.min) / (sc.max - sc.min || 1) * ch; }
    state.geom = { tmin: tmin, tmax: tmax, pad: pad, cw: cw, ch: ch, sc: sc, w: w, h: h };

    ctx.font = '11.5px Manrope, system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(21,31,27,.09)';
    ctx.lineWidth = 1;
    sc.ticks.forEach(function (v) {
      var y = Math.round(Y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + cw, y);
      ctx.stroke();
      ctx.fillStyle = '#6c7d74';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(fmtAxis(v, sc.step), pad.l - 9, y);
    });
    var nt = w < 520 ? 3 : (w < 760 ? 4 : 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6c7d74';
    for (var i = 0; i < nt; i++) {
      var t = tmin + (tmax - tmin) * (nt === 1 ? 0 : i / (nt - 1));
      var x = Math.round(X(t)) + 0.5;
      if (i > 0 && i < nt - 1) {
        ctx.beginPath();
        ctx.moveTo(x, pad.t);
        ctx.lineTo(x, pad.t + ch);
        ctx.stroke();
      }
      ctx.fillText(fmtTick(new Date(t), tmax - tmin), Math.min(Math.max(x, pad.l + 20), pad.l + cw - 20), pad.t + ch + 9);
    }

    vis.forEach(function (o) {
      var pts = o.s.points;
      if (!pts.length) return;
      if (meta.bar) {
        var bw = Math.max(1, Math.min(7, cw / Math.max(1, pts.length) * 0.7));
        ctx.fillStyle = hexA(o.color, 0.72);
        pts.forEach(function (p) {
          var x = X(p.t), y0 = Y(0), y1 = Y(p.v);
          ctx.fillRect(x - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0)));
        });
        return;
      }
      var red = reducePoints(pts, Math.max(80, Math.floor(cw)));
      if (vis.length === 1 && red.length > 1) {
        ctx.beginPath();
        red.forEach(function (p, k) {
          var xx = X(p.t), yy = Y(p.v);
          if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        });
        ctx.lineTo(X(red[red.length - 1].t), pad.t + ch);
        ctx.lineTo(X(red[0].t), pad.t + ch);
        ctx.closePath();
        ctx.fillStyle = hexA(o.color, 0.07);
        ctx.fill();
      }
      ctx.beginPath();
      red.forEach(function (p, k) {
        var xx = X(p.t), yy = Y(p.v);
        if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      });
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    if (hover && hover.t != null && state.geom) {
      var hx = Math.round(X(hover.t.getTime())) + 0.5;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(21,31,27,.35)';
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ch);
      ctx.stroke();
      ctx.restore();
      vis.forEach(function (o) {
        var p = nearestPoint(o.s.points, hover.t);
        if (!p) return;
        var yy = Y(p.v);
        ctx.beginPath();
        ctx.arc(X(p.t), yy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = o.color;
        ctx.stroke();
      });
    }
  }
  function scheduleDraw() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () { rafId = null; draw(); });
  }
  function nearestPoint(points, t) {
    if (!points || !points.length) return null;
    var lo = 0, hi = points.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (points[mid].t < t) lo = mid + 1; else hi = mid;
    }
    var a = points[Math.max(0, lo - 1)], b = points[Math.min(points.length - 1, lo)];
    return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a : b;
  }

  /* --------------------------- Наведение / тултип --------------------------- */
  function hideTip() {
    tip.classList.remove('is-on');
    hover = null;
    scheduleDraw();
  }
  canvas.addEventListener('pointermove', function (e) {
    if (!state.geom || !state.series.length) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var g = state.geom;
    if (x < g.pad.l || x > rect.width - g.pad.r || y < 0 || y > rect.height) { hideTip(); return; }
    var t = g.tmin + (x - g.pad.l) / g.cw * (g.tmax - g.tmin);
    var vis = visibleSeries();
    if (!vis.length) return;
    var primaryPoint = nearestPoint(vis[0].s.points, t);
    if (!primaryPoint) return;
    hover = { t: primaryPoint.t };
    scheduleDraw();

    var wrapRect = wrap.getBoundingClientRect();
    var html = '<b>' + fmtStampFull(primaryPoint.t) + '</b>';
    vis.forEach(function (o) {
      var p = nearestPoint(o.s.points, primaryPoint.t);
      if (!p) return;
      html += '<span class="trow"><i style="background:' + o.color + '"></i><span>' + esc(o.s.label) + '</span><strong>' +
        fmtNum(p.v, o.s.dec) + (o.s.unit ? ' ' + esc(o.s.unit) : '') + '</strong></span>';
    });
    tip.innerHTML = html;
    tip.classList.add('is-on');
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var cx = e.clientX - wrapRect.left;
    var cy = e.clientY - wrapRect.top;
    var left = cx + 16;
    if (left + tw > wrapRect.width - 6) left = cx - tw - 16;
    if (left < 6) left = 6;
    var top = cy - th - 14;
    if (top < 6) top = cy + 18;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  });
  canvas.addEventListener('pointerleave', hideTip);
  canvas.addEventListener('pointercancel', hideTip);
  window.addEventListener('resize', function () { hideTip(); scheduleDraw(); });

  /* ------------------------------ Отрисовка UI ------------------------------ */
  function updateChartHeaderIdle() {
    var s = state.station, meta = MODES[state.mode];
    if (!s || !meta) return;
    var title = s.name + (s.river ? ' (' + s.river + ')' : '') + ' · ' + meta.label;
    $('#chartTitle').textContent = title;
    $('#chartSub').textContent = 'Задайте сроки и нажмите «Построить график»';
    $('#chartMeta').textContent = meta.cols[0].unit || '—';
  }
  function renderChips() {
    var box = $('#chips');
    if (state.series.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = state.series.map(function (s, i) {
      return '<button class="echip' + (state.visible[i] ? ' is-on' : '') + '" type="button" data-i="' + i + '" data-c="' + (i % COLORS.length) + '" aria-pressed="' + (state.visible[i] ? 'true' : 'false') + '">' +
        '<i style="background:' + COLORS[i % COLORS.length] + '"></i>' + esc(s.label) + '</button>';
    }).join('');
  }
  function renderStats() {
    var vis = visibleSeries();
    var box = $('#stats');
    var note = $('#statsNote');
    if (!vis.length) { box.hidden = true; if (note) note.textContent = ''; return; }
    var s = vis[0].s;
    var pts = s.points;
    var vmin = Infinity, vmax = -Infinity, sum = 0;
    pts.forEach(function (p) { if (p.v < vmin) vmin = p.v; if (p.v > vmax) vmax = p.v; sum += p.v; });
    var last = pts[pts.length - 1].v;
    var avg = sum / pts.length;
    box.hidden = false;
    $('#statLast').textContent = fmtNum(last, s.dec) + (s.unit ? ' ' + s.unit : '');
    $('#statMin').textContent = fmtNum(vmin, s.dec) + (s.unit ? ' ' + s.unit : '');
    $('#statMax').textContent = fmtNum(vmax, s.dec) + (s.unit ? ' ' + s.unit : '');
    $('#statAvg').textContent = fmtNum(avg, s.dec) + (s.unit ? ' ' + s.unit : '');
    if (note) note.textContent = 'Ряд: ' + s.label + ' · ' + pts.length + ' измерений.';
  }
  function renderTable() {
    var wrapEl = $('#tableWrap');
    var table = $('#table');
    var sub = $('#tableSub');
    var pill = $('#tablePill');
    var note = $('#tableNote');
    if (!state.series.length) {
      wrapEl.hidden = true;
      sub.textContent = 'Появится после загрузки';
      pill.textContent = '—';
      note.textContent = 'Показания постов обновляются каждые 10 минут; время в источнике — местное (МСК).';
      return;
    }
    var rows = state.rows;
    var limit = 200;
    var slice = rows.length > limit ? rows.slice(rows.length - limit) : rows;
    var meta = MODES[state.mode];
    var head, body;
    if (meta.byDepth) {
      head = '<tr><th>Дата и время</th><th>' + esc(meta.cols[0].label) + ', ' + esc(meta.cols[0].unit) +
        '</th><th>' + esc(meta.cols[1].label) + ', ' + esc(meta.cols[1].unit) + '</th></tr>';
      body = slice.map(function (r) {
        return '<tr><td>' + esc(r.stamp) + '</td><td>' +
          (r.vals[0] == null ? '—' : fmtNum(r.vals[0], meta.cols[0].dec)) + '</td><td>' +
          (r.vals[1] == null ? '—' : fmtNum(r.vals[1], meta.cols[1].dec)) + '</td></tr>';
      }).join('');
      sub.textContent = 'Значение и глубина датчика';
    } else {
      var cols = state.series;
      head = '<tr><th>Дата и время</th>' + cols.map(function (s) {
        return '<th>' + esc(s.label) + (s.unit ? ', ' + esc(s.unit) : '') + '</th>';
      }).join('') + '</tr>';
      body = slice.map(function (r) {
        var cells = '<td>' + esc(r.stamp) + '</td>';
        cells += cols.map(function (s) {
          var v = r.vals[s.col];
          return '<td>' + (v == null ? '—' : fmtNum(v, s.dec)) + '</td>';
        }).join('');
        return '<tr>' + cells + '</tr>';
      }).join('');
      sub.textContent = 'Все числовые колонки выбранного параметра';
    }
    table.tHead.innerHTML = head;
    table.tBodies[0].innerHTML = body;
    wrapEl.hidden = false;
    pill.textContent = rows.length + ' строк';
    note.textContent = rows.length > limit
      ? 'Показаны последние ' + limit + ' из ' + rows.length + ' строк. Полные данные — в CSV.'
      : 'Показаны все ' + rows.length + ' строк. Время в источнике — местное (МСК).';
  }
  function setStatus(text, kind) {
    var el = $('#status');
    el.className = 'estatus' + (kind ? ' ' + kind : '');
    el.innerHTML = text;
  }
  function setProgress(done, total) {
    var p = $('#progress');
    if (!total) { p.classList.remove('is-on'); p.querySelector('i').style.width = '0'; return; }
    p.classList.add('is-on');
    var pct = Math.round(done / total * 100);
    p.querySelector('i').style.width = pct + '%';
    p.setAttribute('aria-valuenow', String(pct));
    if (done >= total) {
      setTimeout(function () { p.classList.remove('is-on'); }, 600);
    }
  }
  function setBusy(busy) {
    state.loading = busy;
    $('#loadBtn').disabled = busy;
    $('#downloadBtn').disabled = busy;
    $('#loadBtn').innerHTML = busy
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg> Загрузка…'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg> Построить график';
  }

  /* ------------------------------ Загрузка UI ------------------------------ */
  function currentKey() {
    return state.station ? (state.station.id + '|' + state.mode + '|' + ymd(state.from) + '|' + ymd(state.to) + '|' + state.api) : '';
  }
  function updateUrl() {
    if (!state.station) return;
    var q = '?station=' + encodeURIComponent(state.station.name) +
      '&mode=' + encodeURIComponent(state.mode) +
      '&api=' + encodeURIComponent(state.api) +
      '&from=' + ymd(state.from) + '&to=' + ymd(state.to);
    try { history.replaceState(null, '', q); } catch (e) { /* ignore */ }
  }
  function load(opts) {
    opts = opts || {};
    if (state.loading) return Promise.resolve(false);
    var from = parseYmd($('#fromDate').value);
    var to = parseYmd($('#toDate').value);
    if (!from || !to) {
      setStatus('Укажите обе даты: «с» и «по».', 'err');
      return Promise.resolve(false);
    }
    if (from > to) {
      setStatus('Дата начала позже даты окончания — поменяйте местами.', 'err');
      return Promise.resolve(false);
    }
    var span = daysBetween(from, to) + 1;
    if (span > MAX_DAYS) {
      setStatus('Слишком длинный период: ' + span + ' дней. Максимум — ' + MAX_DAYS + ' дней (один запрос ≈ 10 дней, большие сроки склеиваются автоматически).', 'err');
      return Promise.resolve(false);
    }
    if (!state.station) {
      setStatus('Выберите гидропост из списка.', 'err');
      return Promise.resolve(false);
    }
    state.from = from;
    state.to = to;
    var station = state.station, mode = state.mode;
    var myController = new AbortController();
    if (state.controller) state.controller.abort();
    state.controller = myController;

    setBusy(true);
    state.error = '';
    setProgress(0, 0);
    draw();
    var apiLabel = state.api === 'pub' ? 'pub.emercit.ru' : 'emercit.com';
    setStatus('Запрос к ' + apiLabel + ': ' + station.name + (station.river ? ' (' + station.river + ')' : '') + ' · ' + MODES[mode].label + ' · ' + fmtDateShort(from) + ' — ' + fmtDateShort(to) + '…');
    updateChartHeaderIdle();
    $('#chartSub').textContent = 'Загрузка…';

    return fetchAll(station.id, mode, from, to, function (done, total) {
      if (state.controller !== myController) return;
      setProgress(done, total);
      if (total > 1 && done < total) setStatus('Загружено частей: ' + done + ' из ' + total + '…');
    }, myController.signal, state.api).then(function (rows) {
      if (state.controller !== myController) return false;
      state.rows = rows;
      state.error = '';
      state.loadedKey = currentKey();
      state.series = buildSeries(rows, mode);
      state.visible = defaultVisible(state.series, mode);
      renderChips();
      renderStats();
      renderTable();
      draw();
      var apiLabel = state.api === 'pub' ? 'pub.emercit.ru' : 'emercit.com';
      $('#chartSub').textContent = fmtDateShort(from) + ' — ' + fmtDateShort(to) + ' · ' +
        (rows.length ? rows.length + ' измерений' : 'данных нет') + ' · ' + apiLabel;
      $('#chartMeta').textContent = MODES[mode].cols[0].unit || '—';
      if (!rows.length) {
        setStatus('За выбранный период данных нет. Попробуйте другие сроки — возможно, пост не передавал показания.', 'err');
      } else {
        var visibleCount = state.visible.filter(Boolean).length;
        setStatus('Готово: <b>' + rows.length + '</b> строк, рядов: ' + state.series.length +
          (visibleCount < state.series.length ? ' (включено ' + visibleCount + ')' : '') +
          '. Период: ' + fmtDateShort(from) + ' — ' + fmtDateShort(to) + '.', 'ok');
      }
      updateUrl();
      if (opts.download) downloadCsv();
      return true;
    }).catch(function (err) {
      if (state.controller !== myController) return false;
      if (myController.signal.aborted) return false;
      state.rows = [];
      state.series = [];
      state.visible = [];
      state.loadedKey = '';
      state.error = err && err.message ? err.message : 'error';
      renderChips();
      renderStats();
      renderTable();
      draw();
      $('#chartSub').textContent = 'Не удалось загрузить данные';
      var reason = err && err.message ? err.message : 'неизвестная ошибка';
      setStatus('Ошибка загрузки: ' + esc(reason) + '. Проверьте соединение и попробуйте ещё раз; если прокси недоступен, укажите другой в блоке «Не загружается?».', 'err');
      return false;
    }).then(function (res) {
      if (state.controller === myController) setBusy(false);
      return res;
    });
  }

  /* ------------------------------ CSV ------------------------------ */
  function csvNumber(v, dec, decSep) {
    if (v == null || !isFinite(v)) return '';
    var s = v.toFixed(dec);
    if (decSep !== '.') s = s.replace('.', decSep);
    return s;
  }
  function buildCsv() {
    var fmt = $('#csvFmt').value;
    var sep = fmt === 'comma' ? ',' : ';';
    var decSep = fmt === 'excel' ? ',' : '.';
    var mode = state.mode;
    var meta = MODES[mode];
    var head, lines = [];
    if (meta.byDepth) {
      head = ['Дата и время', meta.cols[0].label + ', ' + meta.cols[0].unit, meta.cols[1].label + ', ' + meta.cols[1].unit];
      state.rows.forEach(function (r) {
        if (r.vals[0] == null) return;
        lines.push([r.stamp, csvNumber(r.vals[0], meta.cols[0].dec, decSep), csvNumber(r.vals[1], meta.cols[1].dec, decSep)].join(sep));
      });
    } else {
      var cols = state.series;
      head = ['Дата и время'].concat(cols.map(function (s) {
        return s.label + (s.unit ? ', ' + s.unit : '');
      }));
      state.rows.forEach(function (r) {
        var cells = [r.stamp];
        cols.forEach(function (s) { cells.push(csvNumber(r.vals[s.col], s.dec, decSep)); });
        lines.push(cells.join(sep));
      });
    }
    return '\uFEFF' + head.join(sep) + '\r\n' + lines.join('\r\n') + '\r\n';
  }
  function downloadCsv() {
    if (!state.rows.length || !state.series.length) {
      setStatus('Нет данных для выгрузки — сначала постройте график.', 'err');
      return;
    }
    var text = buildCsv();
    var name = (state.station ? state.station.name : 'post').replace(/[^\wА-Яа-яЁё\-]+/g, '_') +
      '_' + state.mode.replace(':', '-') + '_' + ymd(state.from) + '_' + ymd(state.to) + '.csv';
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
    setStatus('Файл ' + esc(name) + ' сформирован: ' + state.rows.length + ' строк.', 'ok');
  }

  /* ------------------------------ События ------------------------------ */
  function bind() {
    var form = $('#epanel');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); load(); });

    var attachSearchListener = function () {
      var search = $('#stSearch');
      if (!search) {
        // Элемент ещё не готов — пробуем через 50 мс
        setTimeout(attachSearchListener, 50);
        return;
      }
      if (search._listenerAttached) return;
      search._listenerAttached = true;
      search.addEventListener('input', function () {
        var list = filterStations(search.value);
        fillStationSelect(list, null);
        if (list.length) {
          var s = STATION_BY_ID[$('#stSelect').value];
          if (s && (!state.station || state.station.id !== s.id)) setStation(s);
        } else {
          $('#stMeta').textContent = 'По запросу «' + search.value.trim() + '» ничего не найдено';
        }
      };
    };
    attachSearchListener();

    $('#stSelect').addEventListener('change', function () {
      var s = STATION_BY_ID[this.value];
      if (s) setStation(s);
    });

    $('#modeSelect').addEventListener('change', function () {
      state.mode = this.value;
      updateChartHeaderIdle();
      $('#chartSub').textContent = 'Нажмите «Построить график», чтобы обновить данные';
    });

    $('#apiSelect').addEventListener('change', function () {
      state.api = this.value;
      rebuildModes();
      updateUrl();
      // Перезагрузить данные при смене API
      if (state.station && state.rows.length) {
        load();
      }
    });

    $('#presets').addEventListener('click', function (e) {
      var b = e.target.closest('.epreset');
      if (!b) return;
      applyPreset(parseInt(b.getAttribute('data-days'), 10));
    });
    ['#fromDate', '#toDate'].forEach(function (sel) {
      $(sel).addEventListener('change', syncPresetFromDates);
    });

    $('#downloadBtn').addEventListener('click', function () {
      if (state.loading) return;
      var from = parseYmd($('#fromDate').value);
      var to = parseYmd($('#toDate').value);
      if (!from || !to || !state.station) {
        setStatus('Выберите пост и корректные даты, затем повторите.', 'err');
        return;
      }
      var key = state.station.id + '|' + state.mode + '|' + ymd(from) + '|' + ymd(to) + '|' + state.api;
      if (key !== state.loadedKey || !state.rows.length) load({ download: true });
      else downloadCsv();
    });

    $('#chips').addEventListener('click', function (e) {
      var b = e.target.closest('.echip');
      if (!b) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      state.visible[i] = !state.visible[i];
      renderChips();
      renderStats();
      draw();
      if (!visibleSeries().length) setStatus('Все ряды выключены — включите хотя бы один в легенде.', 'err');
    });

    // Прокси
    var proxyInput = $('#proxyInput');
    proxyInput.value = getProxy();
    $('#proxySave').addEventListener('click', function () {
      var v = proxyInput.value.trim();
      try {
        if (v) localStorage.setItem(PROXY_KEY, v);
        else localStorage.removeItem(PROXY_KEY);
      } catch (e) { /* ignore */ }
      setStatus('Прокси сохранён: ' + esc(v || DEFAULT_PROXY), 'ok');
    });
    $('#proxyReset').addEventListener('click', function () {
      try { localStorage.removeItem(PROXY_KEY); } catch (e) { /* ignore */ }
      proxyInput.value = DEFAULT_PROXY;
      setStatus('Вернули стандартный прокси.', 'ok');
    });

    // Мобильное меню / шапка / наверх — как на остальных страницах
    var header = $('#header');
    var burger = $('#burger');
    var mnav = $('#mnav');
    function setMenu(open) {
      document.body.classList.toggle('menu-open', open);
      mnav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      mnav.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    burger.addEventListener('click', function () { setMenu(!mnav.classList.contains('is-open')); });
    $$('#mnav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    function onScroll() {
      header.classList.toggle('is-stuck', window.scrollY > 12);
      $('#toTop').classList.toggle('is-on', window.scrollY > 700);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    $('#toTop').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      $$('.reveal').forEach(function (el) { io.observe(el); });
      setTimeout(function () { $$('.reveal').forEach(function (el) { el.classList.add('is-in'); }); }, 1400);
    } else {
      $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* ------------------------------ Старт ------------------------------ */
  function init() {
    STATIONS = (window.EMERCIT_STATIONS || []).slice();
    if (!STATIONS.length) {
      setStatus('Каталог гидропостов не загрузился. Обновите страницу.', 'err');
      draw();
      return;
    }
    STATIONS.forEach(function (s) { STATION_BY_ID[s.id] = s; });

    var levelCount = STATIONS.filter(function (s) { return (s.sensors || '').indexOf('river_level') !== -1; }).length;
    $('#statStations').textContent = STATIONS.length;
    $('#statLevel').textContent = levelCount;
    var apiLabel = state.api === 'pub' ? 'pub.emercit.ru' : 'emercit.com';
    $('#catalogPill').textContent = STATIONS.length + ' постов · каталог ' + apiLabel;

    fillStationSelect(STATIONS, null);

    var q = new URLSearchParams(window.location.search);
    var stName = q.get('station');
    var stId = q.get('id');
    var apiParam = q.get('api');
    if (apiParam === 'pub' || apiParam === 'old') {
      state.api = apiParam;
      $('#apiSelect').value = apiParam;
      apiLabel = state.api === 'pub' ? 'pub.emercit.ru' : 'emercit.com';
      $('#catalogPill').textContent = STATIONS.length + ' постов · каталог ' + apiLabel;
    }
    var st = null;
    if (stName) {
      var needle = stName.trim().toLowerCase();
      st = STATIONS.filter(function (s) { return s.name.toLowerCase() === needle; })[0] || null;
      if (!st) {
        var digits = stName.replace(/\D/g, '');
        if (digits) {
          st = STATIONS.filter(function (s) {
            return s.name.replace(/\D/g, '').replace(/^0+/, '') === digits.replace(/^0+/, '');
          })[0] || null;
        }
      }
    }
    if (!st && stId && STATION_BY_ID[stId]) st = STATION_BY_ID[stId];
    if (!st) st = STATION_BY_ID[203] || STATIONS.filter(function (s) { return s.name.indexOf('АГК') === 0; })[0] || STATIONS[0];

    setStation(st, { mode: q.get('mode') || undefined });

    var fromQ = parseYmd(q.get('from'));
    var toQ = parseYmd(q.get('to'));
    if (fromQ && toQ && fromQ <= toQ) {
      $('#fromDate').value = ymd(fromQ);
      $('#toDate').value = ymd(toQ);
      syncPresetFromDates();
    } else {
      applyPreset(7);
    }

    bind();
    draw();
    // Первая загрузка — сразу, чтобы страница не выглядела пустой.
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// Renderer girisi. Veri yalnizca window.izci (preload kopru) uzerinden gelir.
import { formatBytes, usedPercent } from '../core/bytes.js';
import {
  defaultPercents,
  applyResize,
  serializePercents,
  parsePercents,
} from '../core/columns.js';
import { t, resolveLang, LANGS, DEFAULT_LANG } from '../core/i18n.js';

const api = window.izci;
const driveList = document.getElementById('driveList');
const allList = document.getElementById('allList');
const empty = document.getElementById('empty');
const emptyAll = document.getElementById('emptyAll');
const refreshBtn = document.getElementById('refreshBtn');
const langSelect = document.getElementById('langSelect');
const viewDrives = document.getElementById('viewDrives');
const viewAdd = document.getElementById('viewAdd');
const viewSearch = document.getElementById('viewSearch');
const viewBrowse = document.getElementById('viewBrowse');
const searchInput = document.getElementById('search');
const searchSummary = document.getElementById('searchSummary');
const resultWrap = document.getElementById('resultWrap');
const resultViewport = document.getElementById('resultViewport');
const resultSpacer = document.getElementById('resultSpacer');
const resultRows = document.getElementById('resultRows');
const browseBack = document.getElementById('browseBack');
const browseCrumb = document.getElementById('browseCrumb');
const browseWrap = document.getElementById('browseWrap');
const browseViewport = document.getElementById('browseViewport');
const browseSpacer = document.getElementById('browseSpacer');
const browseRows = document.getElementById('browseRows');
const browseEmpty = document.getElementById('browseEmpty');
const driveTotals = document.getElementById('driveTotals');

const LANG_KEY = 'izci.lang';
let lang = resolveLang(localStorage.getItem(LANG_KEY) || DEFAULT_LANG);

// Ceviri kisayolu (aktif dil).
function tr(key, params) {
  return t(lang, key, params);
}

// Son render edilen veriler (dil degisince yeniden cizmek icin).
let lastIndexedDrives = [];
let lastAllDrives = [];
let lastSearchResults = null; // null = sonuc yok, [] = sonuc yok ama arandi
let lastBrowseRows = null;

// ---- Dil degisimi ----
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    // format: "placeholder:key"
    for (const spec of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = spec.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, tr(key));
    }
  });
  document.documentElement.lang = lang;
}

function setLang(next) {
  lang = resolveLang(next);
  localStorage.setItem(LANG_KEY, lang);
  langSelect.value = lang;
  applyStaticTranslations();
  // Dinamik icerikleri yeniden ciz.
  refreshAll();
  if (lastSearchResults !== null) {
    const q = searchInput.value.trim();
    if (q) renderSearchResults(lastSearchResults, q);
    else clearResults();
  }
  if (lastBrowseRows !== null) {
    browseList.setItems(lastBrowseRows, browseRowHtml, onBrowseRowClick);
    renderCrumb(browseState.parentId, browseState.driveLabel);
  }
}

let currentView = 'drives';

function showView(view) {
  currentView = view;
  viewDrives.classList.toggle('hidden', view !== 'drives');
  viewAdd.classList.toggle('hidden', view !== 'add');
  viewSearch.classList.toggle('hidden', view !== 'search');
  viewBrowse.classList.toggle('hidden', view !== 'browse');
  document.querySelectorAll('.navitem').forEach((x) =>
    x.classList.toggle('active', x.dataset.view === view)
  );
}

// Etiket modali (window.prompt Electron'da calismaz)
const labelModal = document.getElementById('labelModal');
const labelInput = document.getElementById('labelInput');
const labelModalSub = document.getElementById('labelModalSub');

// Modal acar. Kaydet -> girilen metin (bos string dahil, etiketi silmek icin),
// Iptal -> undefined (islem yapilmaz).
function askLabel(drive) {
  return new Promise((resolve) => {
    labelModalSub.textContent = `${drive.currentLetter || ''} ${drive.fsType || ''}`.trim();
    labelInput.value = drive.customLabel || '';
    labelModal.classList.remove('hidden');
    labelInput.focus();
    labelInput.select();

    function cleanup() {
      labelModal.classList.add('hidden');
      document.getElementById('labelSave').removeEventListener('click', onSave);
      document.getElementById('labelCancel').removeEventListener('click', onCancel);
      labelInput.removeEventListener('keydown', onKey);
      labelModal.removeEventListener('click', onBackdrop);
    }
    function onSave() { const v = labelInput.value.trim(); cleanup(); resolve(v); }
    function onCancel() { cleanup(); resolve(undefined); }
    function onKey(e) { if (e.key === 'Enter') onSave(); else if (e.key === 'Escape') onCancel(); }
    function onBackdrop(e) { if (e.target === labelModal) onCancel(); }

    document.getElementById('labelSave').addEventListener('click', onSave);
    document.getElementById('labelCancel').addEventListener('click', onCancel);
    labelInput.addEventListener('keydown', onKey);
    labelModal.addEventListener('click', onBackdrop);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Disk karti ikonu (Material disk) - inline SVG, temaya currentColor ile uyar.
const DISK_ICON_PATH =
  'M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80H240Zm0-80h480v-640H240v640Zm80-80h320v-80H320v80Zm160-160q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-120q-17 0-28.5-11.5T440-560q0-17 11.5-28.5T480-600q17 0 28.5 11.5T520-560q0 17-11.5 28.5T480-520Zm0-40Z';
function diskIconSvg() {
  return `<svg viewBox="0 -960 960 960" fill="none"><path d="${DISK_ICON_PATH}" fill="#AEB8C6"/><rect x="320" y="-320" width="320" height="80" fill="#4D8DFF"/></svg>`;
}

function driveCard(d, { inAddView }) {
  const pct = usedPercent(d.usedBytes, d.totalBytes);
  const label = d.customLabel || d.volumeLabel || tr('card.noLabel');
  const el = document.createElement('div');
  el.className = 'card' + (d.connected ? '' : ' offline');
  const statusClass = d.connected ? 'on' : 'off';
  const statusText = d.connected ? tr('card.connected') : tr('card.disconnected');

  el.innerHTML = `
    <div class="status ${statusClass}"><span class="dot"></span> ${statusText}</div>
    <div class="card-head">
      <div class="drive-ic">${diskIconSvg()}</div>
      <div>
        <div class="card-title">${escapeHtml(label)}
          <span class="letter">${escapeHtml(d.currentLetter || '—')}</span></div>
        <div class="card-sub">${escapeHtml(d.fsType || '')}</div>
      </div>
    </div>
    <div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="sizes">
      <span><b>${formatBytes(d.usedBytes || 0)}</b> ${tr('card.used')}</span>
      <span>${tr('card.free')} ${formatBytes(d.freeBytes || 0)} / ${formatBytes(d.totalBytes || 0)}</span>
    </div>
    ${d.indexed ? `<div class="open-hint">${tr('card.clickToBrowse')}</div>` : ''}
    <div class="card-foot">
      <div class="toggle">
        <div class="switch ${d.indexed ? 'on' : ''}" data-hw="${escapeHtml(d.hwId)}"></div>
        ${tr('card.index')}
      </div>
      <div class="actions">
        <button class="icon-btn" data-label-hw="${escapeHtml(d.hwId)}" title="${tr('card.editLabel')}">✎</button>
        ${d.indexed ? `<button class="icon-btn scan-btn" title="${tr('card.scanNow')}">↻</button>` : ''}
      </div>
    </div>`;

  const sw = el.querySelector('.switch');
  sw.addEventListener('click', async (e) => {
    e.stopPropagation();
    const next = !sw.classList.contains('on');
    sw.classList.toggle('on', next);
    await api.setIndexed(d.hwId, next);
    await refreshAll();
  });

  // Karta tiklayinca klasor gezintisini ac (yalnizca indeksli disk).
  if (d.indexed) {
    el.classList.add('clickable-card');
    el.addEventListener('click', (e) => {
      if (e.target.closest('.switch') || e.target.closest('button')) return;
      const label2 = d.customLabel || d.volumeLabel || tr('common.root');
      openFolder(d.hwId, null, label2);
    });
  }

  const scanBtn = el.querySelector('.scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
      if (!d.connected) { alert(tr('card.scanNotConnected')); return; }
      scanBtn.disabled = true;
      scanBtn.textContent = '…';
      const res = await api.startIndex(d.hwId);
      scanBtn.disabled = false;
      scanBtn.textContent = '↻';
      if (res.ok) {
        alert(
          `${tr('card.scanDone', { total: res.total, files: res.files })}\n` +
            tr('card.scanStats', {
              walked: res.walked, written: res.written,
              skipped: res.skipped, removed: res.removed,
            })
        );
      } else {
        alert(tr('card.scanFailed', { error: res.error }));
      }
      await refreshAll();
    });
  }

  const editBtn = el.querySelector('[data-label-hw]');
  editBtn.addEventListener('click', async () => {
    const value = await askLabel(d);
    if (value === undefined) return; // iptal
    await api.setLabel(d.hwId, value === '' ? null : value);
    await refreshAll();
  });

  return el;
}

function render(listEl, emptyEl, drives, opts) {
  listEl.innerHTML = '';
  emptyEl.style.display = drives.length === 0 ? '' : 'none';
  for (const d of drives) listEl.appendChild(driveCard(d, opts));
}

async function refreshAll() {
  const [indexed, all] = await Promise.all([
    api.listIndexedDrives(),
    api.listAllDrives(),
  ]);
  lastIndexedDrives = indexed;
  lastAllDrives = all;
  render(driveList, empty, indexed, { inAddView: false });
  render(allList, emptyAll, all, { inAddView: true });
  renderTotals(indexed);
}

// Indekslenen disklerin toplam kapasitesi / doluluk / bos alan ozeti.
function renderTotals(indexed) {
  const sum = (key) => indexed.reduce((acc, d) => acc + (Number(d[key]) || 0), 0);
  const total = sum('totalBytes');
  const used = sum('usedBytes');
  const free = sum('freeBytes');
  const connectedCount = indexed.filter((d) => d.connected).length;

  if (indexed.length === 0) {
    driveTotals.innerHTML = '';
    driveTotals.style.display = 'none';
    return;
  }
  driveTotals.style.display = '';
  driveTotals.innerHTML = `
    <span class="t-item">${tr('totals.drives', { n: indexed.length, connected: connectedCount })}</span>
    <span class="t-item">${tr('totals.capacity')} <b>${formatBytes(total)}</b></span>
    <span class="t-item">${tr('totals.used')} <b>${formatBytes(used)}</b></span>
    <span class="t-item">${tr('totals.free')} <b>${formatBytes(free)}</b></span>`;
}

// Indeksleme ilerlemesini kart uzerinde goster.
api.onIndexProgress((p) => {
  const card = document.querySelector(`.switch[data-hw="${CSS.escape(p.hwId)}"]`)?.closest('.card');
  if (!card) return;
  let note = card.querySelector('.scan-progress');
  if (!note) {
    note = document.createElement('div');
    note.className = 'meta scan-progress';
    card.appendChild(note);
  }
  note.textContent = p.done ? tr('card.scanComplete') : tr('card.scanning', { n: p.scanned });
});

refreshBtn.addEventListener('click', async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = tr('topbar.refreshing');
  try {
    await api.scanDrives();
    await refreshAll();
  } catch (err) {
    console.error(err);
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = tr('topbar.refresh');
  }
});

document.querySelectorAll('.navitem').forEach((n) => {
  n.addEventListener('click', () => showView(n.dataset.view));
});

// ---- Ortak sanallastirma fabrikasi ----
const ROW_HEIGHT = 34;

function createVirtualList({ viewport, spacer, rowsEl }) {
  let items = [];
  let renderRow = () => '';
  let onRowClick = null;

  function renderWindow() {
    const scrollTop = viewport.scrollTop;
    const viewH = viewport.clientHeight;
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
    const count = Math.ceil(viewH / ROW_HEIGHT) + 10;
    const last = Math.min(items.length, first + count);

    const frag = document.createDocumentFragment();
    for (let i = first; i < last; i += 1) {
      const item = items[i];
      const row = document.createElement('div');
      row.className = 'res-row' + (item.isDir ? ' is-folder' : '');
      if (onRowClick) row.classList.add('clickable');
      row.style.top = `${i * ROW_HEIGHT}px`;
      row.style.position = 'absolute';
      row.style.left = '0';
      row.style.right = '0';
      row.innerHTML = renderRow(item);
      if (onRowClick) row.addEventListener('click', () => onRowClick(item));
      frag.appendChild(row);
    }
    rowsEl.innerHTML = '';
    rowsEl.appendChild(frag);
  }

  viewport.addEventListener('scroll', renderWindow);
  window.addEventListener('resize', renderWindow);

  return {
    setItems(next, renderer, clickHandler) {
      items = next;
      renderRow = renderer;
      onRowClick = clickHandler || null;
      spacer.style.height = `${items.length * ROW_HEIGHT}px`;
      viewport.scrollTop = 0;
      renderWindow();
    },
    clear() {
      items = [];
      rowsEl.innerHTML = '';
      spacer.style.height = '0px';
    },
    get count() {
      return items.length;
    },
  };
}

const searchList = createVirtualList({
  viewport: resultViewport, spacer: resultSpacer, rowsEl: resultRows,
});
const browseList = createVirtualList({
  viewport: browseViewport, spacer: browseSpacer, rowsEl: browseRows,
});

// ---- Arama ----
let searchTokens = [];

// Material Symbols (inline SVG). Renk currentColor ile temaya uyar.
const ICON_PATHS = {
  folder: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z',
  file: 'M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z',
  image: 'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z',
  video: 'M360-240h160q17 0 28.5-11.5T560-280v-40l80 42v-164l-80 42v-40q0-17-11.5-28.5T520-480H360q-17 0-28.5 11.5T320-440v160q0 17 11.5 28.5T360-240ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z',
  audio: 'M430-200q38 0 64-26t26-64v-150h120v-80H480v155q-11-8-23.5-11.5T430-380q-38 0-64 26t-26 64q0 38 26 64t64 26ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z',
};

function iconSvg(kind) {
  const path = ICON_PATHS[kind] || ICON_PATHS.file;
  return `<svg class="row-ic" viewBox="0 -960 960 960" width="18" height="18" fill="currentColor"><path d="${path}"/></svg>`;
}

function highlight(text, tokens) {
  let out = escapeHtml(text);
  for (const tk of tokens) {
    if (!tk) continue;
    const re = new RegExp(`(${tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    out = out.replace(re, '<span class="hl">$1</span>');
  }
  return out;
}

function rowHtml(r) {
  return `
    <span class="namecell">${iconSvg(r.iconKind)}${highlight(r.name, searchTokens)}</span>
    <span>${escapeHtml(r.driveLabel)}</span>
    <span class="pathcell">${highlight(r.dir, searchTokens)}</span>
    <span>${r.isDir ? '—' : formatBytes(r.size || 0)}</span>`;
}

function clearResults() {
  searchList.clear();
  resultWrap.classList.add('hidden');
  lastSearchResults = null;
}

function renderSearchResults(results, query) {
  searchTokens = query.split(/\s+/).filter(Boolean);
  resultWrap.classList.remove('hidden');
  searchSummary.textContent = tr('search.results', { q: query, n: results.length });
  searchList.setItems(results, rowHtml, null);
}

// Siralama durumu (arama ve gezinti ayri ayri).
const searchSort = { by: 'name', desc: false };
const browseSort = { by: 'name', desc: false };

async function runSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    clearResults();
    searchSummary.textContent = tr('search.hint');
    return;
  }
  showView('search');
  searchSummary.textContent = tr('search.searching');
  searchTokens = query.split(/\s+/).filter(Boolean);
  try {
    const results = await api.search(query, searchSort.by, searchSort.desc);
    lastSearchResults = results;
    if (results.length === 0) {
      clearResults();
      searchSummary.textContent = tr('search.noResults', { q: query });
      return;
    }
    renderSearchResults(results, query);
  } catch (err) {
    clearResults();
    searchSummary.textContent = tr('search.failed');
    console.error(err);
  }
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});

// ---- Klasor gezintisi ----
let browseState = { hwId: null, parentId: null, driveLabel: '' };

function browseRowHtml(r) {
  return `
    <span class="namecell">${iconSvg(r.iconKind)}${escapeHtml(r.name)}</span>
    <span>${r.isDir ? tr('kind.folder') : tr('kind.file')}</span>
    <span class="pathcell">${escapeHtml(r.dir)}</span>
    <span>${r.isDir ? '—' : formatBytes(r.size || 0)}</span>`;
}

function onBrowseRowClick(item) {
  if (item.isDir) openFolder(browseState.hwId, item.id, browseState.driveLabel);
}

async function openFolder(hwId, parentId, driveLabel) {
  browseState = { hwId, parentId, driveLabel };
  showView('browse');
  const rows = await api.listFolder(hwId, parentId, browseSort.by, browseSort.desc);
  lastBrowseRows = rows;
  browseEmpty.classList.toggle('hidden', rows.length > 0);
  browseList.setItems(rows, browseRowHtml, onBrowseRowClick);
  await renderCrumb(parentId, driveLabel);
}

async function renderCrumb(parentId, driveLabel) {
  browseCrumb.innerHTML = '';
  const rootSeg = document.createElement('span');
  rootSeg.className = 'seg';
  rootSeg.textContent = driveLabel || tr('common.root');
  rootSeg.addEventListener('click', () => openFolder(browseState.hwId, null, driveLabel));
  browseCrumb.appendChild(rootSeg);

  if (parentId === null || parentId === undefined) {
    rootSeg.classList.add('current');
    return;
  }

  const chain = await api.folderBreadcrumb(parentId);
  for (const seg of chain) {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '›';
    browseCrumb.appendChild(sep);
    const el = document.createElement('span');
    el.className = 'seg';
    el.textContent = seg.name;
    if (seg.id === parentId) el.classList.add('current');
    else el.addEventListener('click', () => openFolder(browseState.hwId, seg.id, driveLabel));
    browseCrumb.appendChild(el);
  }
}

// ---- Kolon genislikleri (surukleyerek boyutlandirma + localStorage) ----
const COLUMN_KEY = 'izci.columnPercents';

function applyColumnWidths() {
  let pct = parsePercents(localStorage.getItem(COLUMN_KEY));
  if (!pct) pct = defaultPercents();
  const root = document.documentElement;
  root.style.setProperty('--c0', `${pct[0]}%`);
  root.style.setProperty('--c1', `${pct[1]}%`);
  root.style.setProperty('--c2', `${pct[2]}%`);
  root.style.setProperty('--c3', `${pct[3]}%`);
  return pct;
}

let columnPercents = applyColumnWidths();

function saveColumnWidths() {
  localStorage.setItem(COLUMN_KEY, serializePercents(columnPercents));
}

// Tum res-head'lerdeki tutamaclara surukleme davranisi ekler.
function setupColumnResizers() {
  document.querySelectorAll('.col-resizer').forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = Number(handle.dataset.col);
      const container = handle.closest('.res-head');
      const totalWidth = container.clientWidth;
      const startX = e.clientX;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      function onMove(ev) {
        const delta = ev.clientX - startX;
        const base = parsePercents(localStorage.getItem(COLUMN_KEY)) || columnPercents;
        const result = applyResize(base, index, delta, totalWidth);
        columnPercents = result.percents;
        const root = document.documentElement;
        root.style.setProperty('--c0', `${columnPercents[0]}%`);
        root.style.setProperty('--c1', `${columnPercents[1]}%`);
        root.style.setProperty('--c2', `${columnPercents[2]}%`);
        root.style.setProperty('--c3', `${columnPercents[3]}%`);
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveColumnWidths();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

browseBack.addEventListener('click', () => {
  if (browseState.parentId === null || browseState.parentId === undefined) return;
  api.folderBreadcrumb(browseState.parentId).then((chain) => {
    const parent = chain.length >= 2 ? chain[chain.length - 2].id : null;
    openFolder(browseState.hwId, parent, browseState.driveLabel);
  });
});
setupColumnResizers();

// ---- Baslik siralama ----
function setupSortHeaders() {
  const groups = [
    { head: document.querySelector('#viewSearch .res-head'), state: searchSort, reload: () => runSearch() },
    { head: document.querySelector('#viewBrowse .res-head'), state: browseSort, reload: () => openFolder(browseState.hwId, browseState.parentId, browseState.driveLabel) },
  ];

  function paint(head, state) {
    head.querySelectorAll('.sortable').forEach((el) => {
      el.classList.toggle('asc', el.dataset.sort === state.by && !state.desc);
      el.classList.toggle('desc', el.dataset.sort === state.by && state.desc);
    });
  }

  for (const g of groups) {
    if (!g.head) continue;
    g.head.querySelectorAll('.sortable').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('col-resizer')) return;
        const key = el.dataset.sort;
        if (g.state.by === key) g.state.desc = !g.state.desc;
        else { g.state.by = key; g.state.desc = false; }
        paint(g.head, g.state);
        g.reload();
      });
    });
    paint(g.head, g.state);
  }
}

setupSortHeaders();

// ---- Dil secici ----
langSelect.innerHTML = LANGS.map(
  (l) => `<option value="${l}">${l.toUpperCase()}</option>`
).join('');
langSelect.value = lang;
langSelect.addEventListener('change', () => setLang(langSelect.value));

// Input bosaltilinca eski sonuclar kalmasin.
searchInput.addEventListener('input', () => {
  if (searchInput.value.trim() === '') {
    clearResults();
    searchSummary.textContent = tr('search.hint');
  }
});

// Ilk cizim.
applyStaticTranslations();
refreshAll().catch((err) => {
  empty.textContent = tr('drives.loadFailed');
  console.error(err);
});
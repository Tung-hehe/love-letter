// app.js — điều hướng 4 màn hình (Thư viện, Phong cách thư, Soạn thư, Xem thư)
// + lưu thư vào localStorage, xem lại và chia sẻ.

const LETTERS_KEY = 'thu-tay-letters-v1';
const OLD_DRAFT_KEY = 'thu-tay-draft-v1';
const THEME_KEY = 'thu-tay-theme';
const DEFAULT_TEMPLATE_ID = 'am_ap';

let letters = [];
let currentLetter = null;
let pickerReturnTo = 'home'; // 'home' | 'compose' — nơi quay lại khi bấm back ở màn chọn phong cách
let composeReturnTo = 'home'; // 'home' | 'picker' — nơi quay lại khi bấm back ở màn soạn thư
let letterPreviewHtml = '';

const els = {
  screens: {
    home: document.getElementById('screen-home'),
    picker: document.getElementById('screen-picker'),
    compose: document.getElementById('screen-compose'),
    letterPreview: document.getElementById('screen-letter-preview'),
  },
  letterList: document.getElementById('letter-list'),
  homeSubtitle: document.getElementById('home-subtitle'),
  homeEmpty: document.getElementById('home-empty'),
  fabNew: document.getElementById('fab-new'),
  themeToggle: document.getElementById('theme-toggle'),

  pickerGrid: document.getElementById('picker-grid'),
  pickerBack: document.getElementById('picker-back'),

  form: document.getElementById('letter-form'),
  paraList: document.getElementById('para-list'),
  addPara: document.getElementById('add-para'),
  previewBtn: document.getElementById('preview-btn'),
  composeBack: document.getElementById('compose-back'),
  composeTemplateDot: document.getElementById('compose-template-dot'),

  previewTitle: document.getElementById('preview-title'),
  previewFrame: document.getElementById('preview-frame'),
  letterPreviewBack: document.getElementById('letterpreview-back'),
  saveDraftBtn: document.getElementById('save-draft-btn'),
  downloadBtn: document.getElementById('download-btn'),
  shareBtn: document.getElementById('share-btn'),
};

function templateMeta(id) {
  return TEMPLATE_LIST.find((t) => t.id === id) || TEMPLATE_LIST[0];
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function slugify(str) {
  return String(str || 'letter')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'letter';
}

// ---------- giao diện sáng/tối ----------
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';

function currentTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* bỏ qua */ }
  els.themeToggle.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
}

els.themeToggle.addEventListener('click', () => {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});

applyTheme(currentTheme());

// ---------- điều hướng ----------
function showScreen(name) {
  Object.entries(els.screens).forEach(([key, el]) => el.classList.toggle('active', key === name));
  window.scrollTo(0, 0);
}

// URL cho từng màn: / (thư viện), /edit/:id (soạn thư), /edit/:id/style (chọn phong cách),
// /edit/:id/preview (xem thư) — để refresh/back/bookmark đúng màn đang xem.
function parseRoute(pathname) {
  const parts = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  if (parts[0] === 'edit' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    if (parts[2] === 'style') return { screen: 'picker', id };
    if (parts[2] === 'preview') return { screen: 'letterPreview', id };
    if (!parts[2]) return { screen: 'compose', id };
  }
  return { screen: 'home' };
}

function routePath(screen, id) {
  if (screen === 'compose') return `/edit/${encodeURIComponent(id)}`;
  if (screen === 'picker') return `/edit/${encodeURIComponent(id)}/style`;
  if (screen === 'letterPreview') return `/edit/${encodeURIComponent(id)}/preview`;
  return '/';
}

function syncUrl(path, opts) {
  if (opts && opts.noHistory) return;
  if (location.pathname === path) return;
  history.pushState(null, '', path);
}

function resolveRouteAndRender() {
  const { screen, id } = parseRoute(location.pathname);
  if (screen !== 'home') {
    const letter = letters.find((l) => l.id === id);
    if (!letter) {
      history.replaceState(null, '', '/');
      goHome({ noHistory: true });
      return;
    }
    currentLetter = JSON.parse(JSON.stringify(letter));
  }
  if (screen === 'compose') { composeReturnTo = 'home'; goCompose({ noHistory: true }); }
  else if (screen === 'picker') { pickerReturnTo = 'compose'; goPicker('compose', { noHistory: true }); }
  else if (screen === 'letterPreview') { goLetterPreview({ noHistory: true }); }
  else { goHome({ noHistory: true }); }
}

window.addEventListener('popstate', resolveRouteAndRender);

function goHome(opts) {
  renderHome();
  showScreen('home');
  syncUrl('/', opts);
}

function goPicker(returnTo, opts) {
  pickerReturnTo = returnTo;
  renderPickerGrid();
  showScreen('picker');
  syncUrl(routePath('picker', currentLetter.id), opts);
}

function goCompose(opts) {
  renderComposeForm();
  showScreen('compose');
  syncUrl(routePath('compose', currentLetter.id), opts);
}

async function goLetterPreview(opts) {
  const meta = templateMeta(currentLetter.templateId);
  els.previewTitle.textContent = `Xem thư · ${meta.name}`;
  els.previewFrame.srcdoc = '';
  showScreen('letterPreview');
  syncUrl(routePath('letterPreview', currentLetter.id), opts);
  try {
    const html = await renderLetter(currentLetter.templateId, currentLetter);
    letterPreviewHtml = html;
    els.previewFrame.srcdoc = html;
  } catch (err) {
    window.alert('Không dựng được lá thư: ' + err.message);
  }
}

// ---------- lưu trữ ----------
// Danh sách đoạn văn phẳng (định dạng cũ, trước khi có ngắt trang tuỳ chỉnh)
// -> danh sách trang, tự chia 3 đoạn/trang như hành vi cũ.
function migrateContentToPages(content) {
  if (!content || !content.length) return [['']];
  if (Array.isArray(content[0])) return content; // đã là danh sách trang
  const pages = [];
  for (let i = 0; i < content.length; i += 3) pages.push(content.slice(i, i + 3));
  return pages;
}

// Id ngắn gọn cho URL (VD /edit/k3f9zq) — chỉ cần duy nhất trong máy này, không cần
// mã hoá thời gian nên không dài dòng như trước.
function makeLetterId() {
  let id;
  do {
    id = Math.random().toString(36).slice(2, 8);
  } while (letters.some((l) => l.id === id));
  return id;
}

function loadLetters() {
  try {
    const raw = localStorage.getItem(LETTERS_KEY);
    if (raw) {
      letters = (JSON.parse(raw) || []).map((l) => ({ ...l, content: migrateContentToPages(l.content) }));
      return;
    }
  } catch (e) { /* bỏ qua nếu dữ liệu lỗi */ }

  // Chuyển bản nháp đơn của phiên bản trước (chưa có thư viện) sang định dạng mới, nếu có.
  try {
    const old = JSON.parse(localStorage.getItem(OLD_DRAFT_KEY) || 'null');
    if (old && (old.title || (old.content && old.content.length))) {
      letters = [{
        id: makeLetterId(),
        templateId: old.templateId || DEFAULT_TEMPLATE_ID,
        date: old.date || '', greeting: old.greeting || '', label: old.label || '',
        content: migrateContentToPages(old.content), closing: old.closing || '', sign: old.sign || '',
        postscript: old.postscript || '', updatedAt: Date.now(),
      }];
      saveLetters();
    }
  } catch (e) { /* bỏ qua */ }
  localStorage.removeItem(OLD_DRAFT_KEY);
}

function saveLetters() {
  try { localStorage.setItem(LETTERS_KEY, JSON.stringify(letters)); } catch (e) { /* đầy bộ nhớ, bỏ qua */ }
}

function upsertCurrentLetter() {
  currentLetter.updatedAt = Date.now();
  const idx = letters.findIndex((l) => l.id === currentLetter.id);
  if (idx >= 0) letters[idx] = currentLetter;
  else letters.unshift(currentLetter);
  saveLetters();
}

function makeBlankLetter() {
  return {
    id: makeLetterId(),
    templateId: DEFAULT_TEMPLATE_ID,
    title: '', date: new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }),
    greeting: '', label: '', content: [['']], closing: '', sign: '', postscript: '',
    updatedAt: Date.now(),
  };
}

function formatRelativeTime(ts) {
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const hour = Math.floor(diffMin / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  if (day === 1) return 'hôm qua';
  if (day < 7) return `${day} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
}

// ---------- Màn 1: Thư viện ----------
function renderHome() {
  els.letterList.innerHTML = '';
  const sorted = [...letters].sort((a, b) => b.updatedAt - a.updatedAt);
  els.homeEmpty.hidden = sorted.length > 0;
  els.homeSubtitle.textContent = sorted.length ? `${sorted.length} lá thư đã lưu` : '';

  sorted.forEach((letter) => {
    const meta = templateMeta(letter.templateId);
    const card = document.createElement('div');
    card.className = 'letter-card';
    card.innerHTML = `
      <button type="button" class="letter-card-open">
        <span class="lc-icon" style="background:${meta.iconGradient};"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span class="lc-text">
          <p class="lc-title">${escapeHtml(letter.title || 'Thư chưa có tiêu đề')}</p>
          <p class="lc-meta">${escapeHtml(meta.name)} · ${formatRelativeTime(letter.updatedAt)}</p>
        </span>
        <span class="lc-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>
      </button>
      <button type="button" class="letter-card-delete" aria-label="Xoá lá thư">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7"/></svg>
      </button>
    `;
    card.querySelector('.letter-card-open').addEventListener('click', () => {
      currentLetter = JSON.parse(JSON.stringify(letter));
      composeReturnTo = 'home';
      goCompose();
    });
    card.querySelector('.letter-card-delete').addEventListener('click', () => {
      const ok = window.confirm(`Xoá lá thư "${letter.title || 'Thư chưa có tiêu đề'}"? Không thể hoàn tác.`);
      if (!ok) return;
      letters = letters.filter((l) => l.id !== letter.id);
      saveLetters();
      renderHome();
    });
    els.letterList.appendChild(card);
  });
}

els.fabNew.addEventListener('click', () => {
  currentLetter = makeBlankLetter();
  composeReturnTo = 'picker';
  goPicker('home');
});

// ---------- Màn 2: Phong cách thư ----------
function renderPickerGrid() {
  els.pickerGrid.innerHTML = '';
  TEMPLATE_LIST.forEach((tpl) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'theme-card' + (tpl.id === currentLetter.templateId ? ' picked' : '');
    card.innerHTML = `
      <span class="t-swatch" style="background:${tpl.ink};">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tpl.icon}</svg>
      </span>
      <span><p class="t-name">${escapeHtml(tpl.name)}</p><p class="t-mood">${escapeHtml(tpl.mood)}</p></span>
    `;
    card.addEventListener('click', () => {
      currentLetter.templateId = tpl.id;
      goCompose();
    });
    els.pickerGrid.appendChild(card);
  });
}

els.pickerBack.addEventListener('click', () => {
  if (pickerReturnTo === 'compose') goCompose(); else goHome();
});

// ---------- Màn 3: Soạn thư ----------
const PARA_WARN_LENGTH = 400;

function updateParaCount(textarea) {
  const countEl = textarea.parentElement.querySelector('.para-count');
  const len = textarea.value.length;
  countEl.textContent = `${len} ký tự`;
  countEl.classList.toggle('warn', len > PARA_WARN_LENGTH);
}

function makeBreakToggle(active) {
  const el = document.createElement('div');
  el.className = 'para-break' + (active ? ' is-active' : '');
  el.innerHTML = `
    <span class="para-break-line"></span>
    <button type="button" class="para-break-toggle">${active ? 'Trang mới ✕' : '+ Ngắt trang'}</button>
    <span class="para-break-line"></span>
  `;
  el.querySelector('.para-break-toggle').addEventListener('click', () => {
    const isActive = el.classList.toggle('is-active');
    el.querySelector('.para-break-toggle').textContent = isActive ? 'Trang mới ✕' : '+ Ngắt trang';
    persistFormToCurrentLetter();
  });
  return el;
}

function makeParaRow(value) {
  const row = document.createElement('div');
  row.className = 'para-row';
  row.innerHTML = `
    <div class="para-input-wrap">
      <textarea class="para-input" rows="2" placeholder="Một đoạn văn trong thư…"></textarea>
      <p class="para-count">0 ký tự</p>
    </div>
    <button type="button" class="para-remove" aria-label="Xoá đoạn văn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  `;
  const textarea = row.querySelector('.para-input');
  textarea.value = value || '';
  updateParaCount(textarea);
  textarea.addEventListener('input', () => updateParaCount(textarea));
  row.querySelector('.para-remove').addEventListener('click', () => {
    if (els.paraList.querySelectorAll('.para-row').length <= 1) return;
    const prev = row.previousElementSibling;
    const next = row.nextElementSibling;
    if (prev && prev.classList.contains('para-break')) prev.remove();
    else if (next && next.classList.contains('para-break')) next.remove();
    row.remove();
    clearFieldError(els.paraList);
    persistFormToCurrentLetter();
  });
  return row;
}

function addParagraph(value, breakBefore) {
  if (els.paraList.children.length > 0) {
    els.paraList.appendChild(makeBreakToggle(Boolean(breakBefore)));
  }
  els.paraList.appendChild(makeParaRow(value));
}

els.addPara.addEventListener('click', () => {
  addParagraph('', false);
  const inputs = els.paraList.querySelectorAll('.para-input');
  inputs[inputs.length - 1].focus();
});

function renderComposeForm() {
  els.form.querySelectorAll('.field.has-error').forEach((f) => clearFieldError(f));
  const f = els.form;
  f.title.value = currentLetter.title;
  f.date.value = currentLetter.date;
  f.greeting.value = currentLetter.greeting;
  f.label.value = currentLetter.label;
  f.closing.value = currentLetter.closing;
  f.sign.value = currentLetter.sign;
  f.postscript.value = currentLetter.postscript;
  els.paraList.innerHTML = '';
  const pages = currentLetter.content.length ? currentLetter.content : [['']];
  pages.forEach((page, pageIdx) => {
    page.forEach((doan, paraIdx) => addParagraph(doan, pageIdx > 0 && paraIdx === 0));
  });
  updateComposeTemplateDot();
}

function updateComposeTemplateDot() {
  els.composeTemplateDot.querySelector('.dot-inner').style.background = templateMeta(currentLetter.templateId).ink;
}

function readPagesFromForm() {
  const pages = [];
  let page = [];
  Array.from(els.paraList.children).forEach((child) => {
    if (child.classList.contains('para-break')) {
      if (child.classList.contains('is-active') && page.length) {
        pages.push(page);
        page = [];
      }
      return;
    }
    const text = child.querySelector('.para-input').value.trim();
    if (text !== '') page.push(text);
  });
  if (page.length) pages.push(page);
  return pages;
}

function readFormIntoObject() {
  const f = els.form;
  return {
    title: f.title.value.trim(), date: f.date.value.trim(),
    greeting: f.greeting.value.trim(), label: f.label.value.trim(),
    content: readPagesFromForm(), closing: f.closing.value.trim(), sign: f.sign.value.trim(),
    postscript: f.postscript.value.trim(),
  };
}

function setFieldError(el, message) {
  const field = el.closest('.field') || el;
  field.classList.add('has-error');
  let msg = field.querySelector('.field-error-msg');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'field-error-msg';
    field.appendChild(msg);
  }
  msg.textContent = message;
}

function clearFieldError(el) {
  const field = el.closest ? (el.closest('.field') || el) : el;
  field.classList.remove('has-error');
  const msg = field.querySelector && field.querySelector('.field-error-msg');
  if (msg) msg.remove();
}

function validateComposeForm(ctx) {
  els.form.querySelectorAll('.field.has-error').forEach((f) => clearFieldError(f));
  let firstInvalid = null;
  const check = (value, inputEl, message) => {
    if (!value) {
      setFieldError(inputEl, message);
      if (!firstInvalid) firstInvalid = inputEl;
    }
  };
  check(ctx.title, els.form.title, 'Vui lòng nhập tiêu đề');
  check(ctx.greeting, els.form.greeting, 'Vui lòng nhập lời chào');
  check(ctx.closing, els.form.closing, 'Vui lòng nhập lời kết');
  check(ctx.sign, els.form.sign, 'Vui lòng nhập chữ ký');
  if (ctx.content.length === 0) {
    setFieldError(els.paraList, 'Vui lòng viết ít nhất một đoạn nội dung');
    if (!firstInvalid) firstInvalid = els.paraList.querySelector('.para-input') || els.paraList;
  }
  return firstInvalid;
}

function hasAnyContent(obj) {
  return Boolean(obj.title || obj.greeting || obj.content.length || obj.closing || obj.sign || obj.postscript);
}

function persistFormToCurrentLetter() {
  Object.assign(currentLetter, readFormIntoObject());
  if (hasAnyContent(currentLetter)) upsertCurrentLetter();
}

let saveTimer = null;
function scheduleAutosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistFormToCurrentLetter, 400);
}
els.form.addEventListener('input', scheduleAutosave);
els.paraList.addEventListener('input', scheduleAutosave);

els.form.addEventListener('input', (e) => {
  if (e.target.closest('.field.has-error')) clearFieldError(e.target);
});
els.paraList.addEventListener('input', () => {
  const hasAny = Array.from(els.paraList.querySelectorAll('.para-input')).some((t) => t.value.trim() !== '');
  if (hasAny) clearFieldError(els.paraList);
});

els.composeBack.addEventListener('click', () => {
  persistFormToCurrentLetter();
  if (composeReturnTo === 'picker') goPicker('home');
  else goHome();
});

els.composeTemplateDot.addEventListener('click', () => {
  persistFormToCurrentLetter();
  goPicker('compose');
});

els.previewBtn.addEventListener('click', async () => {
  const ctx = readFormIntoObject();
  Object.assign(currentLetter, ctx);
  const firstInvalid = validateComposeForm(ctx);
  if (firstInvalid) {
    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  persistFormToCurrentLetter();
  await goLetterPreview();
});

// ---------- Màn 4: Xem thư ----------
els.letterPreviewBack.addEventListener('click', () => goCompose());

els.saveDraftBtn.addEventListener('click', () => goHome());

function downloadLetterFile() {
  if (!letterPreviewHtml) return;
  const meta = templateMeta(currentLetter.templateId);
  const filename = `${slugify(currentLetter.title)}__${meta.id}.html`;
  const blob = new Blob([letterPreviewHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.downloadBtn.addEventListener('click', downloadLetterFile);

els.shareBtn.addEventListener('click', async () => {
  if (!letterPreviewHtml) return;
  const meta = templateMeta(currentLetter.templateId);
  const filename = `${slugify(currentLetter.title)}__${meta.id}.html`;
  const file = new File([letterPreviewHtml], filename, { type: 'text/html' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: currentLetter.title || 'Bức thư' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // người dùng tự huỷ hộp thoại chia sẻ
    }
  }

  downloadLetterFile();
});

// ---------- khởi động ----------
loadLetters();
resolveRouteAndRender();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/app/sw.js', { scope: '/' }).then((reg) => {
      // Chủ động hỏi ngay có bản mới không, thay vì chờ trình duyệt tự kiểm tra
      // theo lịch riêng (có thể rất lâu sau mới kiểm tra lại).
      reg.update().catch(() => {});
    }).catch(() => {});
  });
  // Khi có bản service worker mới tiếp quản trang, tự tải lại một lần để tránh
  // tình trạng HTML mới nhưng JS cũ (hoặc ngược lại) chạy lẫn với nhau.
  let refreshedOnce = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshedOnce) return;
    refreshedOnce = true;
    window.location.reload();
  });
}

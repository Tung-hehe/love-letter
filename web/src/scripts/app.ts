// app.ts — điều hướng 4 màn hình (Thư viện, Phong cách thư, Soạn thư, Xem thư)
// + lưu thư vào localStorage, xem lại và chia sẻ.
// Port từ app/js/app.js (bản Astro cũ), có kiểu dữ liệu.

import { TEMPLATE_LIST } from '../data/templates';
import { renderLetter } from '../lib/render';
import type { Letter, LetterContext, LetterPage, TemplateMeta } from '../lib/types';

const LETTERS_KEY = 'thu-tay-letters-v1';
const OLD_DRAFT_KEY = 'thu-tay-draft-v1';
const THEME_KEY = 'thu-tay-theme';
const DEFAULT_TEMPLATE_ID = 'am_ap';

type FormFields = Pick<Letter, 'title' | 'date' | 'greeting' | 'label' | 'content' | 'closing' | 'sign' | 'postscript'>;
type ScreenName = 'home' | 'picker' | 'compose' | 'letterPreview';
type NavOpts = { noHistory?: boolean } | undefined;

let letters: Letter[] = [];
let currentLetter: Letter | null = null;
let pickerReturnTo: 'home' | 'compose' = 'home'; // nơi quay lại khi bấm back ở màn chọn phong cách
let composeReturnTo: 'home' | 'picker' = 'home'; // nơi quay lại khi bấm back ở màn soạn thư
let letterPreviewHtml = '';
let previewIsSample = false; // true khi #screen-letter-preview đang hiện bản "Xem mẫu" (từ picker), không phải thư thật

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const els = {
  screenStack: document.querySelector('.screen-stack') as HTMLElement,
  screens: {
    home: byId('screen-home'),
    picker: byId('screen-picker'),
    compose: byId('screen-compose'),
    letterPreview: byId('screen-letter-preview'),
  } satisfies Record<ScreenName, HTMLElement>,

  letterList: byId('letter-list'),
  homeSubtitle: byId('home-subtitle'),
  homeEmpty: byId('home-empty'),
  fabNew: byId('fab-new'),
  themeToggle: byId('theme-toggle'),

  pickerGrid: byId('picker-grid'),
  pickerBack: byId('picker-back'),
  pickerConfirm: byId('picker-confirm'),
  pickerConfirmTop: byId('picker-confirm-top'),
  pickerViewSample: byId('picker-view-sample'),

  form: byId<HTMLFormElement>('letter-form'),
  paraList: byId('para-list'),
  addPara: byId('add-para'),
  previewBtn: byId('preview-btn'),
  composeBack: byId('compose-back'),
  composeStyleBtn: byId('compose-style-btn'),
  composeDownloadBtn: byId('compose-download-btn'),
  composeSaveBtn: byId('compose-save-btn'),
  composeShareBtn: byId('compose-share-btn'),

  previewTitle: byId('preview-title'),
  previewFrame: byId<HTMLIFrameElement>('preview-frame'),
  letterPreviewBack: byId('letterpreview-back'),
  previewBottomBar: byId('preview-bottom-bar'),
  saveDraftBtn: byId('save-draft-btn'),
  downloadBtn: byId('download-btn'),
  shareBtn: byId('share-btn'),

  livePreviewFrame: byId<HTMLIFrameElement>('live-preview-frame'),
  livePreviewReloadBtn: byId('live-preview-reload'),

  // Các ô nhập liệu — lấy trực tiếp theo id thay vì dựa vào việc trình duyệt tự
  // gắn input có "name" thành property của <form> (form.title...), vì TypeScript
  // không mô tả kiểu cho hành vi đó.
  fTitle: byId<HTMLInputElement>('f-title'),
  fDate: byId<HTMLInputElement>('f-date'),
  fGreeting: byId<HTMLInputElement>('f-greeting'),
  fLabel: byId<HTMLInputElement>('f-label'),
  fClosing: byId<HTMLInputElement>('f-closing'),
  fSign: byId<HTMLInputElement>('f-sign'),
  fPostscript: byId<HTMLInputElement>('f-postscript'),
};

function templateMeta(id: string): TemplateMeta {
  return TEMPLATE_LIST.find((t) => t.id === id) || TEMPLATE_LIST[0];
}

function escapeHtml(str: unknown): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => map[c]);
}

function slugify(str: string | undefined): string {
  return (String(str || 'letter')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'letter';
}

// ---------- giao diện sáng/tối ----------
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';

function currentTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* bỏ qua */ }
  els.themeToggle.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
}

els.themeToggle.addEventListener('click', () => {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});

applyTheme(currentTheme());

// ---------- điều hướng ----------
function showScreen(name: ScreenName) {
  (Object.entries(els.screens) as [ScreenName, HTMLElement][]).forEach(([key, el]) =>
    el.classList.toggle('active', key === name));
  // Chỉ hiện cột xem trước trực tiếp bên phải khi đang chọn phong cách/soạn thư,
  // và chỉ hiện màn trống "Chọn một lá thư để xem" khi đang ở Thư viện (trên máy
  // tính) — dùng class thay vì :has() để chạy được trên nhiều trình duyệt hơn.
  if (els.screenStack) {
    els.screenStack.classList.toggle('show-live-preview', name === 'picker' || name === 'compose');
    els.screenStack.classList.toggle('show-detail-empty', name === 'home');
  }
  window.scrollTo(0, 0);
}

// URL cho từng màn: / (thư viện), /edit/:id (soạn thư), /edit/:id/style (chọn phong cách),
// /edit/:id/preview (xem thư) — để refresh/back/bookmark đúng màn đang xem.
function parseRoute(pathname: string): { screen: ScreenName; id?: string } {
  const parts = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  if (parts[0] === 'edit' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    if (parts[2] === 'style') return { screen: 'picker', id };
    if (parts[2] === 'preview') return { screen: 'letterPreview', id };
    if (!parts[2]) return { screen: 'compose', id };
  }
  return { screen: 'home' };
}

function routePath(screen: ScreenName, id: string): string {
  if (screen === 'compose') return `/edit/${encodeURIComponent(id)}`;
  if (screen === 'picker') return `/edit/${encodeURIComponent(id)}/style`;
  if (screen === 'letterPreview') return `/edit/${encodeURIComponent(id)}/preview`;
  return '/';
}

function syncUrl(path: string, opts: NavOpts) {
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

function goHome(opts?: NavOpts) {
  renderHome();
  showScreen('home');
  syncUrl('/', opts);
}

function goPicker(returnTo: 'home' | 'compose', opts?: NavOpts) {
  pickerReturnTo = returnTo;
  renderPickerGrid();
  showScreen('picker');
  syncUrl(routePath('picker', currentLetter!.id), opts);
  updateLivePreview();
}

function goCompose(opts?: NavOpts) {
  applySampleIfEmpty(currentLetter!);
  renderComposeForm();
  showScreen('compose');
  syncUrl(routePath('compose', currentLetter!.id), opts);
  updateLivePreview();
}

async function goLetterPreview(opts?: NavOpts) {
  previewIsSample = false;
  els.previewBottomBar.hidden = false;
  const meta = templateMeta(currentLetter!.templateId);
  els.previewTitle.textContent = `Xem thư · ${meta.name}`;
  els.previewFrame.srcdoc = '';
  showScreen('letterPreview');
  syncUrl(routePath('letterPreview', currentLetter!.id), opts);
  try {
    const html = await renderLetter(currentLetter!.templateId, currentLetter!);
    letterPreviewHtml = html;
    els.previewFrame.srcdoc = html;
  } catch (err) {
    window.alert('Không dựng được lá thư: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// Xem trước toàn màn hình nội dung MẪU của phong cách đang chọn ở màn Phong cách
// thư (chủ yếu cho điện thoại/màn hẹp — máy tính đủ rộng đã có xem trước bên phải
// rồi nên nút "Xem mẫu" bị ẩn, xem StylePickerScreen.astro). Dùng lại đúng UI của
// #screen-letter-preview nhưng ẩn thanh nút Tải/Lưu/Chia sẻ vì đây chưa phải thư
// thật, và không đụng tới URL (chỉ là xem thử nhanh, không cần bookmark được).
async function goSamplePreview() {
  const meta = templateMeta(currentLetter!.templateId);
  if (!meta.sample) return;
  previewIsSample = true;
  els.previewBottomBar.hidden = true;
  els.previewTitle.textContent = `Xem mẫu · ${meta.name}`;
  els.previewFrame.srcdoc = '';
  showScreen('letterPreview');
  const ctx: LetterContext = {
    title: meta.sample.title, date: currentLetter!.date || '', label: '',
    greeting: meta.sample.greeting, content: meta.sample.content,
    closing: meta.sample.closing, sign: meta.sample.sign, postscript: '',
  };
  try {
    els.previewFrame.srcdoc = await renderLetter(currentLetter!.templateId, ctx);
  } catch (err) {
    window.alert('Không dựng được bản xem mẫu: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// ---------- Xem trước trực tiếp bên phải (chỉ trên máy tính màn rộng, xem CSS) ----------
// Chỉ tự render khi đổi phong cách hoặc mới vào màn Phong cách thư/Soạn thư — KHÔNG
// tự render lại khi đang gõ nội dung nữa (dễ giật/tốn máy với thư dài), người dùng
// tự bấm nút "Tải lại xem trước" ở thanh công cụ trên cùng khi muốn thấy bản mới
// nhất (xem els.livePreviewReloadBtn, ComposeScreen.astro).

// Thư chưa có nội dung thật (mới tạo, hoặc đoạn văn toàn chuỗi rỗng) -> dùng nội
// dung mẫu riêng của từng phong cách (TEMPLATE_LIST[].sample), theo 2 cách:
// - updateLivePreview(): chỉ dùng tạm để render bản xem trước, không đụng đến dữ
//   liệu thật (dùng ở màn Phong cách thư, trước khi đã thật sự chọn xong).
// - applySampleIfEmpty(): điền thẳng vào thư thật khi vào màn Soạn thư, để người
//   dùng sửa trực tiếp lên nội dung mẫu thay vì gõ lại từ đầu (xem goCompose()).
function isLetterEmpty(letter: Letter): boolean {
  const hasField = letter.title || letter.greeting || letter.closing || letter.sign || letter.postscript || letter.label;
  const hasPara = (letter.content || []).some((page) => page.some((p) => p && p.trim() !== ''));
  return !hasField && !hasPara;
}

function applySampleIfEmpty(letter: Letter) {
  if (!isLetterEmpty(letter)) return;
  const meta = templateMeta(letter.templateId);
  if (!meta.sample) return;
  Object.assign(letter, meta.sample);
}

// Mỗi lần gọi (đổi phong cách/sửa nội dung) là 1 request render bất đồng bộ —
// nếu bấm đổi phong cách liên tiếp thật nhanh, request của lần bấm trước có thể
// trả lời SAU request của lần bấm sau (VD template chưa cache thì tải chậm hơn
// template đã cache). Đánh số thứ tự để chỉ request MỚI NHẤT được phép cập nhật
// khung xem trước, tránh hiện sai phong cách so với thẻ đang được chọn.
let livePreviewRequestId = 0;

async function updateLivePreview() {
  if (!currentLetter || !els.livePreviewFrame) return;
  const requestId = ++livePreviewRequestId;
  const meta = templateMeta(currentLetter.templateId);
  const ctx = (isLetterEmpty(currentLetter) && meta.sample)
    ? Object.assign({}, currentLetter, meta.sample)
    : currentLetter;
  try {
    const html = await renderLetter(currentLetter.templateId, ctx);
    if (requestId !== livePreviewRequestId) return; // đã có lần gọi mới hơn, bỏ kết quả cũ này
    els.livePreviewFrame.srcdoc = html;
  } catch (e) {
    if (requestId !== livePreviewRequestId) return;
    // Không chặn soạn thư nếu render lỗi, nhưng vẫn hiện lỗi thay vì để trắng xoá
    // im lặng — dễ phát hiện khi template lỗi hoặc chưa tải được (VD mất mạng,
    // mở app không qua server nên đường dẫn /templates/... không tải được).
    const message = e instanceof Error ? e.message : String(e);
    els.livePreviewFrame.srcdoc = `<!doctype html><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#8a6b76;text-align:center;font-size:14px;">Không tải được bản xem trước: ${escapeHtml(message)}</body>`;
  }
}
els.livePreviewReloadBtn.addEventListener('click', () => updateLivePreview());

// ---------- lưu trữ ----------
// Danh sách đoạn văn phẳng (định dạng cũ, trước khi có ngắt trang tuỳ chỉnh)
// -> danh sách trang, tự chia 3 đoạn/trang như hành vi cũ.
function migrateContentToPages(content: LetterPage[] | string[] | undefined): LetterPage[] {
  if (!content || !content.length) return [['']];
  if (Array.isArray(content[0])) return content as LetterPage[]; // đã là danh sách trang
  const flat = content as string[];
  const pages: LetterPage[] = [];
  for (let i = 0; i < flat.length; i += 3) pages.push(flat.slice(i, i + 3));
  return pages;
}

// Id ngắn gọn cho URL (VD /edit/k3f9zq) — chỉ cần duy nhất trong máy này, không cần
// mã hoá thời gian nên không dài dòng như trước.
function makeLetterId(): string {
  let id: string;
  do {
    id = Math.random().toString(36).slice(2, 8);
  } while (letters.some((l) => l.id === id));
  return id;
}

// Phong cách của 1 lá thư có thể không còn tồn tại nữa (template đã bị xoá/đổi id
// qua các lần cập nhật app) — trả về id gốc nếu còn hợp lệ, không thì trả về
// template mặc định để Thư viện/Phong cách thư/bản render luôn khớp nhau.
function resolveTemplateId(id: string): string {
  return TEMPLATE_LIST.some((t) => t.id === id) ? id : DEFAULT_TEMPLATE_ID;
}

function loadLetters() {
  try {
    const raw = localStorage.getItem(LETTERS_KEY);
    if (raw) {
      let migrated = false;
      letters = (JSON.parse(raw) || []).map((l: Letter) => {
        const templateId = resolveTemplateId(l.templateId);
        if (templateId !== l.templateId) migrated = true;
        return { ...l, templateId, content: migrateContentToPages(l.content) };
      });
      if (migrated) saveLetters();
      return;
    }
  } catch (e) { /* bỏ qua nếu dữ liệu lỗi */ }

  // Chuyển bản nháp đơn của phiên bản trước (chưa có thư viện) sang định dạng mới, nếu có.
  try {
    const old = JSON.parse(localStorage.getItem(OLD_DRAFT_KEY) || 'null');
    if (old && (old.title || (old.content && old.content.length))) {
      letters = [{
        id: makeLetterId(),
        templateId: resolveTemplateId(old.templateId || DEFAULT_TEMPLATE_ID),
        title: old.title || '',
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

// Mở app ở nhiều tab cùng lúc: mỗi tab chỉ đọc localStorage 1 lần lúc khởi động,
// nên nếu tab A lưu thư X rồi tab B lưu thư Y sau đó, saveLetters() ở tab B (ghi
// đè cả mảng letters trong bộ nhớ của nó) sẽ xoá mất thay đổi thư X vì tab B chưa
// từng biết tới nó. Lắng nghe sự kiện "storage" (chỉ bắn ở các tab KHÁC, không
// bắn ở tab vừa tự lưu) để đồng bộ lại letters mỗi khi có tab khác lưu, tránh bị
// ghi đè mất dữ liệu khi tab hiện tại lưu lần kế tiếp.
window.addEventListener('storage', (e) => {
  if (e.key !== LETTERS_KEY) return;
  try {
    letters = (JSON.parse(e.newValue || '[]') || []).map((l: Letter) => ({
      ...l, templateId: resolveTemplateId(l.templateId), content: migrateContentToPages(l.content),
    }));
  } catch (err) { return; }
  if (els.screens.home.classList.contains('active')) renderHome();
});

function upsertCurrentLetter() {
  currentLetter!.updatedAt = Date.now();
  const idx = letters.findIndex((l) => l.id === currentLetter!.id);
  if (idx >= 0) letters[idx] = currentLetter!;
  else letters.unshift(currentLetter!);
  saveLetters();
}

function makeBlankLetter(): Letter {
  return {
    id: makeLetterId(),
    templateId: DEFAULT_TEMPLATE_ID,
    title: '', date: new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }),
    greeting: '', label: '', content: [['']], closing: '', sign: '', postscript: '',
    updatedAt: Date.now(),
  };
}

function formatRelativeTime(ts: number): string {
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
  (els.homeEmpty as HTMLElement).hidden = sorted.length > 0;
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
    card.querySelector('.letter-card-open')!.addEventListener('click', () => {
      currentLetter = JSON.parse(JSON.stringify(letter));
      composeReturnTo = 'home';
      goCompose();
    });
    card.querySelector('.letter-card-delete')!.addEventListener('click', () => {
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
// Bấm thẻ chỉ CHỌN (không tự chuyển màn) — "Xác nhận"/"Xem mẫu" ở dưới mới thật
// sự hành động, xem picker-confirm/picker-view-sample bên dưới.
function renderPickerGrid() {
  els.pickerGrid.innerHTML = '';
  TEMPLATE_LIST.forEach((tpl) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'theme-card' + (tpl.id === currentLetter!.templateId ? ' picked' : '');
    card.innerHTML = `
      <span class="t-swatch" style="background:${tpl.ink};">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tpl.icon}</svg>
      </span>
      <p class="t-name">${escapeHtml(tpl.name)}</p>
      <span class="t-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
    `;
    card.addEventListener('click', () => {
      currentLetter!.templateId = tpl.id;
      els.pickerGrid.querySelectorAll('.theme-card.picked').forEach((el) => el.classList.remove('picked'));
      card.classList.add('picked');
      updateLivePreview();
    });
    els.pickerGrid.appendChild(card);
  });
}

els.pickerConfirm.addEventListener('click', () => goCompose());
els.pickerConfirmTop.addEventListener('click', () => goCompose());
els.pickerViewSample.addEventListener('click', () => goSamplePreview());

els.pickerBack.addEventListener('click', () => {
  if (pickerReturnTo === 'compose') goCompose(); else goHome();
});

// ---------- Màn 3: Soạn thư ----------
const PARA_WARN_LENGTH = 400;

function updateParaCount(textarea: HTMLTextAreaElement) {
  const countEl = textarea.parentElement!.querySelector('.para-count')!;
  const len = textarea.value.length;
  countEl.textContent = `${len} ký tự`;
  countEl.classList.toggle('warn', len > PARA_WARN_LENGTH);
}

function makeBreakToggle(active: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = 'para-break' + (active ? ' is-active' : '');
  el.innerHTML = `
    <span class="para-break-line"></span>
    <button type="button" class="para-break-toggle">${active ? 'Trang mới ✕' : '+ Ngắt trang'}</button>
    <span class="para-break-line"></span>
  `;
  el.querySelector('.para-break-toggle')!.addEventListener('click', () => {
    const isActive = el.classList.toggle('is-active');
    el.querySelector('.para-break-toggle')!.textContent = isActive ? 'Trang mới ✕' : '+ Ngắt trang';
    syncFormToLetter();
  });
  return el;
}

function makeParaRow(value: string | undefined): HTMLElement {
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
  const textarea = row.querySelector('.para-input') as HTMLTextAreaElement;
  textarea.value = value || '';
  updateParaCount(textarea);
  textarea.addEventListener('input', () => updateParaCount(textarea));
  row.querySelector('.para-remove')!.addEventListener('click', () => {
    if (els.paraList.querySelectorAll('.para-row').length <= 1) return;
    const prev = row.previousElementSibling;
    const next = row.nextElementSibling;
    if (prev && prev.classList.contains('para-break')) prev.remove();
    else if (next && next.classList.contains('para-break')) next.remove();
    row.remove();
    clearFieldError(els.paraList);
    syncFormToLetter();
  });
  return row;
}

function addParagraph(value: string | undefined, breakBefore: boolean) {
  if (els.paraList.children.length > 0) {
    els.paraList.appendChild(makeBreakToggle(Boolean(breakBefore)));
  }
  els.paraList.appendChild(makeParaRow(value));
}

els.addPara.addEventListener('click', () => {
  addParagraph('', false);
  const inputs = els.paraList.querySelectorAll<HTMLTextAreaElement>('.para-input');
  inputs[inputs.length - 1].focus();
});

function renderComposeForm() {
  els.form.querySelectorAll('.field.has-error').forEach((f) => clearFieldError(f));
  const letter = currentLetter!;
  els.fTitle.value = letter.title;
  els.fDate.value = letter.date;
  els.fGreeting.value = letter.greeting;
  els.fLabel.value = letter.label;
  els.fClosing.value = letter.closing;
  els.fSign.value = letter.sign;
  els.fPostscript.value = letter.postscript;
  els.paraList.innerHTML = '';
  const pages = letter.content.length ? letter.content : [['']];
  pages.forEach((page, pageIdx) => {
    page.forEach((doan, paraIdx) => addParagraph(doan, pageIdx > 0 && paraIdx === 0));
  });
}

function readPagesFromForm(): LetterPage[] {
  const pages: LetterPage[] = [];
  let page: LetterPage = [];
  Array.from(els.paraList.children).forEach((child) => {
    if (child.classList.contains('para-break')) {
      if (child.classList.contains('is-active') && page.length) {
        pages.push(page);
        page = [];
      }
      return;
    }
    const text = (child.querySelector('.para-input') as HTMLTextAreaElement).value.trim();
    if (text !== '') page.push(text);
  });
  if (page.length) pages.push(page);
  return pages;
}

function readFormIntoObject(): FormFields {
  return {
    title: els.fTitle.value.trim(), date: els.fDate.value.trim(),
    greeting: els.fGreeting.value.trim(), label: els.fLabel.value.trim(),
    content: readPagesFromForm(), closing: els.fClosing.value.trim(), sign: els.fSign.value.trim(),
    postscript: els.fPostscript.value.trim(),
  };
}

function setFieldError(el: Element, message: string) {
  const field = (el.closest('.field') || el) as HTMLElement;
  field.classList.add('has-error');
  let msg = field.querySelector('.field-error-msg');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'field-error-msg';
    field.appendChild(msg);
  }
  msg.textContent = message;
}

function clearFieldError(el: Element) {
  const field = (el.closest ? (el.closest('.field') || el) : el) as HTMLElement;
  field.classList.remove('has-error');
  const msg = field.querySelector && field.querySelector('.field-error-msg');
  if (msg) msg.remove();
}

function validateComposeForm(ctx: FormFields): HTMLElement | null {
  els.form.querySelectorAll('.field.has-error').forEach((f) => clearFieldError(f));
  let firstInvalid: HTMLElement | null = null;
  const check = (value: string, inputEl: HTMLElement, message: string) => {
    if (!value) {
      setFieldError(inputEl, message);
      if (!firstInvalid) firstInvalid = inputEl;
    }
  };
  check(ctx.title, els.fTitle, 'Vui lòng nhập tiêu đề');
  check(ctx.greeting, els.fGreeting, 'Vui lòng nhập lời chào');
  check(ctx.closing, els.fClosing, 'Vui lòng nhập lời kết');
  check(ctx.sign, els.fSign, 'Vui lòng nhập chữ ký');
  if (ctx.content.length === 0) {
    setFieldError(els.paraList, 'Vui lòng viết ít nhất một đoạn nội dung');
    if (!firstInvalid) firstInvalid = els.paraList.querySelector('.para-input') || els.paraList;
  }
  return firstInvalid;
}

// Đồng bộ nội dung form vào currentLetter trong bộ nhớ mỗi khi gõ — KHÔNG tự lưu
// vào thư viện (chỉ lưu khi bấm hẳn nút "Lưu nháp", xem saveCurrentLetter()) và
// KHÔNG tự tải lại khung xem trước bên phải (chỉ tải lại khi bấm nút reload trên
// khung đó). Không làm vậy nữa thì rời màn Soạn thư mà chưa lưu sẽ mất thay đổi —
// đúng như người dùng muốn: chủ động bấm lưu, không tự động lưu ngầm.
function syncFormToLetter() {
  Object.assign(currentLetter!, readFormIntoObject());
}
els.form.addEventListener('input', syncFormToLetter);
els.paraList.addEventListener('input', syncFormToLetter);

// Lưu thật sự vào thư viện — chỉ gọi từ các nút "Lưu nháp" tường minh.
function saveCurrentLetter() {
  Object.assign(currentLetter!, readFormIntoObject());
  upsertCurrentLetter();
}

els.form.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  const errorField = target.closest('.field.has-error');
  if (errorField) clearFieldError(target);
});
els.paraList.addEventListener('input', () => {
  const hasAny = Array.from(els.paraList.querySelectorAll<HTMLTextAreaElement>('.para-input')).some((t) => t.value.trim() !== '');
  if (hasAny) clearFieldError(els.paraList);
});

els.composeBack.addEventListener('click', () => {
  if (composeReturnTo === 'picker') goPicker('home');
  else goHome();
});

// Đổi phong cách cho thư đang soạn (kể cả thư đã lưu từ trước) — quay lại màn
// Phong cách thư với "Xác nhận" sẽ trở lại đây (xem goPicker/pickerReturnTo).
els.composeStyleBtn.addEventListener('click', () => {
  goPicker('compose');
});

// Chỉ validate + đồng bộ vào bộ nhớ, KHÔNG lưu vào thư viện — xem thư/tải file/
// chia sẻ đều cần nội dung mới nhất đang gõ, nhưng không có nghĩa là đã "lưu".
function validateCompose(): boolean {
  const ctx = readFormIntoObject();
  Object.assign(currentLetter!, ctx);
  const firstInvalid = validateComposeForm(ctx);
  if (firstInvalid) {
    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

async function handlePreviewClick() {
  if (!validateCompose()) return;
  await goLetterPreview();
}
els.previewBtn.addEventListener('click', handlePreviewClick);

// Dùng cho các nút Tải/Chia sẻ ngay tại màn Soạn thư trên máy tính (>=1040px,
// xem ComposeScreen.astro) — validate + dựng lại letterPreviewHtml nhưng KHÔNG
// chuyển màn, vì bên phải đã có xem trước trực tiếp rồi. Không lưu vào thư viện.
async function renderLetterPreviewHtml(): Promise<boolean> {
  if (!validateCompose()) return false;
  try {
    letterPreviewHtml = await renderLetter(currentLetter!.templateId, currentLetter!);
    return true;
  } catch (err) {
    window.alert('Không dựng được lá thư: ' + (err instanceof Error ? err.message : String(err)));
    return false;
  }
}

// ---------- Màn 4: Xem thư ----------
els.letterPreviewBack.addEventListener('click', () => {
  if (previewIsSample) goPicker(pickerReturnTo);
  else goCompose();
});

els.saveDraftBtn.addEventListener('click', () => {
  saveCurrentLetter();
  goHome();
});

function downloadLetterFile() {
  if (!letterPreviewHtml) return;
  const meta = templateMeta(currentLetter!.templateId);
  const filename = `${slugify(currentLetter!.title)}__${meta.id}.html`;
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

async function shareLetterFile() {
  if (!letterPreviewHtml) return;
  const meta = templateMeta(currentLetter!.templateId);
  const filename = `${slugify(currentLetter!.title)}__${meta.id}.html`;
  const file = new File([letterPreviewHtml], filename, { type: 'text/html' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: currentLetter!.title || 'Bức thư' });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return; // người dùng tự huỷ hộp thoại chia sẻ
    }
  }

  downloadLetterFile();
}
els.shareBtn.addEventListener('click', shareLetterFile);

// Nút Tải/Lưu/Chia sẻ ngay tại màn Soạn thư (>=1040px) — xem ghi chú đầu
// ComposeScreen.astro.
els.composeDownloadBtn.addEventListener('click', async () => {
  if (await renderLetterPreviewHtml()) downloadLetterFile();
});
els.composeSaveBtn.addEventListener('click', () => {
  saveCurrentLetter();
  goHome();
});
els.composeShareBtn.addEventListener('click', async () => {
  if (await renderLetterPreviewHtml()) await shareLetterFile();
});

// ---------- khởi động ----------
loadLetters();
resolveRouteAndRender();

// Service worker chỉ dành cho bản PWA thật (cài vào máy, dùng offline) — khi đang
// chạy dev cục bộ (localhost) thì nó chỉ gây phiền vì hay phục vụ nhầm bản JS/HTML
// cũ mỗi khi sửa code. Nên: không đăng ký SW khi ở localhost, đồng thời chủ động
// gỡ mọi SW/cache còn sót lại từ những lần test trước để F5 bình thường là thấy
// bản mới ngay, không cần ẩn danh hay unregister tay nữa.
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

if ('serviceWorker' in navigator) {
  if (IS_LOCAL_DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
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
}

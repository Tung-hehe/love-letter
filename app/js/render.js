// render.js — tải đúng file template thật trong templates/ rồi render bằng tiny-jinja.js.
// Nhờ vậy bản mobile luôn khớp 100% với bản generate.py tạo ra trên máy tính,
// và tự động có ngay khi ai đó thêm/sửa template mới trong templates/.

const templateSourceCache = new Map();

async function fetchTemplateSource(file) {
  if (templateSourceCache.has(file)) return templateSourceCache.get(file);
  const res = await fetch(`/templates/${file}`);
  if (!res.ok) throw new Error(`Không tải được template: ${file}`);
  const text = await res.text();
  templateSourceCache.set(file, text);
  return text;
}

function buildPages(content) {
  if (!content || !content.length) return [];
  if (Array.isArray(content[0])) return content; // đã là danh sách trang
  // định dạng cũ (danh sách đoạn văn phẳng) -> tự động chia 3 đoạn/trang
  const pages = [];
  for (let i = 0; i < content.length; i += 3) pages.push(content.slice(i, i + 3));
  return pages;
}

function normalizeLetterContext(ctx) {
  return {
    title: ctx.title || 'Bức thư',
    date: ctx.date || '',
    greeting: ctx.greeting || '',
    label: ctx.label || '',
    content: buildPages(ctx.content),
    closing: ctx.closing || '',
    sign: ctx.sign || '',
    postscript: ctx.postscript || '',
  };
}

async function renderLetter(templateId, ctx) {
  const meta = TEMPLATE_LIST.find((t) => t.id === templateId) || TEMPLATE_LIST[0];
  const src = await fetchTemplateSource(meta.file);
  return renderTemplate(src, normalizeLetterContext(ctx));
}

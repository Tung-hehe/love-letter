// render.ts — tải đúng file template thật trong templates/ rồi render bằng
// tiny-jinja.ts. Nhờ vậy bản web luôn khớp 100% với bản generate.py tạo ra trên
// máy tính, và tự động có ngay khi ai đó thêm/sửa template mới trong templates/.
// Port từ app/js/render.js (bản cũ).

import { renderTemplate } from './tiny-jinja';
import { getTemplateMeta } from '../data/templates';
import type { Letter, LetterContext, LetterPage } from './types';

const templateSourceCache = new Map<string, string>();

async function fetchTemplateSource(file: string): Promise<string> {
  const cached = templateSourceCache.get(file);
  if (cached !== undefined) return cached;
  const res = await fetch(`/templates/${file}`);
  if (!res.ok) throw new Error(`Không tải được template: ${file}`);
  const text = await res.text();
  templateSourceCache.set(file, text);
  return text;
}

// Danh sách đoạn văn phẳng (định dạng cũ, trước khi có ngắt trang tuỳ chỉnh) ->
// danh sách trang, tự chia 3 đoạn/trang như hành vi cũ. Dùng chung với app.ts's
// migrateContentToPages (chỉ khác nhau ở giá trị trả về khi content rỗng, xem đó).
export function buildPages(content: LetterPage[] | string[] | undefined): LetterPage[] {
  if (!content || !content.length) return [];
  if (Array.isArray(content[0])) return content as LetterPage[]; // đã là danh sách trang
  const flat = content as string[];
  const pages: LetterPage[] = [];
  for (let i = 0; i < flat.length; i += 3) pages.push(flat.slice(i, i + 3));
  return pages;
}

function normalizeLetterContext(ctx: LetterContext): Record<string, unknown> {
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

export async function renderLetter(templateId: string, ctx: LetterContext | Letter): Promise<string> {
  const meta = getTemplateMeta(templateId);
  const src = await fetchTemplateSource(meta.file);
  return renderTemplate(src, normalizeLetterContext(ctx));
}

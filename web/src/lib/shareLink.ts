// shareLink.ts — mã hoá 1 lá thư (kèm phong cách) vào chuỗi an toàn cho URL, để
// chia sẻ dưới dạng link xem online (/xem/:data) thay cho/thêm vào file .html.
// Không cần server/database: toàn bộ dữ liệu nằm ngay trong URL, nén gzip qua
// CompressionStream khi trình duyệt hỗ trợ để link ngắn hơn (có cờ 1 byte đầu
// đánh dấu đã nén hay chưa, để máy đọc link không hỗ trợ nén vẫn báo lỗi rõ ràng
// thay vì đọc ra rác).

import type { LetterContext } from './types';

export interface SharedLetterPayload {
  templateId: string;
  letter: LetterContext;
}

const FORMAT_RAW = 0;
const FORMAT_GZIP = 1;

// Chú thích kiểu tường minh <ArrayBuffer> (thay vì để Uint8Array mặc định suy ra
// ArrayBufferLike) vì lib.dom.d.ts bản mới tách SharedArrayBuffer ra khỏi
// ArrayBuffer — CompressionStream/DecompressionStream chỉ nhận đúng loại có backing
// là ArrayBuffer thường, không thì tsc báo lỗi kiểu dù chạy runtime vẫn đúng.
function toBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const base64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function readAllChunks(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return readAllChunks(cs.readable);
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return readAllChunks(ds.readable);
}

export async function encodeSharedLetter(payload: SharedLetterPayload): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  let format = FORMAT_RAW;
  let body = raw;
  if (typeof CompressionStream !== 'undefined') {
    try {
      const compressed = await gzip(raw);
      if (compressed.length < raw.length) { format = FORMAT_GZIP; body = compressed; }
    } catch (e) { /* nén lỗi thì thôi, dùng bản chưa nén */ }
  }
  const withHeader = new Uint8Array(body.length + 1);
  withHeader[0] = format;
  withHeader.set(body, 1);
  return toBase64Url(withHeader);
}

export async function decodeSharedLetter(data: string): Promise<SharedLetterPayload> {
  const bytes = fromBase64Url(data);
  if (!bytes.length) throw new Error('Link không hợp lệ');
  const format = bytes[0];
  const body = bytes.slice(1);
  let raw = body;
  if (format === FORMAT_GZIP) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Trình duyệt này chưa hỗ trợ mở link đã nén, hãy thử trình duyệt khác');
    }
    raw = await gunzip(body);
  }
  return JSON.parse(new TextDecoder().decode(raw)) as SharedLetterPayload;
}

export function sharedLetterUrl(data: string): string {
  return `${location.origin}/xem/${data}`;
}

// sync-templates.mjs — chạy trước dev/build (xem package.json: predev/prebuild).
// templates/ ở repo root là nguồn duy nhất (generate.py bằng Python cũng đọc thẳng
// từ đó) — script này chỉ copy sang public/templates để web app fetch được, không
// bao giờ chỉnh sửa/tạo mới nội dung. public/templates bị .gitignore, luôn được
// sinh lại từ templates/ thật mỗi lần chạy.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', '..', 'templates');
const dest = path.resolve(here, '..', 'public', 'templates');

if (!existsSync(source)) {
  console.error(`Không tìm thấy thư mục templates/ ở ${source}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(source, dest, { recursive: true });

console.log(`Đã đồng bộ templates/ -> ${path.relative(process.cwd(), dest)}`);

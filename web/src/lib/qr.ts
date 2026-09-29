// qr.ts — dựng SVG mã QR ngay trên trình duyệt cho link chia sẻ (xem shareLink.ts).
// Không gọi dịch vụ tạo QR bên ngoài nào: link chứa toàn bộ nội dung thư, gửi nó
// qua 1 server thứ 3 chỉ để vẽ ảnh QR là lộ nội dung thư cho bên đó một cách
// không cần thiết. Tự vẽ theo module đen/trắng (isDark/getModuleCount của thư
// viện) thay vì dùng qr.createSvgTag() có sẵn, để kiểm soát được viền trắng
// (quiet zone) — luôn cố định đen trên nền trắng, KHÔNG theo theme sáng/tối của
// app, vì máy ảnh cần độ tương phản cao mới quét ổn định.

import qrcode from 'qrcode-generator';

export function buildShareQrSvg(text: string, size = 200): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const quietZone = 4; // số module viền trắng quanh mã — theo khuyến nghị chuẩn QR
  const totalModules = count + quietZone * 2;
  const cell = size / totalModules;

  let path = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col)) continue;
      const x = ((col + quietZone) * cell).toFixed(2);
      const y = ((row + quietZone) * cell).toFixed(2);
      path += `M${x} ${y}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mã QR mở link thư"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

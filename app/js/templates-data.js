// templates-data.js — danh sách 9 phong cách thư dùng xuyên suốt app.
// gradient/ink lấy đúng từ nền + màu chữ ký thật của từng file trong templates/.
// iconGradient dùng cho icon tròn ở màn Thư viện (2 tông đậm hơn của cùng phong cách).
// icon dùng cho màn Phong cách thư — mỗi phong cách 1 biểu tượng riêng, dễ phân biệt
// hơn là chỉ dựa vào gradient (các gradient pastel khá giống nhau khi đặt cạnh nhau).

const TEMPLATE_LIST = [
  { id: 'am_ap', file: 'template_am_ap.html', name: 'Ấm áp', mood: 'ấm cúng',
    gradient: 'linear-gradient(160deg,#f7e1e0 0%,#efe1ee 55%,#e8dff5 100%)', ink: '#d9735a',
    iconGradient: 'linear-gradient(135deg,#e8917a,#4a2e44)',
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>' },
  { id: 'nong_nan', file: 'template_nong_nan.html', name: 'Nồng nàn', mood: 'say đắm',
    gradient: 'linear-gradient(160deg,#f8ead9 0%,#f0cec6 50%,#d9a2a2 100%)', ink: '#8a4258',
    iconGradient: 'linear-gradient(135deg,#8a4258,#d1a06a)',
    icon: '<path d="M12 3c1 2.5-2.5 3.5-2.5 7a2.5 2.5 0 0 0 5 0c.8 1 1.2 2.2 1.2 3.5a3.7 3.7 0 0 1-7.4 0C8.3 9.5 12 7.5 12 3z"/>' },
  { id: 'to_tinh', file: 'template_to_tinh.html', name: 'Tỏ tình', mood: 'rung động',
    gradient: 'linear-gradient(160deg,#fdeaf0 0%,#f3e3f0 55%,#ece0f5 100%)', ink: '#c9527f',
    iconGradient: 'linear-gradient(135deg,#e0729e,#4a3350)',
    icon: '<path d="M4 5h16v10H10l-4 4v-4H4V5z"/>' },
  { id: 'nho_nhung', file: 'template_nho_nhung.html', name: 'Nhớ nhung', mood: 'khắc khoải',
    gradient: 'linear-gradient(160deg,#e9e4d8 0%,#ddd6c6 100%)', ink: '#2f4f7a',
    iconGradient: 'linear-gradient(135deg,#c1443c,#2f4f7a)',
    icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>' },
  { id: 'dem_nho', file: 'template_dem_nho.html', name: 'Đêm nhớ', mood: 'xa xăm',
    gradient: 'linear-gradient(160deg,#0a0f26 0%,#141b3c 50%,#201a3c 100%)', ink: '#3a3576',
    iconGradient: 'linear-gradient(135deg,#4b3f8a,#10142e)',
    icon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' },
  { id: 'xin_loi', file: 'template_xin_loi.html', name: 'Xin lỗi', mood: 'chân thành',
    gradient: 'linear-gradient(165deg,#b7c2d1 0%,#d9d3c9 55%,#f1e3c4 100%)', ink: '#4a5568',
    iconGradient: 'linear-gradient(135deg,#8a9bb0,#f6c667)',
    icon: '<path d="M4 11a8 8 0 0 1 16 0H4z"/><path d="M12 11v7a2 2 0 0 1-2 2"/>' },
  { id: 'binh_yen', file: 'template_binh_yen.html', name: 'Bình yên', mood: 'êm đềm',
    gradient: 'linear-gradient(160deg,#fff6e4 0%,#f2f2df 46%,#e2ead2 100%)', ink: '#3f4d38',
    iconGradient: 'linear-gradient(135deg,#7c9473,#3f4d38)',
    icon: '<path d="M5 21c0-9 5-15 14-16-1 9-7 14-14 16z"/><path d="M6 20c2-5 5.5-8.5 10-11"/>' },
  { id: 'gian_doi', file: 'template_gian_doi.html', name: 'Giận dỗi', mood: 'hờn dỗi',
    gradient: 'linear-gradient(160deg,#ffe3b8 0%,#ffcf9e 55%,#ffb989 100%)', ink: '#e0532f',
    iconGradient: 'linear-gradient(135deg,#ff7a59,#e0532f)',
    icon: '<path d="M7 15a4 4 0 0 1 .6-7.96A5 5 0 0 1 17 8a3.2 3.2 0 0 1-.4 6.4H7z"/><path d="M9 18l-1 2.5M14 18l-1 2.5"/>' },
  { id: 'ngot_ngao', file: 'template_ngot_ngao.html', name: 'Ngọt ngào', mood: 'tươi vui',
    gradient: 'linear-gradient(150deg,#ffe5ec 0%,#ffd6cc 50%,#ffe9d6 100%)', ink: '#e8637d',
    iconGradient: 'linear-gradient(135deg,#ff8fa3,#e8637d)',
    icon: '<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill="#fff" stroke="none"/>' },
];

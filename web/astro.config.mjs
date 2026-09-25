import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// /edit/:id, /edit/:id/style, /edit/:id/preview không phải trang thật — đó là
// route ảo do app.ts tự xử lý bằng history.pushState (id thư nằm trong
// localStorage, không có lúc build). Khi deploy, vercel.json rewrite các path đó
// về index.html; ở đây làm tương tự cho `astro dev`/`astro preview` cục bộ, kẻo
// F5 thẳng vào /edit/xxx sẽ bị 404.
function editRouteFallback() {
  const rewrite = (req, _res, next) => {
    if (req.url && req.url.startsWith('/edit/')) req.url = '/';
    next();
  };
  return {
    name: 'edit-route-fallback',
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); },
  };
}

// Toàn bộ app là SPA client-side (dữ liệu thư nằm trong localStorage, không có
// gì render phía server) — dùng output tĩnh, Vercel chỉ cần serve file tĩnh.
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  vite: {
    plugins: [editRouteFallback()],
  },
});

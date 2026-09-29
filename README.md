# Love letter ✉️

Create beautiful letters on many themes: love, family, friends... See details in [this post](https://www.tungtt.dev/blog/love-letter-projects)

## Structure

```
love-letter-project/
├── content/            # Nội dung thư (file .yaml)
│   └── thu_mau.yaml
├── templates/           # Các mẫu giao diện thư (file .html)
│   ├── template_warm.html        → Ấm áp
│   ├── template_passionate.html  → Nồng nàn
│   ├── template_confession.html  → Tỏ tình
│   ├── template_longing.html     → Nhớ nhung
│   ├── template_night.html       → Đêm
│   ├── template_day.html         → Ngày
│   ├── template_rain.html        → Mưa
│   ├── template_apology.html     → Xin lỗi
│   ├── template_peaceful.html    → Bình yên
│   ├── template_sulking.html     → Giận dỗi
│   ├── template_sweet.html       → Ngọt ngào
│   ├── template_friendship.html  → Tình bạn
│   ├── template_siblings.html    → Anh em
│   ├── template_comrades.html    → Bro
│   ├── template_family.html      → Gia đình (3 người)
│   ├── template_family_4.html    → Gia đình (4 người)
│   ├── template_family_5.html    → Gia đình (5 người)
│   ├── template_farewell.html    → Chia tay
│   └── template_celebration.html → Chúc mừng
├── output/               # Thư đã render
├── generate.py           # Script xuất thư
└── web/                  # App soạn thư (Astro + TypeScript), deploy qua Vercel
    ├── src/pages/index.astro
    ├── src/components/
    ├── src/scripts/app.ts
    ├── src/lib/
    ├── src/data/templates.ts
    ├── scripts/sync-templates.mjs
    └── public/
```

## Run app web

```bash
cd web
npm install
npm run dev        # http://localhost:4321
```

## Build

```bash
npm run build && npm run preview
```

## Run script

```bash
pip install jinja2 pyyaml
```

```bash
python generate.py --content content/thu_moi.yaml --template templates/template_warm.html --output output/thu_gui_em.html
```

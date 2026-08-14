# Love Letter Project ✉️

Dự án tạo thư cá nhân/tình cảm đẹp, xem tốt trên cả laptop và điện thoại.

## Cấu trúc

```
love-letter-project/
├── content/            # Nội dung thư (file .yaml)
│   └── thu_mau.yaml
├── templates/           # Các mẫu giao diện thư (file .html)
│   ├── template_am_ap.html      → Ấm áp — tình cảm gần gũi, ấm cúng
│   ├── template_nong_nan.html   → Nồng nàn — tình yêu say đắm, cháy bỏng
│   ├── template_nho_nhung.html  → Nhớ nhung — khắc khoải, tình yêu xa cách
│   ├── template_ngot_ngao.html  → Ngọt ngào — tươi trẻ, rung động vui tươi
│   ├── template_binh_yen.html   → Bình yên — êm đềm, gắn bó lâu dài
│   ├── template_xin_loi.html    → Xin lỗi — chân thành, làm hoà
│   └── template_gian_doi.html   → Giận dỗi — hờn dỗi dễ thương
├── output/               # Thư đã render (tạo tự động)
└── generate.py           # Script xuất thư
```

## Hiệu ứng mở thư

Mỗi bức thư khi mở file sẽ hiện phong bì đóng kín theo màu chủ đề của template. Bấm/chạm vào phong bì (hoặc nhấn Enter/Space khi focus bằng bàn phím) sẽ có hiệu ứng nắp thư mở ra rồi lá thư hiện lên mượt mà. Hiệu ứng tự tắt nếu thiết bị người xem bật chế độ giảm chuyển động (prefers-reduced-motion) — khi đó thư hiện ra ngay khi bấm, không có animation.

## Chia trang khi thư dài

`content` trong file YAML là danh sách các **trang**, mỗi trang là danh sách đoạn văn — tự chọn đoạn nào thuộc trang nào, thay vì bị chia cứng mỗi 3 đoạn/trang:

```yaml
content:
  - - "Đoạn văn thứ nhất..."
    - "Đoạn văn thứ hai..."
  - - "Đoạn văn thứ ba, để riêng một trang vì muốn nhấn mạnh..."
```

Mỗi gạch đầu dòng cấp 1 là một trang; các gạch đầu dòng cấp 2 bên trong nó là các đoạn văn thuộc trang đó. Lời kết, chữ ký và tái bút luôn nằm ở trang cuối cùng. (Định dạng cũ — `content` là danh sách đoạn văn phẳng, không chia trang con — vẫn dùng được, sẽ tự động chia 3 đoạn/trang như trước để tương thích ngược.)

- Lời kết/chữ ký/tái bút mặc định nằm chung với đoạn văn cuối. Lúc tải trang, script sẽ tự đo chiều cao trang cuối so với các trang khác — nếu phần lời kết làm trang đó cao vượt hẳn, nó sẽ tự tách lời kết/chữ ký/tái bút sang một trang riêng ngay sau đó để các trang cao đều nhau. Việc đo này diễn ra trước khi thư hiện ra nên không bị giật hình.
- Card có chiều cao cố định bằng trang cao nhất (tự đo lúc tải trang) — khi chuyển qua trang ngắn hơn (ví dụ trang chữ ký vừa tách ra), card không bị co ngắn lại, nội dung trang đó tự căn giữa theo chiều dọc trong khoảng không gian cố định đó.
- Có nút mũi tên trái/phải và chấm tròn chỉ số trang ở cuối thẻ thư để chuyển trang; trên máy tính có thể dùng phím mũi tên trái/phải.
- Nếu thư chỉ có 1 trang thì không có nút điều hướng.
- Soạn trong app di động: bấm nút "+ Ngắt trang" hiện giữa hai đoạn văn để đánh dấu đoạn phía dưới bắt đầu một trang mới; bấm lại để gộp về trang trước.

## Font chữ

Tất cả template dùng **font hệ thống có sẵn trên máy người xem** (không tải font ngoài qua Google Fonts hay bất kỳ CDN nào):

- Phần nội dung/tiêu đề bo tròn (Ấm áp, Ngọt ngào, Giận dỗi...): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — trên iPhone/Mac là San Francisco, trên Android là Roboto.
- Phần tiêu đề/chữ ký kiểu chữ nghiêng trang trọng (Nồng nàn, Nhớ nhung, Bình yên, Xin lỗi): `'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif` — Palatino Linotype có sẵn trên Windows, Palatino có sẵn trên macOS/iOS, thanh thoát hơn Georgia.

**Vì sao không dùng Google Fonts nữa:** ban đầu dự án dùng Google Fonts (kể cả bản tự nhúng base64 không cần mạng), nhưng khi mở bằng trình xem HTML tích hợp sẵn trong một số app nhắn tin (ví dụ Messenger), trình xem đó có thể bỏ qua mọi CSS/font tuỳ chỉnh và tự vẽ chữ bằng font mặc định của nó — lúc đó dấu tiếng Việt phức tạp (ư, ơ, các dấu thanh) dễ hiển thị sai dù font đã nhúng sẵn trong file. Dùng thẳng font hệ thống là cách duy nhất đảm bảo hiển thị đúng trong mọi trình xem, vì đó chính là font mà hệ điều hành dùng để hiển thị tiếng Việt trên toàn bộ giao diện máy.

Đánh đổi: các template sẽ không còn nét chữ trang trí độc đáo riêng (Quicksand bo tròn, Cormorant nghiêng, Mali...) mà dùng chung 2 nhóm font hệ thống ở trên — bù lại là độ tương thích tuyệt đối. Nếu vẫn muốn quay lại dùng Google Fonts riêng cho từng template (chấp nhận rủi ro lỗi hiển thị ở một số trình xem hạn chế), có thể thêm `<link>` Google Fonts và đổi `font-family` tương ứng.

## Cài đặt

```bash
pip install jinja2 pyyaml
```

## Cách dùng

### 1. Soạn nội dung thư
Sao chép `content/thu_mau.yaml` thành file mới (ví dụ `content/thu_moi.yaml`) rồi sửa nội dung:

```yaml
title: "Gửi người thương"
date: "20 tháng 7, 2026"
greeting: "Gửi em yêu dấu,"
label: ""                # nhãn nhỏ trên đầu thư (VD: "Hơi Ấm Trao Em"). Để trống "" thì dùng nhãn mặc định của template
content:
  - - "Đoạn văn thứ nhất..."
    - "Đoạn văn thứ hai..."
closing: "Yêu em rất nhiều"
sign: "Em"
postscript: "P.S. ..."   # để trống "" nếu không cần
```

**Nhúng link vào nội dung:** dùng cú pháp kiểu markdown `[chữ hiển thị](link)`, chỉ nhận link `http://`, `https://` hoặc `mailto:`. Ví dụ:

```yaml
content:
  - - "Xem thêm ảnh tụi mình ở đây: [Google Photos](https://photos.google.com/share/...) nhé."
```

Link sẽ mở ở tab mới khi bấm. Áp dụng được ở mọi trường văn xuôi (content, greeting, closing, postscript...), cả khi tạo bằng `generate.py` lẫn khi soạn trong app di động.

### 2. Chạy script

```bash
python generate.py --content content/thu_moi.yaml --template templates/template_am_ap.html --output output/thu_gui_em.html
```

### 3. Xem thư
File HTML kết quả nằm trong `output/`. Mở trực tiếp bằng trình duyệt (double-click file, hoặc kéo vào Chrome/Safari) — xem được ngay trên laptop lẫn điện thoại vì giao diện đã responsive sẵn. Muốn gửi cho người khác, chỉ cần gửi file `.html` đó (qua Zalo, email, AirDrop...) và họ mở bằng trình duyệt trên điện thoại là xem được.

## Thêm template mới

Tạo file `.html` mới trong `templates/`, dùng các biến sau (cú pháp Jinja2):

| Biến | Ý nghĩa |
|---|---|
| `{{ title }}` | Tiêu đề thư |
| `{{ date }}` | Ngày viết thư |
| `{{ greeting }}` | Lời chào mở đầu |
| `{% for doan in content %}{{ doan }}{% endfor %}` | Các đoạn văn nội dung |
| `{{ closing }}` | Lời kết |
| `{{ sign }}` | Chữ ký |
| `{{ postscript }}` | Tái bút (P.S.) |

Luôn thêm `<meta name="viewport" content="width=device-width, initial-scale=1.0">` và dùng `@media (max-width: 480px)` để đảm bảo hiển thị tốt trên điện thoại.

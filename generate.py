#!/usr/bin/env python3
"""
generate.py — Xuất bức thư HTML từ file nội dung (YAML) + template (HTML).

Cách dùng cơ bản:
    python generate.py

Cách dùng có tuỳ chọn:
    python generate.py --content content/thu_mau.yaml --template templates/template_am_ap.html --output output/thu_gui_an.html

Xem tất cả tuỳ chọn:
    python generate.py --help
"""

import argparse
import re
import sys
import unicodedata
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("Thiếu thư viện pyyaml. Cài đặt bằng: pip install pyyaml")

try:
    from jinja2 import Environment, FileSystemLoader, TemplateNotFound
except ImportError:
    sys.exit("Thiếu thư viện jinja2. Cài đặt bằng: pip install jinja2")


BASE_DIR = Path(__file__).resolve().parent
CONTENT_DIR = BASE_DIR / "content"
TEMPLATE_DIR = BASE_DIR / "templates"
OUTPUT_DIR = BASE_DIR / "output"


def list_files(directory: Path, suffixes):
    return sorted(p for p in directory.glob("*") if p.suffix.lower() in suffixes)


def choose_interactively(files, label):
    """Cho người dùng chọn file bằng số thứ tự nếu không truyền tham số."""
    if not files:
        sys.exit(f"Không tìm thấy file nào trong thư mục tương ứng cho {label}.")
    if len(files) == 1:
        print(f"Dùng {label} duy nhất tìm thấy: {files[0].name}")
        return files[0]

    print(f"\nChọn {label}:")
    for i, f in enumerate(files, 1):
        print(f"  {i}. {f.name}")
    while True:
        choice = input(f"Nhập số (1-{len(files)}): ").strip()
        if choice.isdigit() and 1 <= int(choice) <= len(files):
            return files[int(choice) - 1]
        print("Lựa chọn không hợp lệ, thử lại.")


# Cú pháp kiểu markdown: [chữ hiển thị](link). Chỉ nhận link http(s)/mailto
# để tránh chèn mã (vd javascript:) qua href.
MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^\s()]+|mailto:[^\s()]+)\)")


def render_markdown_links(text: str) -> str:
    """Chuyển [chữ](link) thành thẻ <a> thật, mở ở tab mới."""
    if not isinstance(text, str) or "](" not in text:
        return text

    def _replace(match: "re.Match[str]") -> str:
        label, url = match.group(1), match.group(2)
        return f'<a href="{url}" target="_blank" rel="noopener noreferrer">{label}</a>'

    return MARKDOWN_LINK_RE.sub(_replace, text)


def build_pages(paragraphs, transform) -> list:
    """Chuyển nội dung thư thành danh sách các trang (mỗi trang là danh sách đoạn văn).

    Hỗ trợ 2 định dạng trong content.yaml:
    - Mới (khuyến khích): content là danh sách các trang, mỗi trang là danh sách đoạn văn,
      để tự chọn đoạn nào thuộc trang nào.
    - Cũ: content là danh sách đoạn văn phẳng, tự động chia 3 đoạn/trang như trước.
    """
    if not paragraphs:
        return []
    if isinstance(paragraphs[0], list):
        return [[transform(doan) for doan in page] for page in paragraphs]
    return [
        [transform(doan) for doan in paragraphs[i:i + 3]]
        for i in range(0, len(paragraphs), 3)
    ]


def normalize_nfc(value):
    """Chuẩn hoá Unicode về dạng NFC (dựng sẵn), tránh lỗi hiển thị dấu tiếng Việt
    khi nội dung được gõ/copy từ iPhone hoặc Mac (thường lưu ở dạng NFD, tổ hợp)."""
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value)
    if isinstance(value, list):
        return [normalize_nfc(v) for v in value]
    if isinstance(value, dict):
        return {k: normalize_nfc(v) for k, v in value.items()}
    return value


def load_content(content_path: Path) -> dict:
    with open(content_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        sys.exit(f"File nội dung {content_path} không đúng định dạng YAML dạng key-value.")
    return normalize_nfc(data)


def render_letter(content: dict, template_path: Path) -> str:
    env = Environment(loader=FileSystemLoader(str(template_path.parent)))
    try:
        template = env.get_template(template_path.name)
    except TemplateNotFound:
        sys.exit(f"Không tìm thấy template: {template_path}")

    # Đảm bảo các trường hay dùng luôn có mặt để template không lỗi khi thiếu.
    # Các trường văn xuôi được xử lý cú pháp [chữ](link) kiểu markdown thành link thật.
    context = {
        "title": render_markdown_links(content.get("title", "Bức thư")),
        "date": content.get("date", ""),
        "greeting": render_markdown_links(content.get("greeting", "")),
        "label": content.get("label", ""),
        "content": build_pages(content.get("content", []), render_markdown_links),
        "closing": render_markdown_links(content.get("closing", "")),
        "sign": content.get("sign", ""),
        "postscript": render_markdown_links(content.get("postscript", "")),
    }
    return template.render(**context)


def main():
    parser = argparse.ArgumentParser(description="Xuất bức thư HTML từ nội dung + template.")
    parser.add_argument("--content", "-c", type=str, help="Đường dẫn file nội dung (.yaml)")
    parser.add_argument("--template", "-t", type=str, help="Đường dẫn file template (.html)")
    parser.add_argument("--output", "-o", type=str, help="Đường dẫn file HTML kết quả")
    args = parser.parse_args()

    # 1) Chọn file nội dung
    if args.content:
        content_path = Path(args.content)
        if not content_path.is_absolute():
            content_path = BASE_DIR / content_path
    else:
        content_path = choose_interactively(
            list_files(CONTENT_DIR, {".yaml", ".yml"}), "file nội dung"
        )

    if not content_path.exists():
        sys.exit(f"Không tìm thấy file nội dung: {content_path}")

    # 2) Chọn template
    if args.template:
        template_path = Path(args.template)
        if not template_path.is_absolute():
            template_path = BASE_DIR / template_path
    else:
        template_path = choose_interactively(
            list_files(TEMPLATE_DIR, {".html"}), "template"
        )

    if not template_path.exists():
        sys.exit(f"Không tìm thấy template: {template_path}")

    # 3) Render
    content = load_content(content_path)
    html = render_letter(content, template_path)

    # 4) Xuất file
    OUTPUT_DIR.mkdir(exist_ok=True)
    if args.output:
        output_path = Path(args.output)
        if not output_path.is_absolute():
            output_path = BASE_DIR / output_path
    else:
        output_path = OUTPUT_DIR / f"{content_path.stem}__{template_path.stem}.html"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")

    try:
        print(f"\n✔ Đã tạo bức thư: {output_path}")
    except UnicodeEncodeError:
        print(f"\nDa tao buc thu: {output_path}")

if __name__ == "__main__":
    main()

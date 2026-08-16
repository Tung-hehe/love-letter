#!/usr/bin/env python3
"""
generate_all.py — Xuất bức thư HTML từ 1 file nội dung (YAML) cho TẤT CẢ
các template có trong thư mục templates/.

Cách dùng cơ bản (tự chọn file nội dung nếu có nhiều):
    python generate_all.py

Cách dùng có tuỳ chọn:
    python generate_all.py --content content/thu_mau.yaml --output-dir output
"""

import argparse
import sys
from pathlib import Path

from generate import (
    BASE_DIR,
    CONTENT_DIR,
    OUTPUT_DIR,
    TEMPLATE_DIR,
    choose_interactively,
    list_files,
    load_content,
    render_letter,
)


def safe_print(text: str) -> None:
    """In ra console, tự bỏ dấu nếu console không hỗ trợ Unicode (vd cmd.exe mặc định)."""
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", "replace").decode("ascii"))


def main():
    parser = argparse.ArgumentParser(
        description="Xuất bức thư HTML từ 1 nội dung cho tất cả template."
    )
    parser.add_argument("--content", "-c", type=str, help="Đường dẫn file nội dung (.yaml)")
    parser.add_argument(
        "--output-dir", "-o", type=str, help="Thư mục chứa các file HTML kết quả (mặc định: output/)"
    )
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

    # 2) Lấy tất cả template
    template_paths = list_files(TEMPLATE_DIR, {".html"})
    if not template_paths:
        sys.exit(f"Không tìm thấy template nào trong: {TEMPLATE_DIR}")

    # 3) Thư mục xuất
    if args.output_dir:
        output_dir = Path(args.output_dir)
        if not output_dir.is_absolute():
            output_dir = BASE_DIR / output_dir
    else:
        output_dir = OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    # 4) Render nội dung với từng template
    content = load_content(content_path)

    safe_print(f"\nNội dung: {content_path.name}")
    safe_print(f"Số template: {len(template_paths)}\n")

    ok, fail = 0, 0
    for template_path in template_paths:
        try:
            html = render_letter(content, template_path)
        except SystemExit as e:
            safe_print(f"  x {template_path.name}: {e}")
            fail += 1
            continue

        output_path = output_dir / f"{content_path.stem}__{template_path.stem}.html"
        output_path.write_text(html, encoding="utf-8")
        ok += 1
        safe_print(f"  OK: {output_path.relative_to(BASE_DIR)}")

    safe_print(f"\nHoàn tất: {ok} thành công, {fail} lỗi.")


if __name__ == "__main__":
    main()

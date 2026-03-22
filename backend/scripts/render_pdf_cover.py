import os
import sys

import pypdfium2 as pdfium


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: render_pdf_cover.py <input-pdf> <output-png>", file=sys.stderr)
        return 2

    input_pdf = sys.argv[1]
    output_png = sys.argv[2]

    os.makedirs(os.path.dirname(output_png), exist_ok=True)

    document = pdfium.PdfDocument(input_pdf)
    if len(document) == 0:
        raise RuntimeError("empty pdf document")

    page = document[0]
    bitmap = page.render(scale=1.4)
    image = bitmap.to_pil()
    image.save(output_png, format="PNG")

    page.close()
    document.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

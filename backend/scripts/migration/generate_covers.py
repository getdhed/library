import os
import subprocess

pdf_dir = '/app/storage/pdfs'
cover_dir = '/app/storage/covers'
script = '/app/scripts/render_pdf_cover.py'

for pdf_file in os.listdir(pdf_dir):
    if pdf_file.endswith('.pdf'):
        base = os.path.splitext(pdf_file)[0]
        cover_file = f'{base}.webp'
        pdf_path = os.path.join(pdf_dir, pdf_file)
        cover_path = os.path.join(cover_dir, cover_file)
        
        if not os.path.exists(cover_path):
            print(f'Generating cover for {pdf_file}...')
            subprocess.run(['python3', script, pdf_path, cover_path])
print('Done!')

#!/usr/import env python3
import csv
import os
import shutil
import subprocess
import sys
import uuid
import re
from urllib.parse import urlparse, unquote
import datetime

import pg8000

OLD_DATA_DIR = "/app/storage/old_library_data"
CSV_PATH = os.path.join(OLD_DATA_DIR, "old_library_data.csv")
PDFS_DIR = "/app/storage/pdfs"
COVERS_DIR = "/app/storage/covers"
RENDER_SCRIPT = "/app/scripts/render_pdf_cover.py"

DB_HOST = os.environ.get("DB_HOST", "db")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_USER = os.environ.get("DB_USER", "library")
DB_NAME = os.environ.get("DB_NAME", "library")
DB_PASS = os.environ.get("DB_PASSWORD", "library")

def get_connection():
    return pg8000.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASS,
        database=DB_NAME
    )

def extract_filename_from_url(url_str):
    if not url_str or url_str == "NULL":
        return None, None
    try:
        parsed = urlparse(url_str)
        path = unquote(parsed.path)
    except Exception:
        return None, None
    path = path.lstrip("/")
    if "#" in path:
        path = path.split("#")[0]
    parts = path.split("/", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    elif len(parts) == 1:
        return None, parts[0]
    return None, None

def generate_cover(pdf_path, cover_path):
    try:
        result = subprocess.run(
            ["python3", RENDER_SCRIPT, pdf_path, cover_path],
            capture_output=True, text=True, timeout=30
        )
        return result.returncode == 0
    except Exception as e:
        print(f"  Cover generation error: {e}")
        return False

def parse_tags(raw):
    if not raw or raw == "NULL":
        return []
    raw = raw.strip().strip('"')
    tags = []
    for part in raw.split(";"):
        part = part.strip()
        if part and part != "NULL":
            tags.append(part)
    return tags

def clean_null(val):
    if val is None or val.strip() == "NULL":
        return ""
    return val.strip()

def clean_author(val):
    """Clean author name: remove commas between last name and initials"""
    val = clean_null(val)
    if not val:
        return val
    # 'Николаюк, П.П.' -> 'Николаюк П.П.'
    # Matches a word, followed by comma, space(s), and initials
    val = re.sub(r'([А-Яа-яA-Za-z]+),\s*([А-Яа-яA-Za-z\.]+)', r'\1 \2', val)
    return val.strip()

def parse_csv_to_map():
    print(f"Reading CSV from {CSV_PATH}...")
    try:
        with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
            text = f.read()
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return {}

    lines = text.split('\n')
    raw_records = []
    current_record = ""
    for line in lines:
        if not line.strip():
            continue
        if re.match(r'^\d+;', line):
            if current_record:
                raw_records.append(current_record)
            current_record = line
        else:
            current_record += "\n" + line
    if current_record:
        raw_records.append(current_record)

    file_mapping = {}
    for raw in raw_records:
        parts = raw.split(";")
        if len(parts) >= 16:
            extra = len(parts) - 16
            desc = ";".join(parts[9:10+extra])
            row = parts[:9] + [desc] + parts[10+extra:]
        else:
            row = parts

        if len(row) >= 12:
            url_str = row[11].strip()
            folder, filename = extract_filename_from_url(url_str)
            if filename:
                # normalize filename for map keys
                norm_name = os.path.basename(filename).lower()
                if norm_name.startswith("-"): norm_name = norm_name[1:]
                if norm_name.startswith("bylocal-"): norm_name = norm_name[8:]
                if norm_name.startswith("byипс-"): norm_name = norm_name[6:]
                file_mapping[norm_name] = row
    
    print(f"Parsed {len(file_mapping)} unique file mappings from CSV")
    return file_mapping

def get_all_pdf_files():
    all_files = []
    for folder in ["local", "net"]:
        path = os.path.join(OLD_DATA_DIR, folder)
        if os.path.isdir(path):
            for f in os.listdir(path):
                if f.lower().endswith(".pdf"):
                    all_files.append((folder, f, os.path.join(path, f)))
    return all_files

def main():
    print("=" * 60)
    print("OLD LIBRARY DATABASE MIGRATION (FULL DIR SCAN)")
    print("=" * 60)

    conn = get_connection()
    cursor = conn.cursor()

    file_mapping = parse_csv_to_map()
    all_files = get_all_pdf_files()
    print(f"Found {len(all_files)} PDF files in old data directories")

    imported = 0
    errors = 0

    for i, (folder, filename, file_path) in enumerate(all_files):
        print(f"[{i+1}/{len(all_files)}] Processing {folder}/{filename}...")
        
        norm_name = filename.lower()
        if norm_name.startswith("-"): norm_name = norm_name[1:]
        if norm_name.startswith("bylocal-"): norm_name = norm_name[8:]
        if norm_name.startswith("byипс-"): norm_name = norm_name[6:]

        record = file_mapping.get(norm_name)
        
        # Default metadata if not found in CSV
        title = filename[:-4]
        author = ""
        doc_type = "Неизвестно"
        place_of_pub = ""
        publisher = ""
        volume = ""
        year = str(datetime.datetime.now().year)
        description = ""
        periodical_name = ""
        executor = ""
        scientific_advisor = ""
        tags_raw = ""
        created_at = datetime.datetime.now()

        if record:
            author = clean_author(record[1]) if len(record) > 1 else author
            title_raw = record[2].strip() if len(record) > 2 else ""
            if title_raw: title = title_raw
            doc_type = clean_null(record[3]) if len(record) > 3 else doc_type
            if not doc_type: doc_type = "Неизвестно"
            place_of_pub = clean_null(record[4]) if len(record) > 4 else place_of_pub
            publisher = clean_null(record[5]) if len(record) > 5 else publisher
            volume = clean_null(record[6]) if len(record) > 6 else volume
            tags_raw = record[7].strip() if len(record) > 7 else tags_raw
            year_str = clean_null(record[8]) if len(record) > 8 else year
            if year_str: 
                match = re.search(r'\d{4}', year_str)
                if match:
                    year = match.group(0)
                else:
                    year = str(datetime.datetime.now().year)
            description = clean_null(record[9]) if len(record) > 9 else description
            created_at_str = clean_null(record[10]) if len(record) > 10 else ""
            if created_at_str:
                try:
                    created_at = datetime.datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S.%f")
                except ValueError:
                    try:
                        created_at = datetime.datetime.strptime(created_at_str, "%Y-%m-%d")
                    except ValueError:
                        pass
            
            periodical_name = clean_null(record[12]) if len(record) > 12 else periodical_name
            executor = clean_null(record[13]) if len(record) > 13 else executor
            scientific_advisor = clean_null(record[14]) if len(record) > 14 else scientific_advisor

        is_local = (folder == "local")
        file_size = os.path.getsize(file_path)

        new_uuid = str(uuid.uuid4())
        new_pdf_name = f"{new_uuid}.pdf"
        new_pdf_path = os.path.join(PDFS_DIR, new_pdf_name)
        db_file_path = f"pdfs/{new_pdf_name}" # The fix for frontend opening

        try:
            shutil.copy2(file_path, new_pdf_path)
            
            cover_name = f"{new_uuid}.webp"
            cover_path = os.path.join(COVERS_DIR, cover_name)
            db_cover_path = f"covers/{cover_name}"
            if not generate_cover(new_pdf_path, cover_path):
                db_cover_path = ""
                
            cursor.execute("""
                INSERT INTO documents (
                    title, author, executor, scientific_advisor, year, type,
                    place_of_publication, publisher, periodical_name, volume,
                    description, file_path, file_name, file_size_bytes, mime_type,
                    cover_path, is_local, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """, [
                title[:255], author[:255], executor[:255], scientific_advisor[:255], year[:50], doc_type[:100],
                place_of_pub[:255], publisher[:255], periodical_name[:255], volume[:100],
                description, db_file_path, filename[:255], file_size, "application/pdf",
                db_cover_path, is_local, created_at, created_at
            ])
            doc_id = cursor.fetchone()[0]
            
            tags = parse_tags(tags_raw)
            for tag in tags:
                tag = tag.strip()[:100]
                if not tag:
                    continue
                try:
                    cursor.execute("INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING RETURNING id", [tag])
                    row = cursor.fetchone()
                    if row:
                        tag_id = row[0]
                    else:
                        cursor.execute("SELECT id FROM tags WHERE name = %s", [tag])
                        tag_id = cursor.fetchone()[0]
                    
                    cursor.execute("INSERT INTO document_tags (document_id, tag_id) VALUES (%s, %s)", [doc_id, tag_id])
                except Exception as e:
                    print(f"  Tag warning ({tag}): {e}")
            
            conn.commit()
            imported += 1
            if imported % 50 == 0:
                print(f"  Progress: {imported} imported...")
                
        except Exception as e:
            conn.rollback()
            print(f"  [ERROR] Failed to import {filename}: {e}")
            errors += 1

    cursor.close()
    conn.close()

    print("=" * 60)
    print("MIGRATION COMPLETE")
    print(f"  Successfully imported: {imported}")
    print(f"  Failed (errors): {errors}")
    print("=" * 60)

if __name__ == "__main__":
    main()

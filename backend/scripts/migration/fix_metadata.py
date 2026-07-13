import csv, pg8000, os, re, datetime
from urllib.parse import unquote

conn = pg8000.connect(host='db', port=5432, user='library', password='library', database='library')
cur = conn.cursor()

def extract_filename_from_url(url):
    parts = url.split('/')
    if len(parts) >= 2:
        folder = parts[-2]
        filename = unquote(parts[-1])
        return folder, filename
    return None, None

def clean_author(raw):
    raw = raw.strip('\"\' ')
    raw = re.sub(r'([А-Яа-яЁёA-Za-z]+),\s*([А-Яа-яЁёA-Za-z]\.)', r'\1 \2', raw)
    return raw

def clean_null(val):
    v = val.strip('\"\' ')
    if v == 'NULL' or not v:
        return ''
    return v

# First read all documents from DB so we know what to update
cur.execute('SELECT id, file_name FROM documents')
db_docs = cur.fetchall()
file_name_to_id = {row[1].lower(): row[0] for row in db_docs}

CSV_PATH = '/app/storage/old_library_data/old_library_data.csv'

# Since CSV has unquoted newlines, we need the manual parsing logic, but PROPERLY handling quoted sections
def parse_csv_records():
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        text = f.read()

    # Split by newlines, but group them if they don't start with a number and semicolon
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
        # Proper CSV parsing of a single row string
        # Use csv module to parse the single line properly accounting for quotes
        reader = csv.reader([raw], delimiter=';', quotechar='"')
        try:
            row = next(reader)
        except Exception:
            continue

        if len(row) >= 12:
            url_str = row[11].strip()
            folder, filename = extract_filename_from_url(url_str)
            if filename:
                norm_name = os.path.basename(filename).lower()
                if norm_name.startswith("-"): norm_name = norm_name[1:]
                if norm_name.startswith("bylocal-"): norm_name = norm_name[8:]
                if norm_name.startswith("byипс-"): norm_name = norm_name[6:]
                file_mapping[norm_name] = row
    return file_mapping

file_mapping = parse_csv_records()
print(f"Parsed {len(file_mapping)} unique file mappings from CSV")

updated_count = 0
for norm_name, doc_id in file_name_to_id.items():
    if norm_name in file_mapping:
        record = file_mapping[norm_name]
        author = clean_author(record[1]) if len(record) > 1 else ""
        title = record[2].strip() if len(record) > 2 else ""
        doc_type = clean_null(record[3]) if len(record) > 3 else "Неизвестно"
        if not doc_type: doc_type = "Неизвестно"
        place_of_pub = clean_null(record[4]) if len(record) > 4 else ""
        publisher = clean_null(record[5]) if len(record) > 5 else ""
        volume = clean_null(record[6]) if len(record) > 6 else ""
        
        # Tags are at index 7, but we won't update tags right now to avoid messing up the many-to-many relationship
        
        year = str(datetime.datetime.now().year)
        year_str = clean_null(record[8]) if len(record) > 8 else ""
        if year_str:
            match = re.search(r'\d{4}', year_str)
            if match:
                year = match.group(0)
                
        description = clean_null(record[9]) if len(record) > 9 else ""
        
        created_at_str = clean_null(record[10]) if len(record) > 10 else ""
        created_at = None
        if created_at_str:
            try:
                created_at = datetime.datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S.%f")
            except ValueError:
                try:
                    created_at = datetime.datetime.strptime(created_at_str, "%Y-%m-%d")
                except:
                    pass

        cur.execute('''
            UPDATE documents 
            SET title=%s, author=%s, place_of_publication=%s, publisher=%s, 
                volume=%s, year=%s, description=%s 
            WHERE id=%s
        ''', [title, author, place_of_pub, publisher, volume, year[:50], description, doc_id])
        
        if created_at:
            cur.execute('UPDATE documents SET created_at=%s, updated_at=%s WHERE id=%s', [created_at, created_at, doc_id])
            
        updated_count += 1

conn.commit()
cur.close()
conn.close()

print(f"Updated {updated_count} documents with fixed metadata!")

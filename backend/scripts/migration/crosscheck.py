import csv, pg8000, os, re

conn = pg8000.connect(host='db', port=5432, user='library', password='library', database='library')
cur = conn.cursor()

def clean_null(val):
    v = val.strip('\"\' ')
    return '' if v == 'NULL' or not v else v

def clean_author(raw):
    raw = raw.strip('\"\' ')
    return re.sub(r'([А-Яа-яЁёA-Za-z]+),\s*([А-Яа-яЁёA-Za-z]\.)', r'\1 \2', raw)

# Load DB docs
cur.execute('SELECT id, file_name, title, author, year, type, description, place_of_publication, publisher FROM documents ORDER BY random() LIMIT 50;')
db_docs = cur.fetchall()

# Parse CSV
CSV_PATH = '/app/storage/old_library_data/old_library_data.csv'
with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
    text = f.read()

lines = text.split('\n')
raw_records = []
current_record = ''
for line in lines:
    if not line.strip(): continue
    if re.match(r'^\d+;', line):
        if current_record: raw_records.append(current_record)
        current_record = line
    else:
        current_record += '\n' + line
if current_record: raw_records.append(current_record)

csv_map = {}
for raw in raw_records:
    reader = csv.reader([raw], delimiter=';', quotechar='\"')
    try: row = next(reader)
    except Exception: continue
    if len(row) >= 12:
        url_str = row[11].strip()
        filename = url_str.split('/')[-1] if '/' in url_str else url_str
        from urllib.parse import unquote
        filename = unquote(filename)
        if filename:
            norm_name = os.path.basename(filename).lower()
            if norm_name.startswith('-'): norm_name = norm_name[1:]
            if norm_name.startswith('bylocal-'): norm_name = norm_name[8:]
            if norm_name.startswith('byипс-'): norm_name = norm_name[6:]
            csv_map[norm_name] = row

mismatches = 0
checked = 0

print('--- MANUAL VERIFICATION OF 5 RANDOM SAMPLES ---')
samples_shown = 0

for doc in db_docs:
    db_id, db_fname, db_title, db_author, db_year, db_type, db_desc, db_place, db_publisher = doc
    norm_name = db_fname.lower()
    
    if norm_name in csv_map:
        checked += 1
        csv_row = csv_map[norm_name]
        
        csv_author = clean_author(csv_row[1]) if len(csv_row) > 1 else ''
        csv_title = csv_row[2].strip() if len(csv_row) > 2 else ''
        
        csv_place = clean_null(csv_row[4]) if len(csv_row) > 4 else ''
        csv_publisher = clean_null(csv_row[5]) if len(csv_row) > 5 else ''
        
        csv_year = ''
        year_str = clean_null(csv_row[8]) if len(csv_row) > 8 else ''
        if year_str:
            match = re.search(r'\d{4}', year_str)
            if match: csv_year = int(match.group(0))
        
        csv_desc = clean_null(csv_row[9]) if len(csv_row) > 9 else ''
        
        if samples_shown < 5:
            print(f'\n[Document {db_id}] {db_fname}')
            print(f'CSV Title: {csv_title} | DB Title: {db_title}')
            print(f'CSV Author: {csv_author} | DB Author: {db_author}')
            print(f'CSV Year: {csv_year} | DB Year: {db_year}')
            print(f'CSV Publisher: {csv_publisher} | DB Publisher: {db_publisher}')
            print(f'CSV Place: {csv_place} | DB Place: {db_place}')
            print(f'CSV Desc length: {len(csv_desc)} | DB Desc length: {len(db_desc)}')
            samples_shown += 1
            
        if csv_title != db_title or csv_author != db_author or csv_place != db_place or csv_publisher != db_publisher or csv_desc != db_desc:
            mismatches += 1

print(f'\nTotal checked against CSV: {checked}')
print(f'Mismatches found (excluding type normalizations): {mismatches}')

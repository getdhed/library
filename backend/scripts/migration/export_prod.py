import pg8000
import json
conn = pg8000.connect(host='db', port=5432, user='library', password='library', database='library')
cur = conn.cursor()
cur.execute('SELECT title, author, year, type, description, file_path, file_name, file_size_bytes, mime_type, cover_path, created_at, updated_at, executor, scientific_advisor, place_of_publication, publisher, periodical_name, volume, is_local FROM documents')
rows = cur.fetchall()

def escape_sql(val):
    if val is None: return 'NULL'
    if isinstance(val, (int, float, bool)): return str(val).lower() if isinstance(val, bool) else str(val)
    if isinstance(val, str):
        return "'" + val.replace("'", "''") + "'"
    return "'" + str(val) + "'" # fallback for datetime

sql_inserts = []
for row in rows:
    vals = [escape_sql(v) for v in row]
    sql_inserts.append('INSERT INTO documents (title, author, year, type, description, file_path, file_name, file_size_bytes, mime_type, cover_path, created_at, updated_at, executor, scientific_advisor, place_of_publication, publisher, periodical_name, volume, is_local) VALUES (' + ', '.join(vals) + ');')

with open('/app/storage/prod_migration.sql', 'w', encoding='utf-8') as f:
    f.write('-- Exported data for production (without IDs to prevent collisions)\n')
    f.write('\n'.join(sql_inserts))

print(f'Exported {len(rows)} documents to prod_migration.sql')

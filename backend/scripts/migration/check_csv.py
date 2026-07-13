import csv
import re

with open('/app/storage/old_library_data/old_library_data.csv', 'r', encoding='utf-8-sig') as f:
    text = f.read()
    
# Let's write a custom parser
# We will split by \n, but if a line doesn't start with ^\d+; we append to previous
lines = text.split('\n')
records = []
current_record = ""

for line in lines:
    if not line.strip():
        continue
    # Check if line starts with an integer followed by ';'
    if re.match(r'^\d+;', line):
        if current_record:
            records.append(current_record)
        current_record = line
    else:
        current_record += "\n" + line

if current_record:
    records.append(current_record)

print('Total custom parsed records:', len(records))

# Let's check how many columns each custom record has
valid = 0
invalid = 0
for i, r in enumerate(records):
    # Split by ';' but we have to be careful about quotes?
    # Actually if we just use csv.reader on the single reconstructed row
    # without quotechar it might be bad if there are internal semicolons
    # Let's count semicolons
    cols = len(r.split(';'))
    if cols >= 12:
        valid += 1
    else:
        invalid += 1

print(f"Valid: {valid}, Invalid: {invalid}")

# Wait, we know there are 781 total records in the DB theoretically?
# Or the number of records is exactly the number of lines that start with ^\d+; ?

import csv, re

raw = '6260;"Соловейко, А.И. ; Волосников, Р.А. ; Пальчевский, И.В. ; Гребенчук, И.В.";Социология управления_2019;Учебное пособие;Минск;ГУО "ИПС РБ";183 с.;социология управления;2019;Учебное пособие...;2019-11-21 00:00:00.000;http://10.46.2.53:3000/local/Социология управл_Соловейко_2019.pdf;NULL;NULL;NULL;F9EFC149-71A7-4C77-97CC-3BB1EE2224DB'
reader = csv.reader([raw], delimiter=';', quotechar='"')
row = next(reader)
print("Row 1:", row[1])

def clean_author(raw):
    raw = raw.strip('\"\' ')
    raw = re.sub(r'([А-Яа-яЁёA-Za-z]+),\s*([А-Яа-яЁёA-Za-z]\.)', r'\1 \2', raw)
    return raw

print("Cleaned:", clean_author(row[1]))

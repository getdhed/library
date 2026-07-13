import csv
raw = '123;Author;Title;Type;Place;Publisher;Vol;Tags;Year;Desc line 1\nDesc line 2;Date;URL'
row_list = list(csv.reader([raw], delimiter=';', quotechar='"'))
print(row_list)

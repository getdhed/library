# Руководство пользователя системы «Электронная Библиотека»

Данное руководство описывает доступный функционал и сценарии использования системы для **Обычного пользователя**, **Библиотекаря** и **Супер-администратора**, включая развертывание на Windows Server с IIS.

---

## 1. Обычный пользователь (Читатель)

Обычный пользователь имеет доступ к публичной части библиотеки. Его главная цель — поиск, чтение и сохранение интересующих его материалов, а также возможность предлагать новые документы для добавления в библиотеку.

### Основные возможности:

*   **Регистрация и Авторизация**
    *   Создание личного аккаунта (ФИО, логин, пароль).
    *   Вход в систему для получения доступа к защищенным материалам и персональным функциям.
*   **Поиск и навигация по каталогу**
    *   Просмотр каталога всех доступных документов.
    *   Поиск по ключевым словам (название, автор).
    *   Умные подсказки (саджесты) при вводе запроса в строку поиска.
    *   Фильтрация материалов по типу (Книга, Статья, Учебник, Журнал и т.д.), году издания, тегам.
    *   Просмотр детальной карточки документа (аннотация, авторы, год, количество страниц, размер файла).
*   **Чтение документов**
    *   Встроенный PDF-ридер для комфортного чтения прямо в браузере без необходимости скачивания.
    *   Скачивание исходного файла документа (если разрешено).
*   **Персонализация (Личный кабинет)**
    *   **Избранное**: добавление документов в закладки для быстрого доступа в будущем (раздел "Мое избранное").
    *   **История просмотров**: отслеживание недавно открытых и прочитанных документов.
    *   **История поиска**: сохранение последних поисковых запросов для быстрого повторения поиска.
*   **Предложение материалов (Заявки)**
    *   Если пользователь не нашел нужный документ, он может загрузить свой PDF-файл и заполнить базовые данные (Название, Авторы, Описание).
    *   Отправка заявки на модерацию библиотекарю.
    *   Отслеживание статуса своих заявок в Личном кабинете (В ожидании, Одобрено, Отклонено).

---

## 2. Библиотекарь (Администратор контента)

Библиотекарь имеет полный доступ к функционалу Обычного пользователя, а также доступ к **Панели Администратора**. Его главная цель — управление фондом библиотеки, модерация контента и контроль за пользователями.

### Разделы и возможности Панели Администратора:

#### 2.1. Модерация заявок
*   Просмотр списка всех предложенных пользователями документов.
*   Проверка загруженного пользователем PDF-файла и введенных метаданных.
*   **Одобрение заявки**: при одобрении библиотекарь может отредактировать метаданные (например, исправить опечатки, добавить теги), после чего документ официально публикуется в общем каталоге.
*   **Отклонение заявки**: отклонение загруженного материала (например, если это спам, дубликат или неподходящий формат) с возможностью указания причины (если предусмотрено системой).

#### 2.2. Управление документами (Каталог)
*   **Добавление новых документов**: прямая загрузка PDF-файлов, генерация обложек, заполнение всех полей (Название, Авторы, Год, Тип, Теги).
*   **Редактирование**: изменение карточки любого существующего документа в базе.
*   **Удаление (Soft Delete)**: перемещение документа в «Архив». Документ скрывается из общего каталога, но физически остается в базе данных для возможности восстановления.

#### 2.3. Управление пользователями
*   Просмотр полного списка зарегистрированных читателей.
*   Поиск пользователей по логину или ФИО.
*   **Блокировка / Разблокировка**: изменение статуса аккаунта пользователя (например, временная блокировка за нарушение правил библиотеки). Заблокированный пользователь не может авторизоваться в системе.
*   **Редактирование профилей**: изменение данных пользователей (ФИО, логин) или сброс/установка нового пароля по их запросу.
*   Создание новых пользователей вручную через админку.

#### 2.4. Статистика
*   Просмотр графиков активности (количество посещений, загрузок, просмотров документов за разные периоды: день, неделя, месяц).
*   Аналитика популярности материалов.

#### 2.5. Журнал действий (Аудит)
*   Просмотр подробного лога всех значимых действий в системе (кто, когда и что сделал).
*   Отслеживание изменений в документах (какие поля были изменены, кто одобрил заявку, кто удалил файл).
*   Удобный инструмент для разбора конфликтных ситуаций или ошибок контент-менеджмента.

#### 2.6. Архив
*   Просмотр списка всех удаленных (Soft Delete) документов и заблокированных/удаленных пользователей.
*   **Восстановление**: возврат документа в публичный каталог или восстановление аккаунта пользователя.
*   *(Примечание: Полное физическое удаление (Hard Delete) обычно недоступно библиотекарю во избежание случайной потери данных и является прерогативой Супер-администратора).*

---

---

## 3. Супер-администратор (Super Admin) и DevOps

Супер-администратор (superadmin) — это высший уровень доступа в системе. В интерфейсе он может делать всё то же, что и библиотекарь, плюс обладает правом на необратимое удаление данных. Но главная задача Супер-администратора — это **развертывание (деплой) проекта на сервере** и его **обслуживание (maintenance)**.

---

### ЧАСТЬ 1: Системные функции в интерфейсе (Админ-панель)

#### 1. Необратимое удаление данных (Hard Delete)
Обычный библиотекарь может только отправлять книги в Архив (Мягкое удаление / Soft Delete).
Супер-администратор имеет право нажать кнопку **"Удалить навсегда"**:
*   Это полностью стирает строку из базы данных PostgreSQL.
*   Это физически удаляет PDF-файл книги и её обложку с жесткого диска сервера, безвозвратно освобождая место.
*   Используйте эту функцию только при 100% уверенности, что данные больше не нужны.

#### 2. Резервное копирование (Скачивание БД из браузера)
*   В разделе **"Статистика"** внизу страницы вы увидите блок "Системные действия".
*   При нажатии на **"Скачать базу данных"**, система автоматически выполнит системную команду внутри сервера и отдаст вам готовый файл `library_backup.bak`.
*   Этот файл содержит только PostgreSQL и **не содержит PDF/обложки**. Для штатного резервного копирования используйте комплект из БД и `backend/storage`, описанный в сценарии 3 ниже, и храните копию вне сервера.

---

### ЧАСТЬ 2: Пошаговое руководство по деплою на Windows Server с IIS

Рабочая схема этого проекта: **IIS — единственная публичная точка входа и
завершает HTTPS**, а PostgreSQL, backend и frontend работают в Linux-контейнерах
и опубликованы только на loopback-интерфейсе Windows (`127.0.0.1`). Файл
`docker-compose.prod.yml` является overlay для этого сценария. Он не запускает
nginx; лежащая в репозитории конфигурация nginx сама по себе не активна.

На сервере заранее должны быть:

* поддерживаемая вашей организацией среда запуска Linux-контейнеров и команда
  `docker compose`;
* IIS с модулями **URL Rewrite** и **Application Request Routing (ARR)**;
* TLS-сертификат и DNS-имя сайта.

Docker Desktop подходит для рабочей станции разработчика, но не следует
считать его автоматически поддерживаемым вариантом для любой редакции Windows
Server. Среду запуска Linux-контейнеров согласуйте с администратором сервера.

#### Шаг 1. Подготовка файлов проекта

Поместите репозиторий, например, в `C:\LibraryApp`. Не переносите в новый релиз
локальные `node_modules`, `dist`, отчеты тестов и содержимое чужого
`backend/storage`. Для нового сервера создайте:

```powershell
New-Item -ItemType Directory -Force `
  .\backend\storage\pdfs, `
  .\backend\storage\covers, `
  .\backend\storage\import
```

Для закрытого контура образы можно заранее собрать и перенести через
`docker save`/`docker load`. Данные PostgreSQL и папка `backend/storage` должны
резервироваться отдельно от образов.

#### Шаг 2. Создание `.env`

Скопируйте шаблон и отредактируйте копию:

```powershell
Copy-Item .env.example .env
notepad .env
```

Минимальная серверная конфигурация выглядит так. Три пустых обязательных
значения нужно заполнить до первого запуска:

```env
POSTGRES_USER=library
POSTGRES_PASSWORD=
POSTGRES_DB=library
DATABASE_URL=

LISTEN_HOST=0.0.0.0
JWT_SECRET=
CORS_ORIGINS=https://library.example.org
TRUSTED_PROXIES=127.0.0.1,::1,172.16.0.0/12
MAX_UPLOAD_SIZE_MB=50
MULTIPART_MEMORY_MB=8

POSTGRES_HOST_PORT=5433
BACKEND_HOST_PORT=8080
FRONTEND_HOST_PORT=5173
BACKEND_PROXY_TARGET=http://backend:8080

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_NAME=Администратор
SEED_ADMIN_PASSWORD=admin12345
```

`JWT_SECRET` не должен совпадать с паролем БД или администратора. Для генерации
секрета в PowerShell можно выполнить:

```powershell
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Скопируйте выведенную строку после `JWT_SECRET=` в `.env`. Пустой секрет
намеренно блокирует запуск Compose.

Задайте независимый сложный пароль в `POSTGRES_PASSWORD`, а в `DATABASE_URL`
используйте формат
`postgres://library:<URL-кодированный-пароль>@db:5432/library?sslmode=disable`.
Если пароль содержит `@`, `:`, `/`, `?`, `#` или `%`, его часть в URL необходимо
URL-кодировать. Пустой пароль или URL также блокирует запуск Compose.
`CORS_ORIGINS` должен содержать точный публичный HTTPS-origin без пути и
завершающего `/`.

`TRUSTED_PROXIES` — это не список адресов клиентов, а только адреса/CIDR
непосредственных доверенных reverse proxy. Значение выше допускает loopback и
стандартный приватный диапазон Docker. После закрепления подсети Docker его
желательно сузить до фактической подсети проекта. Не добавляйте публичные сети.

`BACKEND_PROXY_TARGET` должен быть только внутренним HTTP(S)-origin backend без
пути, query и учетных данных. В production Vite остается лишь в стадии сборки:
frontend-контейнер запускает непривилегированный Node-процесс без runtime
npm-зависимостей, отдает собранный SPA и потоково пересылает `/api` в backend.

#### Шаг 3. Проверка и запуск контейнеров

```powershell
Set-Location C:\LibraryApp
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose ps
```

Локально на самом сервере frontend будет доступен по
`http://127.0.0.1:5173`, backend — по `http://127.0.0.1:8080`, PostgreSQL — по
`127.0.0.1:5433`. Эти порты намеренно не слушают внешний сетевой интерфейс.

#### Шаг 4. Первый вход до публикации

Пока IIS-сайт и внешний firewall еще не открыты, на самом сервере перейдите по
`http://127.0.0.1:5173`. При отсутствии активного супер-администратора backend
создает bootstrap-аккаунт из `SEED_ADMIN_*`. Для приведенного примера это логин
`admin` и пароль `admin12345`.

Войдите этим аккаунтом и сразу измените **и логин, и пароль** на свои. Только
после успешной проверки новых учетных данных переходите к публикации через IIS.
После появления активного супер-администратора bootstrap-аккаунт повторно не
создается, в том числе после смены его логина. Такая последовательность не
оставляет окно, в котором известные начальные данные доступны из внешней сети.
Backend также создает служебный файл
`backend/storage/.superadmin-bootstrap-complete`. Не удаляйте его и включайте в
резервную копию storage: при случайном пересоздании только тома БД этот маркер
запрещает повторное появление известных bootstrap-данных и заставляет backend
завершиться с явной ошибкой.

#### Шаг 5. Публикация через IIS

1. В ARR включите **Enable Proxy**.
2. Создайте IIS-сайт с HTTPS binding для настоящего домена и сертификата.
3. Создайте URL Rewrite reverse-proxy правило для всех путей на
   `http://127.0.0.1:5173/{R:0}` с сохранением query string. Frontend сам
   перенаправит `/api` на `http://backend:8080` внутри сети Docker.
4. Передавайте корректные `X-Forwarded-Proto: https` и
   `X-Forwarded-Host`. Не позволяйте внешнему клиенту подменять доверенные
   forwarded-заголовки; IIS должен формировать их сам.
5. В IIS Request Filtering установите `maxAllowedContentLength` немного выше
   `MAX_UPLOAD_SIZE_MB` с учетом multipart-накладных расходов. При лимите 50 МБ
   практическое значение — не менее `60 * 1024 * 1024` байт. Таймаут ARR также
   должен позволять backend завершить проверку и обработку PDF.
6. Во внешнем firewall откройте только HTTPS (и, при необходимости, HTTP для
   перенаправления на HTTPS). Не открывайте 5433, 8080 и 5173.

После настройки проверьте через публичный домен главную страницу, вход,
загрузку тестового PDF, чтение файла и публичный запрос
`/api/catalog/document-types`.

---

### ЧАСТЬ 3: Обслуживание проекта и решение проблем

Во всех командах ниже предполагается, что PowerShell открыт в каталоге проекта.
Перед обновлением или восстановлением сделайте резервную копию и убедитесь, что
она скопирована на другой диск или сервер.

#### Сценарий 1: Применение изменений `.env`

Проверьте конфигурацию и пересоздайте контейнеры приложений:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate backend frontend
docker compose ps
```

Простая замена `POSTGRES_PASSWORD` в `.env` **не меняет пароль уже созданного
пользователя внутри существующего тома PostgreSQL**. Такой пароль сначала меняет
администратор БД командой `ALTER ROLE`, а затем синхронно обновляет
`POSTGRES_PASSWORD` и URL-кодированное значение в `DATABASE_URL`.

#### Сценарий 2: Обновление версии

Не заменяйте и не удаляйте `backend/storage` и Docker volume PostgreSQL. После
получения новой версии сначала прочитайте миграционные инструкции, затем:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose ps
docker compose logs --tail 100 backend frontend
```

Для offline-деплоя сначала выполните `docker load -i <имя-образа>.tar`, после
чего убедитесь, что теги загруженных образов совпадают с полями `image` в
`docker-compose.yml`, и выполните ту же команду `up -d`. Флаг `--no-deps` не
следует использовать автоматически: новая версия backend может требовать
применения миграций и проверки готовности БД.

#### Сценарий 3: Автоматическая резервная копия БД и файлов

Кнопка **«Скачать базу данных»** в админке сохраняет только PostgreSQL. Для
восстановления библиотеки нужен согласованный комплект из дампа БД и
`backend/storage`.

На Windows Server запускайте скрипт из PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\backup.ps1 `
  -BackupDirectory D:\LibraryBackups `
  -RetentionDays 14
```

Скрипт создает и проверяет два файла:

* `database_<UTC-время>.dump` — custom-format дамп PostgreSQL;
* `storage_<UTC-время>.tar.gz` — PDF, обложки и файлы импорта.

Финальные имена публикуются только после проверки обоих файлов. Ротация удаляет
только полные пары, у которых обе части старше заданного количества дней. Общий
project-level maintenance-lock исключает наложение backup и restore. Настройте
Windows Task Scheduler от учетной записи, имеющей доступ к Docker и каталогу
резервных копий, а также право записи файла `.library-maintenance.lock` в корне
проекта, и включите сохранение кода возврата/журнала задачи.

Для Linux предназначен `scripts/backup.sh`. Период хранения задается переменной
`BACKUP_RETENTION_DAYS`, внешний каталог — `LIBRARY_BACKUP_DIR`:

```bash
BACKUP_RETENTION_DAYS=14 LIBRARY_BACKUP_DIR=/mnt/backup/library ./scripts/backup.sh
```

Оба скрипта запоминают состояние backend, корректно останавливают его на время
создания дампа и архива, а затем запускают снова, только если он работал до
копирования, дожидаются его healthcheck и возвращают исходное состояние. Поэтому
на время snapshot API кратковременно недоступен; назначайте задание на окно
низкой нагрузки. Frontend и IIS останавливать для штатной копии не требуется:
без backend пользовательские записи невозможны. Регулярно
выполняйте тестовое восстановление на отдельном контуре; наличие файла еще не
доказывает, что весь процесс восстановления работает.

#### Сценарий 4: Полное восстановление, часть 1 — PostgreSQL

Полное восстановление выполняйте только согласованной парой `database_*` и
`storage_*` с одной UTC-меткой. Сценарии 4 и 5 ниже являются двумя частями
**одной процедуры**: выполняйте их подряд в одном окне PowerShell и не открывайте
сайт между ними. Команды сначала проверяют целевую пару, затем закрывают IIS и
останавливают backend/frontend. Уже после остановки записей штатный
`scripts/backup.ps1` создает согласованную пару в `backups\pre-restore` — это
точка отката.

Следующие команды полностью читают оглавление storage-архива до остановки,
закрывают IIS-сайт, создают точку отката без параллельных пользовательских
записей и только после этого перезаписывают текущую БД. Сервис `db` остается
запущенным. Замените имя IIS-сайта и метку на фактические значения:

```powershell
$ErrorActionPreference = 'Stop'
function Assert-NativeCommand([string]$Action) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Action завершилась с кодом $LASTEXITCODE"
    }
}
function Enter-MaintenanceLock([string]$Path) {
    try {
        $stream = [IO.File]::Open(
            $Path,
            [IO.FileMode]::OpenOrCreate,
            [IO.FileAccess]::ReadWrite,
            [IO.FileShare]::None
        )
    }
    catch [IO.IOException] {
        throw 'Уже выполняется backup или другая операция восстановления.'
    }
    try {
        $stream.SetLength(0)
        $metadata = [Text.Encoding]::UTF8.GetBytes(
            "protocol=kernel-lock-v1`noperation=restore`npid=$PID`n"
        )
        $stream.Write($metadata, 0, $metadata.Length)
        $stream.Flush($true)
        return $stream
    }
    catch {
        $stream.Dispose()
        throw
    }
}
function Exit-MaintenanceLock($Stream) {
    if ($null -eq $Stream) { return }
    try {
        if ($Stream.CanWrite) {
            $Stream.SetLength(0)
            $Stream.Flush($true)
        }
    }
    catch {
        Write-Warning "Не удалось очистить metadata maintenance-lock: $($_.Exception.Message)"
    }
    finally {
        $Stream.Dispose()
    }
}

$iisSiteName = 'Library'
$restoreStamp = '2026-01-01_00-00-00Z'
$dumpPath = ".\backups\database_$restoreStamp.dump"
$storageArchive = ".\backups\storage_$restoreStamp.tar.gz"
$maintenanceLockPath = [IO.Path]::GetFullPath('.\.library-maintenance.lock')
$maintenanceLockStream = Enter-MaintenanceLock $maintenanceLockPath
try {
foreach ($requiredFile in @($dumpPath, $storageArchive)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Файл согласованной резервной копии не найден: $requiredFile"
    }
}

# До остановки и любых изменений полностью проверяем tar-поток и все пути.
$entries = @(tar.exe -tzf $storageArchive)
Assert-NativeCommand 'Проверка архива storage'
if ($entries.Count -eq 0) {
    throw 'Архив storage пуст.'
}
$unsafeEntries = @($entries | Where-Object {
    $_ -notmatch '^storage(?:[\\/]|$)' -or
    $_ -match '(^|[\\/])\.\.([\\/]|$)' -or
    $_ -match '^[\\/]' -or
    $_ -match '^[A-Za-z]:'
})
if ($unsafeEntries.Count -ne 0) {
    throw 'Архив содержит путь вне каталога storage.'
}

$restoreId = [Guid]::NewGuid().ToString('N')
$remoteDump = "/tmp/library-restore-$restoreId.dump"
$remoteSql = "/tmp/library-restore-$restoreId.sql"
$remoteScript = "/tmp/library-restore-$restoreId.sh"
$rollbackDirectory = [IO.Path]::GetFullPath('.\backups\pre-restore')
New-Item -ItemType Directory -Path $rollbackDirectory -Force | Out-Null
$knownRollbackDumps = @{}
Get-ChildItem -LiteralPath $rollbackDirectory -File -Filter 'database_*.dump' |
    ForEach-Object { $knownRollbackDumps[$_.FullName] = $true }

Import-Module WebAdministration
Stop-Website -Name $iisSiteName
docker compose stop frontend backend
Assert-NativeCommand 'Остановка приложения'

# При остановленных writers создаем согласованную rollback-пару. Отдельный
# каталог не дает ротации удалить выбранную для восстановления старую копию.
# На время вызова отдаем общий lock backup-скрипту; backend уже остановлен,
# поэтому конкурирующий backup не сможет возобновить записи.
Exit-MaintenanceLock $maintenanceLockStream
$maintenanceLockStream = $null
powershell.exe -NoProfile -ExecutionPolicy Bypass `
    -File .\scripts\backup.ps1 `
    -BackupDirectory $rollbackDirectory `
    -RetentionDays 30
Assert-NativeCommand 'Создание точки отката'
$maintenanceLockStream = Enter-MaintenanceLock $maintenanceLockPath
$newRollbackDumps = @(Get-ChildItem -LiteralPath $rollbackDirectory -File -Filter 'database_*.dump' |
    Where-Object { -not $knownRollbackDumps.ContainsKey($_.FullName) })
if ($newRollbackDumps.Count -ne 1) {
    throw 'Не удалось однозначно определить дамп точки отката; IIS остается закрытым.'
}
$rollbackDump = $newRollbackDumps[0]
$rollbackStamp = $rollbackDump.BaseName.Substring('database_'.Length)
$rollbackStorage = Join-Path $rollbackDirectory "storage_$rollbackStamp.tar.gz"
if (-not (Test-Path -LiteralPath $rollbackStorage -PathType Leaf)) {
    throw 'Для дампа точки отката не найден парный storage-архив; IIS остается закрытым.'
}
Write-Host "Точка отката: $rollbackStamp ($rollbackDirectory)"

try {
    docker compose cp $dumpPath "db:$remoteDump"
    Assert-NativeCommand 'Копирование дампа'

    # Windows PowerShell 5.1 добавляет CRLF в native pipeline. Передаем
    # нормализованный LF-only скрипт как base64, чтобы Linux sh получил точные
    # байты; затем формируем SQL и выполняем его одной транзакцией.
    $restoreScript = @'
pg_restore --list "$1" >/dev/null
{
    printf "%s\n" "DROP SCHEMA IF EXISTS public CASCADE;" "CREATE SCHEMA public AUTHORIZATION CURRENT_USER;"
    pg_restore --clean --if-exists --no-owner --no-privileges "$1"
} > "$2"
psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --single-transaction --set=ON_ERROR_STOP=1 --file="$2"
'@
    $restorePayload = [Convert]::ToBase64String(
        [Text.Encoding]::UTF8.GetBytes(($restoreScript -replace "`r`n?", "`n"))
    )
    docker compose exec -T db sh -cu `
        'umask 077; printf %s $1 | base64 -d >$2 && sh -seu -- $3 $4 <$2' `
        sh $restorePayload $remoteScript $remoteDump $remoteSql
    Assert-NativeCommand 'Восстановление БД'
}
finally {
    docker compose exec -T db rm -f -- $remoteDump $remoteSql $remoteScript
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Не удалось удалить временные файлы внутри db-контейнера.'
    }
}
}
catch {
    if ($null -ne $maintenanceLockStream) {
        Exit-MaintenanceLock $maintenanceLockStream
        $maintenanceLockStream = $null
    }
    throw
}
```

Команды обращаются к Compose-сервису `db`, поэтому не зависят от
сгенерированного имени контейнера или имени базы. При ошибке `psql` откатывает
единую транзакцию, приложение и IIS остаются остановленными, а исходная БД — без
частично примененного восстановления. Удаление схемы `public` внутри той же
транзакции исключает смешивание старой копии с объектами более новых миграций.
После успеха **не запускайте приложение**, а сразу выполните сценарий 5 в том же
окне PowerShell.

#### Сценарий 5: Полное восстановление, часть 2 — `backend/storage`

Используйте только доверенный архив, созданный штатным backup-скриптом. Команды
повторно проверяют его (защита от замены между частями процедуры) и распаковывают
в отдельный временный каталог. Приложение и IIS остаются остановленными после
части 1, а прежняя папка переименовывается, но не удаляется:

```powershell
$ErrorActionPreference = 'Stop'
function Assert-NativeCommand([string]$Action) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Action завершилась с кодом $LASTEXITCODE"
    }
}

if (($null -eq $maintenanceLockStream) -or (-not $maintenanceLockStream.CanWrite)) {
    throw 'Maintenance-lock из части 1 не удерживается; начните восстановление заново.'
}
$staging = $null
try {
$entries = @(tar.exe -tzf $storageArchive)
Assert-NativeCommand 'Проверка архива storage'
if ($entries.Count -eq 0) {
    throw 'Архив storage пуст.'
}
$unsafeEntries = @($entries | Where-Object {
    $_ -notmatch '^storage(?:[\\/]|$)' -or
    $_ -match '(^|[\\/])\.\.([\\/]|$)' -or
    $_ -match '^[\\/]' -or
    $_ -match '^[A-Za-z]:'
})
if ($unsafeEntries.Count -ne 0) {
    throw 'Архив содержит путь вне каталога storage.'
}

$stamp = Get-Date -Format yyyyMMdd-HHmmss
$staging = Join-Path .\backend "storage.restore-$([Guid]::NewGuid().ToString('N'))"
$previous = Join-Path .\backend "storage.before-restore-$stamp"
New-Item -ItemType Directory -Path $staging | Out-Null
try {
    tar.exe -xzf $storageArchive -C $staging
    Assert-NativeCommand 'Распаковка storage'
    $stagedStorage = Join-Path $staging 'storage'
    if (-not (Test-Path -LiteralPath $stagedStorage -PathType Container)) {
        throw 'В архиве отсутствует корневой каталог storage.'
    }

    $storageItems = @((Get-Item -LiteralPath $stagedStorage -Force)) +
        @(Get-ChildItem -LiteralPath $stagedStorage -Recurse -Force)
    $reparsePoints = @($storageItems |
        Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 })
    if ($reparsePoints.Count -ne 0) {
        throw 'Распакованный storage содержит ссылки или reparse points.'
    }

    Rename-Item -LiteralPath .\backend\storage -NewName (Split-Path $previous -Leaf)
    try {
        Move-Item -LiteralPath $stagedStorage -Destination .\backend\storage
    }
    catch {
        if ((-not (Test-Path -LiteralPath .\backend\storage)) -and
            (Test-Path -LiteralPath $previous)) {
            Move-Item -LiteralPath $previous -Destination .\backend\storage
        }
        throw
    }

    docker compose start --wait --wait-timeout 120 backend frontend
    Assert-NativeCommand 'Запуск и проверка готовности приложения'

    Start-Website -Name $iisSiteName
}
finally {
    if (Test-Path -LiteralPath $staging) {
        Remove-Item -LiteralPath $staging -Recurse -Force
    }
}
}
finally {
    Exit-MaintenanceLock $maintenanceLockStream
    $maintenanceLockStream = $null
}
```

После проверки чтения нескольких документов старую переименованную папку можно
перенести в архив. Не удаляйте ее до подтверждения целостности восстановленных
файлов и соответствия восстановленной БД. Если любая часть процедуры завершилась
ошибкой, не открывайте IIS: повторите обе части с меткой пары, созданной перед
восстановлением, и только затем выполните проверку готовности.

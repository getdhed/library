# Library Catalog MVP

Стек:
- `backend`: Go + Gin + PostgreSQL
- `frontend`: React + Vite
- PDF-файлы хранятся на диске в `backend/storage`

## Быстрый старт

Создайте локальный файл настроек и заполните пустые `POSTGRES_PASSWORD`,
`DATABASE_URL` и `JWT_SECRET`:

```powershell
Copy-Item .env.example .env
docker compose config --quiet
docker compose up --build
```

После запуска:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8080`
- admin login: `admin`
- admin password: `admin12345`

Логин и пароль выше — только данные первичной инициализации. На сервере войдите
через loopback-адрес и измените их **до** включения публичного IIS binding и
открытия HTTPS в firewall. Начальный аккаунт создается только пока в системе нет
ни одного активного супер-администратора. После первой инициализации backend
сохраняет в `backend/storage` служебный маркер; если затем пропадет только том
БД, известные начальные учетные данные автоматически не появятся снова.

Порты PostgreSQL, backend и frontend публикуются только на `127.0.0.1`.
В рабочей конфигурации на Windows Server публичный HTTPS завершает IIS и
проксирует запросы на `http://127.0.0.1:5173`; frontend пересылает `/api`
в backend по внутренней сети Docker. `docker-compose.prod.yml` является только
overlay для этого сценария и не запускает nginx. Подробности — в
[USER_MANUAL.md](USER_MANUAL.md#часть-2-пошаговое-руководство-по-деплою-на-windows-server-с-iis).

Production-образ frontend собирается в два этапа. Vite используется только для
сборки, а итоговый контейнер без npm-зависимостей запускает непривилегированный
Node-процесс: он отдает готовый SPA и потоково проксирует `/api` на
`BACKEND_PROXY_TARGET`. Поэтому загрузки и скачивания не буферизуются во frontend.

## Импорт PDF из папки

Положите `.pdf` файлы в `backend/storage/import`, затем в админке откройте блок "Импорт из папки".

Для демо-набора можно сгенерировать 20 тестовых файлов командой:

```bash
cd backend
go run ./cmd/generate-demo-pdfs
```

После этого импортируйте их через админку из `backend/storage/import`.

## Возможности

- регистрация и логин
- поиск по названию с `pg_trgm`
- каталог по факультетам и кафедрам
- избранное и недавние документы
- карточка документа с чтением и скачиванием
- админка для CRUD и импорта
- базовая статистика

## E2E Tests (Playwright)

```bash
cd frontend
npm run e2e:install
```

Start the stack in another terminal:

```bash
cp .env.example .env # fill POSTGRES_PASSWORD, DATABASE_URL and JWT_SECRET
docker compose up --build
```

Run all e2e scenarios:

```bash
cd frontend
npm run e2e
```

Useful commands:

- headed run: `npm run e2e:headed`
- UI mode: `npm run e2e:ui`

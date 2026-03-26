# Library Catalog MVP

Стек:
- `backend`: Go + Gin + PostgreSQL
- `frontend`: React + Vite
- PDF-файлы хранятся на диске в `backend/storage`

## Быстрый старт

```bash
docker compose up --build
```

После запуска:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8080`
- admin login: `admin@library.local`
- admin password: `admin12345`

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

# AGENTS.md — Library Monorepo

## Назначение и границы
- Этот файл задает рабочий контракт для AI-агентов (Codex/Cursor/Claude) в репозитории `library`.
- Цель агента: вносить минимальные, целевые и проверяемые изменения без побочных правок.
- Перед началом работы агент проверяет `git status` и не трогает чужие незакоммиченные изменения.
- Агент не делает "широких" рефакторингов, если это не запрошено явно.
- Агент не меняет инфраструктуру/конфиги вне задачи, даже если видит потенциальные улучшения.

## Карта репозитория
- `backend`: Go 1.24, Gin, PostgreSQL, основное API.
- `frontend`: React 19 + Vite + TypeScript, UI-клиент.
- `backend/migrations`: SQL-миграции (goose, embed через `backend/migrations/migrations.go`).
- `backend/storage`: файловое хранилище (PDF, cover, import).
- `frontend/e2e`: Playwright end-to-end тесты.

Ключевые backend-слои:
- `backend/internal/domain`: доменные модели и контракты.
- `backend/internal/repository`: SQL и доступ к данным.
- `backend/internal/service`: бизнес-логика.
- `backend/internal/httpapi`: HTTP-роуты и хендлеры.
- Точка входа: `backend/cmd/server/main.go`.

## Быстрый запуск
Из корня репозитория:

```bash
docker compose up --build
```

После запуска:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8080`
- admin username: `admin`
- admin password: `admin12345`

Локальные контуры без Docker:

```bash
cd backend
go run ./cmd/server
```

```bash
cd frontend
npm run dev
```

## Тесты и проверка
Backend:

```bash
cd backend
go test ./...
```

Frontend unit/integration:

```bash
cd frontend
npm run test
```

E2E (Playwright):

```bash
cd frontend
npm run e2e:install
npm run e2e
```

Важно по backend-тестам:
- Часть тестов интеграционные (`internal/repository`, `internal/database`), используют Postgres.
- По умолчанию ожидается `postgres://library:library@localhost:5432/postgres?sslmode=disable`, либо `TEST_DATABASE_URL`.
- Если Postgres недоступен, такие тесты могут корректно уходить в `skip`.

## Правила изменений backend
Рекомендуемый порядок изменений при фиче:
1. Обновить доменную модель в `internal/domain`.
2. Внести изменения в `internal/repository` (SQL, сканирование, фильтры).
3. Обновить `internal/service` (валидация и бизнес-логика).
4. Обновить `internal/httpapi` (роуты/хендлеры/парсинг входа).
5. Добавить или обновить тесты.

Правила миграций:
- Если меняется схема БД, добавить новый файл `backend/migrations/000XX_*.sql`.
- Не переписывать старые примененные миграции без явной необходимости.
- Миграции автоматически подхватываются через `//go:embed *.sql` в `backend/migrations/migrations.go`.

## Правила изменений frontend
Рекомендуемый порядок изменений при изменении API/данных:
1. Обновить типы в `frontend/src/types.ts`.
2. Обновить API-слой в `frontend/src/api/library.ts` (и при необходимости `client.ts`).
3. Обновить страницы/компоненты.
4. Обновить тесты (`*.test.tsx`, при необходимости `frontend/e2e`).

Правила доступа к API:
- Использовать общий helper `request` из `src/api/client.ts`.
- Для защищенных запросов передавать `token` (заголовок `Authorization: Bearer ...` формируется в helper).
- Для URL файлов/обложек использовать функции `documentFileUrl`, `documentCoverUrl`, `submissionFileUrl` из `src/api/library.ts`; JWT передавать только в `Authorization`, а защищенные файлы загружать через `fetch` и временный `blob:` URL.

## PDF/файловый контур
- Основные файлы документов хранятся в `backend/storage/pdfs`.
- Импорт из папки: `backend/storage/import` (модерация через админку / `/api/admin/submissions/import-folder`).
- Обложки генерируются в `backend/storage/covers`.
- Генерация обложек реализована через `backend/scripts/render_pdf_cover.py`, вызывается из `backend/internal/preview/renderer.go`.
- Для генерации нужны Python-пакеты `pypdfium2` и `Pillow` (в Docker-образе backend устанавливаются автоматически).

Ограничения по артефактам:
- Не коммитить локально сгенерированные PDF/cover/import-артефакты без отдельной задачи.
- Не удалять и не переименовывать существующие storage-файлы "по пути", если это не часть явного запроса.

## Do/Don't для агентов
Do:
- Делать минимальные и изолированные изменения.
- Соблюдать слоистую архитектуру backend.
- Синхронизировать `frontend/src/types.ts` и API-слой при изменении backend-контрактов.
- Прогонять релевантные тесты перед сдачей.

Don't:
- Не использовать destructive git-команды (`git reset --hard`, `git checkout --`, массовые revert).
- Не редактировать `frontend/node_modules`, `frontend/dist`, `frontend/playwright-report`, `frontend/test-results`, `backend/.cache`.
- Не менять не относящиеся к задаче файлы "заодно".
- Не откатывать чужие незакоммиченные изменения.

## Definition of Done
- Изменения ограничены задачей и затрагивают только нужные файлы.
- Команды в документации и отчете соответствуют реальному проекту.
- Прогнаны релевантные проверки (минимум: `backend go test ./...`, `frontend npm run test` при изменениях логики).
- В diff нет лишних артефактов и случайных файлов.
- В финальном отчете агента указаны:
  - что изменено;
  - какие тесты запускались;
  - какие ограничения/допущения были приняты.

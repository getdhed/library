# ОТЧЕТ ПО ПРОИЗВОДСТВЕННОЙ ПРАКТИКЕ

**Тема:** Разработка и развертывание веб-приложения «Электронная Библиотека»

---

## ОГЛАВЛЕНИЕ
1. Введение
2. Глава 1. Анализ предметной области и выбор стека технологий
   1.1 Анализ предметной области
   1.2 Обоснование выбора технологий (Go, React, PostgreSQL)
   1.3 Архитектура системы
3. Глава 2. Проектирование и разработка системы
   2.1 Проектирование базы данных
   2.2 Разработка серверной части (Backend)
   2.3 Разработка клиентской части (Frontend)
4. Глава 3. Развертывание и руководство по эксплуатации
   3.1 Контейнеризация приложения (Docker)
   3.2 Инструкция по развертыванию
   3.3 Руководство пользователя и администратора
5. Заключение
6. Список литературы
7. Приложение А. Листинги кода серверной части
8. Приложение Б. Листинги кода клиентской части
9. Приложение В. Конфигурация развертывания

---

## ВВЕДЕНИЕ

**Актуальность темы.** В современном мире процесс информатизации охватывает все сферы деятельности человека, в том числе образовательную и научную. Электронные библиотеки становятся неотъемлемой частью инфраструктуры учебных заведений и предприятий. Они обеспечивают быстрый, надежный и удобный доступ к необходимым материалам. В связи с этим, разработка собственной масштабируемой системы хранения и каталогизации электронных документов является актуальной задачей.

**Цель практики:** спроектировать, разработать и развернуть веб-ориентированную информационную систему «Электронная Библиотека», обеспечивающую хранение, поиск и чтение PDF-документов.

**Задачи практики:**
1. Провести анализ предметной области и выбрать оптимальный стек технологий.
2. Спроектировать архитектуру приложения и структуру базы данных.
3. Разработать серверную часть (REST API) для обработки бизнес-логики.
4. Разработать клиентскую часть (SPA) для взаимодействия с пользователем.
5. Настроить контейнеризацию проекта с использованием Docker.
6. Разработать документацию и руководство пользователя.

---

## ГЛАВА 1. АНАЛИЗ ПРЕДМЕТНОЙ ОБЛАСТИ И ВЫБОР СТЕКА ТЕХНОЛОГИЙ

### 1.1 Анализ предметной области
Система «Электронная Библиотека» предназначена для учета, хранения и предоставления доступа к электронным версиям книг, статей, учебников и методических пособий. Основные пользователи системы делятся на две категории: читатели (обычные пользователи) и библиотекари (администраторы).
Читателям необходим удобный поиск по авторам, названиям и тегам, возможность чтения документов прямо в браузере, а также ведение личного кабинета с избранными материалами. Администраторам требуется функционал для загрузки новых материалов (в том числе массового импорта), модерации пользовательских заявок и отслеживания статистики.

### 1.2 Обоснование выбора технологий
Для реализации проекта был выбран современный стек технологий, обеспечивающий высокую производительность, масштабируемость и простоту поддержки:

1. **Backend (Серверная часть): Язык программирования Go (Golang).**
   Go отличается высокой скоростью выполнения, строгой типизацией и отличной встроенной поддержкой многопоточности (горутины). Для создания REST API был выбран легковесный фреймворк **Gin**, который обеспечивает быструю маршрутизацию и удобную работу с HTTP-запросами.

2. **Frontend (Клиентская часть): Библиотека React и сборщик Vite.**
   React позволяет создавать интерактивные пользовательские интерфейсы на основе компонентов. Использование языка TypeScript повышает надежность кода за счет статической типизации. Сборщик Vite был выбран благодаря своей невероятной скорости горячей перезагрузки (HMR) и быстрой сборке production-версии.

3. **База данных: PostgreSQL.**
   PostgreSQL — это мощная объектно-реляционная система управления базами данных с открытым исходным кодом. Она отлично подходит для хранения сложных структур данных и обеспечивает высокую надежность. В проекте активно используется расширение `pg_trgm` для реализации быстрого нечеткого поиска по тексту (названиям книг и авторам).

4. **Инфраструктура и развертывание: Docker и Docker Compose.**
   Для изоляции приложения от операционной системы сервера используется технология контейнеризации Docker. Docker Compose позволяет описать всю инфраструктуру (backend, frontend, database) в одном конфигурационном файле и развернуть её одной командой.

### 1.3 Архитектура системы
Приложение построено по классической клиент-серверной архитектуре. 
- **Клиент (Браузер)** отправляет HTTP-запросы к серверу.
- **Сервер (Go API)** обрабатывает запросы, проверяет права доступа (JWT-токены), выполняет бизнес-логику и обращается к базе данных.
- **База данных (PostgreSQL)** хранит метаданные книг и информацию о пользователях.
- **Файловое хранилище (File Storage)**: сами PDF-документы и их обложки хранятся на жестком диске сервера в специальной директории, а в базе данных хранятся только пути к ним. Это позволяет не перегружать СУБД бинарными данными.

---

## ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА СИСТЕМЫ

### 2.1 Проектирование базы данных
В ходе проектирования были выделены следующие основные сущности:
- `users`: хранит информацию о пользователях (id, ФИО, логин, хэш пароля, роль).
- `documents`: хранит карточки книг (название, авторы, год, описание, путь к PDF-файлу, путь к обложке).
- `submissions`: заявки пользователей на добавление новых книг.
- `favorites`: связь многие-ко-многим между пользователями и документами для реализации функционала закладок.

Для работы с базой данных на сервере используется подход с чистыми SQL-запросами и репозиторным слоем, что позволяет полностью контролировать генерируемые запросы и оптимизировать их работу.

### 2.2 Разработка серверной части (Backend)
Серверная часть разработана с использованием слоистой архитектуры (Clean Architecture):
- **Слой маршрутизации и хендлеров (`internal/httpapi`)**: принимает запросы, парсит JSON, вызывает сервисы.
- **Слой бизнес-логики (`internal/service`)**: содержит основные алгоритмы работы, валидацию прав доступа, проверку бизнес-правил.
- **Слой доступа к данным (`internal/repository`)**: выполняет SQL-запросы к PostgreSQL.
- **Слой доменных моделей (`internal/domain`)**: содержит структуры данных (structs).

Для генерации обложек PDF-документов был реализован вызов внешнего Python-скрипта (`backend/scripts/render_pdf_cover.py`), который с помощью библиотек pypdfium2 и Pillow извлекает первую страницу PDF и сохраняет её в формате JPEG.

Аутентификация реализована с использованием JWT (JSON Web Tokens). После успешного логина сервер выдает клиенту токен, который клиент обязан прикреплять в заголовок `Authorization: Bearer <token>` при каждом последующем запросе.

### 2.3 Разработка клиентской части (Frontend)
Клиентская часть представляет собой Single Page Application (SPA). Навигация между страницами реализована с помощью React Router. 

Основные разработанные компоненты и страницы:
- `CatalogPage`: страница просмотра библиотеки с фильтрами по авторам и факультетам, а также с пагинацией.
- `DocumentPage`: карточка конкретного документа. Содержит метаданные и встроенный PDF-ридер (реализованный через `<object>` или `<iframe>`, обращающийся к защищенному роуту бэкенда).
- `AdminDocumentsPage`: панель администратора для добавления, изменения и мягкого удаления (soft delete) документов.
- `SubmitPage`: форма отправки заявки на добавление документа пользователем.

Для взаимодействия с API был разработан модуль `api/client.ts`, который автоматически подставляет JWT токен в запросы и обрабатывает ошибки (например, автоматический редирект на страницу логина при истечении токена).

---

## ГЛАВА 3. РАЗВЕРТЫВАНИЕ И РУКОВОДСТВО ПО ЭКСПЛУАТАЦИИ

### 3.1 Контейнеризация приложения (Docker)
Для обеспечения переносимости проекта были написаны файлы `Dockerfile` для каждого компонента:
1. **Backend Dockerfile**: использует многоэтапную сборку (multi-stage build). На первом этапе Go компилирует исходный код в бинарный файл, на втором этапе этот бинарный файл помещается в легковесный образ на базе Alpine Linux (с установленным Python для генерации обложек).
2. **Frontend Dockerfile**: на этапе сборки запускается `npm run build`, после чего статичные файлы (HTML, CSS, JS) копируются в образ с Nginx, который и раздает их браузерам.

### 3.2 Инструкция по развертыванию
Проект разворачивается с помощью `docker-compose.yml`. В конфигурации описаны три сервиса: `db` (PostgreSQL), `backend` и `frontend`.
Для запуска системы на новом сервере необходимо:
1. Установить Docker и Docker Compose.
2. Создать файл `.env` с секретами (пароль к БД, JWT_SECRET, настройки портов).
3. Создать директории для хранения файлов: `backend/storage/pdfs`, `backend/storage/covers`, `backend/storage/import`.
4. Выполнить команду `docker compose up --build -d`.

### 3.3 Руководство пользователя и администратора
- **Обычный пользователь**: после регистрации может просматривать каталог, искать материалы, открывать их для чтения и добавлять в избранное.
- **Библиотекарь**: получает доступ к админ-панели (`/admin`), где может модерировать заявки пользователей, вручную добавлять новые PDF-файлы (или импортировать их из папки), а также отслеживать статистику просмотров.
- **Супер-администратор**: может необратимо удалять данные (Hard Delete) и создавать резервные копии базы данных.

---

## ЗАКЛЮЧЕНИЕ

В ходе прохождения производственной практики была спроектирована и успешно разработана веб-система «Электронная Библиотека». Были решены все поставленные задачи:
1. Проведен анализ требований и выбран оптимальный стек: Go, React, PostgreSQL.
2. Спроектирована реляционная база данных и файловое хранилище.
3. Написан серверный API с поддержкой JWT-авторизации, нечеткого поиска и генерации обложек.
4. Разработан современный, реактивный пользовательский интерфейс.
5. Проект контейнеризован с помощью Docker, что значительно упростило его развертывание.

Результатом практики является полностью функционирующая система, готовая к внедрению и эксплуатации в локальной сети или интернете. Получен практический опыт полного цикла разработки программного обеспечения.

---

## ПРИЛОЖЕНИЕ А. ЛИСТИНГИ КОДА СЕРВЕРНОЙ ЧАСТИ

### Файл `backend/cmd/server/main.go`
```go
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"

	"library-backend/internal/app"
	"library-backend/internal/config"
	"library-backend/internal/logging"
)

// @title Library API
// @version 1.0
// @description Backend API for the Library application.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@library.local

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @host localhost:8080
// @BasePath /api

func pauseAndExit() {
	fmt.Println("\nНажмите Enter для выхода...")
	fmt.Scanln()
	os.Exit(1)
}

func main() {
	_ = godotenv.Load()
	
	cfg := config.Load()
	logger := logging.New(cfg)
	logger.Info("starting library-backend", "port", cfg.Port, "log_level", cfg.LogLevel, "log_format", cfg.LogFormat)

	application, err := app.New(context.Background(), cfg, logger)
	if err != nil {
		logger.Error("failed to start application", "error", err)
		pauseAndExit()
	}
	defer application.Close()

	if err := application.Run(); err != nil {
		logger.Error("server exited with error", "error", err)
		pauseAndExit()
	}
}

```

---

## ПРИЛОЖЕНИЕ Б. ЛИСТИНГИ КОДА КЛИЕНТСКОЙ ЧАСТИ

### Файл `frontend/src/types.ts`
```typescript
export interface User {
  id: number;
  username: string;
  fullName: string;
  role: "user" | "admin" | "superadmin";
  avatarUrl?: string;
  isActive: boolean;
  deactivationReason?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  lastLoginAt?: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  author: string;
  executor?: string;
  scientificAdvisor?: string;
  year: number;
  type: string;
  placeOfPublication?: string;
  publisher?: string;
  periodicalName?: string;
  volume?: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  coverPath?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isFavorite: boolean;
  similarity?: number;
  deletedAt?: string;
  isLocal?: boolean;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface SubmissionItem {
  id: number;
  userId: number;
  title: string;
  source: string;
  author?: string;
  executor?: string;
  scientificAdvisor?: string;
  placeOfPublication?: string;
  publisher?: string;
  periodicalName?: string;
  volume?: string;
  year?: number;
  type?: string;
  description?: string;
  tags?: string;
  comment?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  coverPath?: string;
  status: SubmissionStatus;
  moderationNote?: string;
  approvedDocumentId?: number;
  reviewedBy?: number;
  reviewerName?: string;
  reviewerUsername?: string;
  reviewerEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  uploaderName?: string;
  uploaderUsername?: string;
  isLocal?: boolean;
}


export interface SearchHistoryItem {
  id: number;
  query: string;
  createdAt: string;
}

export interface PagedDocuments {
  items: DocumentItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface HomePayload {
  recent: DocumentItem[];
  favorites: DocumentItem[];
  searchHistory: SearchHistoryItem[];
}

export interface PagedUsers {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface NamedStat {
  name: string;
  count: number;
}

export interface AdminStats {
  documentsCount: number;
  localDocumentsCount: number;
  externalDocumentsCount: number;
  visitsInPeriod: number;
  viewsToday: number;
  downloadsToday: number;
  searchesToday: number;
  uploadedInPeriod: number;
  uploadPeriodFrom: string;
  uploadPeriodTo: string;
  topQueries: NamedStat[];
  topDocuments: NamedStat[];
  documentsByType: NamedStat[];
  appLoadByHour: NamedStat[];
}

export interface DocumentAuditEvent {
  id: number;
  action: string;
  actorId?: number;
  actorName?: string;
  actorUsername?: string;
  documentId?: number;
  submissionId?: number;
  documentTitle: string;
  fileName: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PagedAuditEvents {
  items: DocumentAuditEvent[];
  page: number;
  pageSize: number;
  total: number;
}

```

---

## ПРИЛОЖЕНИЕ В. КОНФИГУРАЦИЯ РАЗВЕРТЫВАНИЯ

### Файл `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:17.2
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-library}
      POSTGRES_USER: ${POSTGRES_USER:-library}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-library}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U library -d library"]
      interval: 5s
      timeout: 5s
      retries: 20
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

  backend:
    image: library-backend:2026-06-23
    build:
      context: ./backend
      dockerfile: Dockerfile
    develop:
      watch:
        - action: rebuild
          path: ./backend
          ignore:
            - ./backend/storage/**
            - ./backend/.cache/**
            - ./backend/.git/**
    restart: always
    environment:
      APP_PORT: 8080
      DATABASE_URL: ${DATABASE_URL:-postgres://library:library@db:5432/library?sslmode=disable}
      JWT_SECRET: ${JWT_SECRET}
      STORAGE_PATH: /app/storage
      CORS_ORIGINS: ${CORS_ORIGINS:-*}
      SEED_ADMIN_USERNAME: ${SEED_ADMIN_USERNAME:-admin}
      SEED_ADMIN_NAME: ${SEED_ADMIN_NAME:-Администратор}
      SEED_ADMIN_PASSWORD: ${SEED_ADMIN_PASSWORD:-admin12345}
    ports:
      - "8080:8080"
    volumes:
      - ./backend/storage:/app/storage
    depends_on:
      db:
        condition: service_healthy
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

  frontend:
    image: library-frontend:2026-06-23
    build:
      context: ./frontend
      dockerfile: Dockerfile
    develop:
      watch:
        - action: rebuild
          path: ./frontend
          ignore:
            - ./frontend/node_modules/**
            - ./frontend/dist/**
            - ./frontend/.git/**
    restart: always
    environment:
      BACKEND_PROXY_TARGET: ${BACKEND_PROXY_TARGET:-http://backend:8080}
      VITE_API_URL: ${VITE_API_URL:-/api}
      VITE_BACKEND_URL: ${VITE_BACKEND_URL:-}
    ports:
      - "5173:5173"
    depends_on:
      backend:
        condition: service_started
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:

```

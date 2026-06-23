#!/bin/bash
# Скрипт автоматического резервного копирования для приложения "Библиотека"
# Рекомендуется запускать через cron раз в сутки:
# 0 3 * * * /path/to/library/scripts/backup.sh >> /var/log/library-backup.log 2>&1

set -e

# Настройки путей (предполагается, что скрипт запускается из папки scripts)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DB_CONTAINER="library-db"
DB_USER="library"
DB_NAME="library"

# Создаем папку для бэкапов, если её нет
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начинаем резервное копирование..."

# 1. Дамп базы данных
DB_BACKUP_PATH="${BACKUP_DIR}/db_${DATE}.sql.gz"
echo "[$(date)] Дамп базы данных в $DB_BACKUP_PATH"
# Используем pg_dump внутри контейнера базы данных
docker exec -t $DB_CONTAINER pg_dump -U $DB_USER -F p $DB_NAME | gzip > "$DB_BACKUP_PATH"

# 2. Архив папки storage (PDF-файлы и обложки)
STORAGE_BACKUP_PATH="${BACKUP_DIR}/storage_${DATE}.tar.gz"
echo "[$(date)] Архивация папки storage в $STORAGE_BACKUP_PATH"
# Архивируем только саму папку storage без абсолютных путей
tar -czf "$STORAGE_BACKUP_PATH" -C "$PROJECT_DIR" backend/storage

echo "[$(date)] Резервное копирование успешно завершено."

# 3. Ротация (Удаляем архивы старше 7 дней)
echo "[$(date)] Удаление старых бэкапов (старше 7 дней)..."
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -exec rm {} \;

echo "[$(date)] Готово."

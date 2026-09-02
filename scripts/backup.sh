#!/usr/bin/env bash
# Consistent PostgreSQL + storage backup for hosts that run Docker Compose.
# Example cron entry:
# 0 3 * * * /opt/library/scripts/backup.sh >> /var/log/library-backup.log 2>&1

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${LIBRARY_BACKUP_DIR:-${PROJECT_DIR}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date -u +"%Y-%m-%d_%H-%M-%SZ")"

DB_TMP=""
STORAGE_TMP=""
DB_FINAL="${BACKUP_DIR}/database_${STAMP}.dump"
STORAGE_FINAL="${BACKUP_DIR}/storage_${STAMP}.tar.gz"
LOCK_FILE="${PROJECT_DIR}/.library-maintenance.lock"
LOCK_FD=""
LOCK_TOKEN=""
LOCK_ACQUIRED=0
DB_PUBLISHED=0
STORAGE_PUBLISHED=0
BACKUP_COMPLETE=0
BACKEND_NEEDS_RESTART=0

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

fail() {
  log "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [[ -n "${DB_TMP}" && -e "${DB_TMP}" ]] && ! rm -f -- "${DB_TMP}"; then
    log "ERROR: failed to remove temporary file ${DB_TMP}" >&2
    status=1
  fi
  if [[ -n "${STORAGE_TMP}" && -e "${STORAGE_TMP}" ]] && ! rm -f -- "${STORAGE_TMP}"; then
    log "ERROR: failed to remove temporary file ${STORAGE_TMP}" >&2
    status=1
  fi

  if [[ "${BACKUP_COMPLETE}" -ne 1 ]]; then
    if [[ "${DB_PUBLISHED}" -eq 1 && -e "${DB_FINAL}" ]] && ! rm -f -- "${DB_FINAL}"; then
      log "ERROR: failed to remove incomplete backup ${DB_FINAL}" >&2
      status=1
    fi
    if [[ "${STORAGE_PUBLISHED}" -eq 1 && -e "${STORAGE_FINAL}" ]] && ! rm -f -- "${STORAGE_FINAL}"; then
      log "ERROR: failed to remove incomplete backup ${STORAGE_FINAL}" >&2
      status=1
    fi
  fi

  # Restore service state before releasing the backup lock. Otherwise another
  # backup could begin while backend is stopped and be disrupted by this start.
  if [[ "${BACKEND_NEEDS_RESTART}" -eq 1 ]]; then
    log "restoring backend service after backup"
    if ! "${COMPOSE[@]}" start --wait --wait-timeout 60 backend; then
      log "ERROR: backend could not be restarted and become healthy; start it manually" >&2
      status=1
    fi
  fi

  if [[ "${LOCK_ACQUIRED}" -eq 1 ]]; then
    # Keep the lock file itself: unlinking it after unlock would allow a waiter
    # holding the old inode and a new process using a new inode to run together.
    # Clearing the owner metadata while the kernel lock is still held is safe.
    if ! : > "${LOCK_FILE}"; then
      log "ERROR: failed to clear backup lock metadata ${LOCK_FILE}" >&2
      status=1
    fi
  fi

  if [[ -n "${LOCK_FD}" ]]; then
    flock -u "${LOCK_FD}" 2>/dev/null || true
    exec {LOCK_FD}>&-
  fi

  exit "${status}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ "${RETENTION_DAYS}" =~ ^[1-9][0-9]*$ ]] || fail "BACKUP_RETENTION_DAYS must be a positive integer"

require_command docker
require_command tar
require_command mktemp
require_command find
require_command flock

mkdir -p -- "${BACKUP_DIR}"
[[ -d "${PROJECT_DIR}/backend/storage" ]] || fail "storage directory not found: ${PROJECT_DIR}/backend/storage"

if [[ -d "${LOCK_FILE}" ]]; then
  fail "legacy maintenance lock directory exists at ${LOCK_FILE}; verify that no backup or restore process is active before removing it once"
fi

exec {LOCK_FD}<> "${LOCK_FILE}" || fail "cannot open backup lock ${LOCK_FILE}"
if ! flock -n "${LOCK_FD}"; then
  fail "another backup or restore operation is running (${LOCK_FILE} is locked)"
fi

if [[ -s "${LOCK_FILE}" ]]; then
  log "recovered stale backup lock metadata left by an interrupted run"
fi

LOCK_TOKEN="$(date -u +"%Y%m%dT%H%M%SZ")-$$-${RANDOM}"
: > "${LOCK_FILE}" || fail "cannot clear stale backup lock metadata ${LOCK_FILE}"
printf 'protocol=kernel-lock-v1\npid=%s\nhost=%s\ntoken=%s\n' \
  "$$" "$(hostname 2>/dev/null || printf 'unknown')" "${LOCK_TOKEN}" >&"${LOCK_FD}" || \
  fail "cannot write backup lock metadata ${LOCK_FILE}"
LOCK_ACQUIRED=1

if [[ -e "${DB_FINAL}" || -e "${STORAGE_FINAL}" ]]; then
  fail "backup files for ${STAMP} already exist"
fi

COMPOSE=(docker compose --project-directory "${PROJECT_DIR}")
"${COMPOSE[@]}" config --quiet
RUNNING_SERVICES="$("${COMPOSE[@]}" ps --status running --services)"
DB_RUNNING=0
BACKEND_RUNNING=0
while IFS= read -r service; do
  if [[ "${service}" == "db" ]]; then
    DB_RUNNING=1
  fi
  if [[ "${service}" == "backend" ]]; then
    BACKEND_RUNNING=1
  fi
done <<< "${RUNNING_SERVICES}"
if [[ "${DB_RUNNING}" -ne 1 ]]; then
  fail "Docker Compose service 'db' is not running"
fi

# Stop the only application writer before taking either snapshot. This keeps
# database rows and storage files from changing between pg_dump and tar.
if [[ "${BACKEND_RUNNING}" -eq 1 ]]; then
  BACKEND_NEEDS_RESTART=1
  log "stopping backend for a consistent database + storage snapshot"
  "${COMPOSE[@]}" stop backend
fi

DB_TMP="$(mktemp "${BACKUP_DIR}/.database_${STAMP}.XXXXXX")"
STORAGE_TMP="$(mktemp "${BACKUP_DIR}/.storage_${STAMP}.XXXXXX")"

log "creating PostgreSQL custom-format dump"
"${COMPOSE[@]}" exec -T db sh -ceu \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  > "${DB_TMP}"
[[ -s "${DB_TMP}" ]] || fail "pg_dump produced an empty file"
"${COMPOSE[@]}" exec -T db pg_restore --list < "${DB_TMP}" >/dev/null

log "archiving backend/storage"
tar -czf "${STORAGE_TMP}" -C "${PROJECT_DIR}/backend" storage
[[ -s "${STORAGE_TMP}" ]] || fail "storage archive is empty"
tar -tzf "${STORAGE_TMP}" >/dev/null

# Both artifacts are validated before they become visible under final names.
mv -- "${STORAGE_TMP}" "${STORAGE_FINAL}"
STORAGE_TMP=""
STORAGE_PUBLISHED=1
mv -- "${DB_TMP}" "${DB_FINAL}"
DB_TMP=""
DB_PUBLISHED=1
BACKUP_COMPLETE=1

log "backup completed: ${DB_FINAL}"
log "backup completed: ${STORAGE_FINAL}"

log "removing completed backup files older than ${RETENTION_DAYS} days"
while IFS= read -r -d '' old_database; do
  database_name="${old_database##*/}"
  pair_stamp="${database_name#database_}"
  pair_stamp="${pair_stamp%.dump}"
  old_storage="${BACKUP_DIR}/storage_${pair_stamp}.tar.gz"
  if [[ ! -f "${old_storage}" ]]; then
    log "WARNING: keeping orphan database backup without storage pair: ${old_database}" >&2
    continue
  fi
  storage_age_match="$(find "${old_storage}" -maxdepth 0 -type f -mtime "+${RETENTION_DAYS}" -print -quit)"
  if [[ -z "${storage_age_match}" ]]; then
    continue
  fi
  log "removing completed backup pair ${pair_stamp}"
  rm -f -- "${old_database}" "${old_storage}"
done < <(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'database_*.dump' \
    -mtime "+${RETENTION_DAYS}" -print0
)

log "done"

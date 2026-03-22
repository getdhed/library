import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  approveSubmission,
  createDocument,
  deleteDocument,
  getAdminDepartments,
  getAdminDocuments,
  getAdminFaculties,
  getAdminSubmissions,
  queueImportFolderSubmissions,
  rejectSubmission,
  submissionFileUrl,
  updateDocument,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import type {
  Department,
  DocumentItem,
  Faculty,
  ImportFolderResult,
  PagedDocuments,
  SubmissionItem,
  SubmissionSource,
  SubmissionStatus,
} from "../../types";

const emptyForm = {
  title: "",
  author: "",
  year: new Date().getFullYear(),
  type: "Учебник",
  description: "",
  facultyId: 0,
  departmentId: 0,
  tags: "",
  isVisible: true,
  file: null as File | null,
};

type AdminForm = typeof emptyForm;

function submissionStatusLabel(status: SubmissionStatus) {
  switch (status) {
    case "approved":
      return "Одобрено";
    case "rejected":
      return "Отклонено";
    default:
      return "На модерации";
  }
}

function submissionSourceLabel(source: SubmissionSource) {
  return source === "admin_import" ? "Import-папка" : "Пользователь";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function validateDocumentForm(form: AdminForm, requireFile: boolean) {
  const missing: string[] = [];

  if (!form.title.trim()) {
    missing.push("название");
  }
  if (!form.author.trim()) {
    missing.push("автор");
  }
  if (!Number.isFinite(form.year) || form.year <= 0) {
    missing.push("год");
  }
  if (!form.type.trim()) {
    missing.push("тип");
  }
  if (!form.departmentId) {
    missing.push("кафедра");
  }
  if (!form.description.trim()) {
    missing.push("описание");
  }
  if (requireFile && !form.file) {
    missing.push("PDF-файл");
  }

  return missing;
}

const AdminDocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [visibility, setVisibility] = useState("");
  const [filterFacultyId, setFilterFacultyId] = useState(0);
  const [filterDepartmentId, setFilterDepartmentId] = useState(0);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [approvingSubmission, setApprovingSubmission] =
    useState<SubmissionItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<ImportFolderResult | null>(
    null
  );

  async function loadDocuments() {
    if (!token) {
      return;
    }

    const response = await getAdminDocuments(token, {
      q: search,
      sort,
      visibility,
      facultyId: filterFacultyId,
      departmentId: filterDepartmentId,
      pageSize: 20,
    });
    setPayload(response);
  }

  async function loadSubmissions() {
    if (!token) {
      return;
    }

    const response = await getAdminSubmissions(token);
    setSubmissions(response.items);
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    getAdminFaculties(token)
      .then((response) => setFaculties(response.items))
      .catch(console.error);

    getAdminDepartments(token)
      .then((response) => setAllDepartments(response.items))
      .catch(console.error);

    loadSubmissions().catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadSubmissions().catch(console.error);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [filterDepartmentId, filterFacultyId, search, sort, token, visibility]);

  const isEditing = Boolean(editing);
  const isApproving = Boolean(approvingSubmission);

  const filterDepartments = useMemo(
    () =>
      allDepartments.filter(
        (department) =>
          !filterFacultyId || department.facultyId === filterFacultyId
      ),
    [allDepartments, filterFacultyId]
  );

  const formDepartments = useMemo(
    () =>
      allDepartments.filter(
        (department) => !form.facultyId || department.facultyId === form.facultyId
      ),
    [allDepartments, form.facultyId]
  );

  function resetEditor() {
    setEditing(null);
    setApprovingSubmission(null);
    setForm(emptyForm);
    setFormError("");
  }

  function fillForm(item: DocumentItem) {
    setEditing(item);
    setApprovingSubmission(null);
    setForm({
      title: item.title,
      author: item.author,
      year: item.year,
      type: item.type,
      description: item.description,
      facultyId: item.facultyId,
      departmentId: item.departmentId,
      tags: item.tags.join(", "),
      isVisible: item.isVisible,
      file: null,
    });
    setFormError("");
  }

  function startApprove(item: SubmissionItem) {
    setApprovingSubmission(item);
    setEditing(null);
    setForm({
      title: item.title,
      author: item.author ?? "",
      year: new Date().getFullYear(),
      type: "Методичка",
      description: "",
      facultyId: item.facultyId ?? 0,
      departmentId: item.departmentId ?? 0,
      tags: "",
      isVisible: true,
      file: null,
    });
    setFormError("");
  }

  async function submitDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setFormError("");

    const missing = validateDocumentForm(form, !isEditing && !isApproving);
    if (missing.length > 0) {
      setFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }

    const formData = new FormData();
    formData.set("title", form.title.trim());
    formData.set("author", form.author.trim());
    formData.set("year", String(form.year));
    formData.set("type", form.type.trim());
    formData.set("description", form.description.trim());
    formData.set("departmentId", String(form.departmentId));
    formData.set("tags", form.tags);
    formData.set("isVisible", String(form.isVisible));
    if (form.file) {
      formData.set("file", form.file);
    }

    try {
      if (approvingSubmission) {
        await approveSubmission(token, approvingSubmission.id, formData);
        await Promise.all([loadDocuments(), loadSubmissions()]);
      } else if (editing) {
        await updateDocument(token, editing.id, formData);
        await loadDocuments();
      } else {
        await createDocument(token, formData);
        await loadDocuments();
      }

      resetEditor();
    } catch (error) {
      setFormError(
        resolveErrorMessage(error, "Не удалось сохранить изменения.")
      );
    }
  }

  async function removeDocument(id: number) {
    if (!token || !window.confirm("Удалить документ?")) {
      return;
    }

    await deleteDocument(token, id);
    await loadDocuments();
  }

  async function handleRejectSubmission(item: SubmissionItem) {
    if (!token) {
      return;
    }

    const moderationNote = window.prompt(
      "Причина отклонения",
      item.moderationNote ?? ""
    );
    if (!moderationNote?.trim()) {
      return;
    }

    await rejectSubmission(token, item.id, moderationNote.trim());
    if (approvingSubmission?.id === item.id) {
      resetEditor();
    }
    await loadSubmissions();
  }

  async function handleImportFromFolder() {
    if (!token) {
      return;
    }

    setImportError("");
    setImportResult(null);

    try {
      const result = await queueImportFolderSubmissions(token);
      setImportResult(result);
      await loadSubmissions();
    } catch (error) {
      setImportError(
        resolveErrorMessage(error, "Не удалось забрать PDF из папки.")
      );
    }
  }

  return (
    <div className="page-shell admin-layout">
      <div className="content-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Админка</p>
            <h1>Документы каталога</h1>
          </div>
        </div>

        <div className="filters-bar">
          <input
            className="inline-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию"
          />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="date_desc">Новые</option>
            <option value="date_asc">Старые</option>
            <option value="title_asc">А-Я</option>
            <option value="size_desc">Большой размер</option>
          </select>
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value)}
          >
            <option value="">Вся видимость</option>
            <option value="visible">Только видимые</option>
            <option value="hidden">Только скрытые</option>
          </select>
          <select
            value={filterFacultyId || ""}
            onChange={(event) => {
              setFilterFacultyId(Number(event.target.value) || 0);
              setFilterDepartmentId(0);
            }}
          >
            <option value="">Все факультеты</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
          <select
            value={filterDepartmentId || ""}
            onChange={(event) => setFilterDepartmentId(Number(event.target.value) || 0)}
          >
            <option value="">Все кафедры</option>
            {filterDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Кафедра</th>
                <th>Год</th>
                <th>Видимость</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(payload?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.type}</td>
                  <td>{item.department}</td>
                  <td>{item.year}</td>
                  <td>{item.isVisible ? "Видим" : "Скрыт"}</td>
                  <td className="actions-cell">
                    <button
                      className="secondary-button"
                      onClick={() => fillForm(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="secondary-button danger"
                      onClick={() => void removeDocument(item.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {payload?.items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-inline-state">
                      Документы по текущим фильтрам не найдены.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="admin-submissions-section">
          <div className="page-header page-header-compact">
            <div>
              <p className="eyebrow">Модерация</p>
              <h2>Очередь заявок</h2>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Источник</th>
                  <th>Пользователь</th>
                  <th>Кафедра</th>
                  <th>Статус</th>
                  <th>Создано</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>
                      <span
                        className={`submission-source-pill submission-source-${item.source}`}
                      >
                        {submissionSourceLabel(item.source)}
                      </span>
                    </td>
                    <td>
                      <div>{item.uploaderName || "Пользователь"}</div>
                      {item.uploaderEmail && (
                        <div className="muted-text">{item.uploaderEmail}</div>
                      )}
                    </td>
                    <td>{item.department || "Не указана"}</td>
                    <td>
                      <span
                        className={`submission-status-pill submission-status-${item.status}`}
                      >
                        {submissionStatusLabel(item.status)}
                      </span>
                      {item.moderationNote && (
                        <div className="muted-text submission-table-note">
                          {item.moderationNote}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td className="actions-cell">
                      <a
                        className="secondary-button"
                        href={submissionFileUrl(
                          item.id,
                          token ?? "",
                          false,
                          item.updatedAt
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть PDF
                      </a>
                      {item.status === "pending" && (
                        <>
                          <button
                            className="primary-button"
                            onClick={() => startApprove(item)}
                          >
                            Принять
                          </button>
                          <button
                            className="secondary-button danger"
                            onClick={() => void handleRejectSubmission(item)}
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                      {item.approvedDocumentId && (
                        <Link
                          className="secondary-button"
                          to={`/documents/${item.approvedDocumentId}`}
                        >
                          Открыть документ
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-inline-state">
                        В очереди модерации пока нет заявок.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="content-card">
        <p className="eyebrow">Р СѓС‡РЅР°СЏ Р·Р°РіСЂСѓР·РєР°</p>
        <h2>
          {isApproving
            ? "Одобрить заявку"
            : isEditing
              ? "Редактировать документ"
              : "Добавить документ"}
        </h2>

        <p className="admin-required-note">Поля со звёздочкой обязательны.</p>

        {approvingSubmission && (
          <div className="submission-approve-summary">
            <strong>PDF уже загружен и ждёт оформления</strong>
            <p className="muted-text">
              Заполните обязательные поля каталога, после чего заявка станет
              обычным документом.
            </p>
            <p className="submission-meta">
              Источник: {submissionSourceLabel(approvingSubmission.source)}
              {approvingSubmission.department
                ? ` • Предложенная кафедра: ${approvingSubmission.department}`
                : ""}
            </p>
            {approvingSubmission.comment && (
              <p className="submission-note">{approvingSubmission.comment}</p>
            )}
            <a
              className="secondary-button"
              href={submissionFileUrl(
                approvingSubmission.id,
                token ?? "",
                false,
                approvingSubmission.updatedAt
              )}
              target="_blank"
              rel="noreferrer"
            >
              Открыть PDF заявки
            </a>
          </div>
        )}

        <form className="form-grid" onSubmit={submitDocument} noValidate>
          <label className="form-field">
            <span>Название *</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Название"
              required
            />
          </label>

          <label className="form-field">
            <span>Автор *</span>
            <input
              value={form.author}
              onChange={(event) =>
                setForm((current) => ({ ...current, author: event.target.value }))
              }
              placeholder="Автор"
              required
            />
          </label>

          <label className="form-field">
            <span>Год *</span>
            <input
              value={form.year}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  year: Number(event.target.value),
                }))
              }
              placeholder="Год"
              type="number"
              required
            />
          </label>

          <label className="form-field">
            <span>Тип *</span>
            <input
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
              placeholder="Тип"
              required
            />
          </label>

          <label className="form-field">
            <span>Факультет</span>
            <select
              value={form.facultyId || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  facultyId: Number(event.target.value) || 0,
                  departmentId: 0,
                }))
              }
            >
              <option value="">Факультет</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Кафедра *</span>
            <select
              value={form.departmentId || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  departmentId: Number(event.target.value) || 0,
                }))
              }
              required
            >
              <option value="">Кафедра</option>
              {formDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Теги</span>
            <input
              value={form.tags}
              onChange={(event) =>
                setForm((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder="Теги через запятую"
            />
          </label>

          {!isApproving && (
            <label className="file-label">
              <span>{isEditing ? "Новый PDF" : "PDF-файл *"}</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>
          )}

          <label className="form-field">
            <span>Описание *</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Описание"
              required
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isVisible: event.target.checked,
                }))
              }
            />
            Документ видим пользователям
          </label>

          {formError && <p className="error-text">{formError}</p>}

          <div className="admin-form-actions">
            <button className="primary-button" type="submit">
              {isApproving
                ? "Одобрить заявку"
                : isEditing
                  ? "Сохранить"
                  : "Добавить"}
            </button>
            {(isEditing || isApproving) && (
              <button
                className="secondary-button"
                type="button"
                onClick={resetEditor}
              >
                Отменить
              </button>
            )}
          </div>
        </form>

        <div className="import-box">
          <h3>Очередь из папки</h3>
          <p className="muted-text">
            Положите PDF в `backend/storage/import`, а затем заберите их в
            очередь модерации. Они не появятся в каталоге, пока вы не заполните
            метаданные и не одобрите заявку.
          </p>

          {importError && <p className="error-text">{importError}</p>}

          {importResult && (
            <div className="import-result">
              <strong>Добавлено в очередь: {importResult.queued}</strong>
              {importResult.errors.length > 0 && (
                <ul className="import-errors-list">
                  {importResult.errors.map((item) => (
                    <li key={`${item.fileName}-${item.error}`}>
                      {item.fileName}: {item.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleImportFromFolder()}
          >
            Забрать PDF из папки в очередь
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentsPage;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import AdminSectionNav from "../../components/AdminSectionNav";
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

type AdminTab = "moderation" | "catalog" | "upload";
type ModerationFilterValue = SubmissionStatus | "";

type AdminForm = {
  title: string;
  author: string;
  year: number;
  type: string;
  description: string;
  facultyId: number;
  departmentId: number;
  tags: string;
  isVisible: boolean;
  file: File | null;
};

type DocumentFormFieldsProps = {
  form: AdminForm;
  setForm: React.Dispatch<React.SetStateAction<AdminForm>>;
  faculties: Faculty[];
  departments: Department[];
  fileLabel?: string;
};

type AdminDrawerProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "moderation", label: "Модерация" },
  { id: "catalog", label: "Каталог" },
  { id: "upload", label: "Загрузка" },
];

function createEmptyForm(defaultType = "Учебник"): AdminForm {
  return {
    title: "",
    author: "",
    year: new Date().getFullYear(),
    type: defaultType,
    description: "",
    facultyId: 0,
    departmentId: 0,
    tags: "",
    isVisible: true,
    file: null,
  };
}

function createEditForm(item: DocumentItem): AdminForm {
  return {
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
  };
}

function createApprovalForm(item: SubmissionItem): AdminForm {
  return {
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
  };
}

function isAdminTab(value: string | null): value is AdminTab {
  return value === "moderation" || value === "catalog" || value === "upload";
}

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

function buildDocumentFormData(form: AdminForm) {
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

  return formData;
}

function getDepartmentsForFaculty(
  departments: Department[],
  facultyId: number
) {
  return departments.filter(
    (department) => !facultyId || department.facultyId === facultyId
  );
}

const DocumentFormFields: React.FC<DocumentFormFieldsProps> = ({
  form,
  setForm,
  faculties,
  departments,
  fileLabel,
}) => {
  return (
    <>
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
          value={String(form.year || "")}
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
          {departments.map((department) => (
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

      {fileLabel && (
        <label className="file-label">
          <span>{fileLabel}</span>
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
    </>
  );
};

const AdminDrawer: React.FC<AdminDrawerProps> = ({
  eyebrow,
  title,
  titleId,
  onClose,
  children,
}) => {
  return (
    <>
      <button
        type="button"
        className="admin-drawer-overlay"
        aria-label="Закрыть окно оформления"
        onClick={onClose}
      />
      <aside
        className="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="admin-drawer-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="secondary-button admin-drawer-close"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <div className="admin-drawer-body">{children}</div>
      </aside>
    </>
  );
};

const AdminDocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [visibility, setVisibility] = useState("");
  const [filterFacultyId, setFilterFacultyId] = useState(0);
  const [filterDepartmentId, setFilterDepartmentId] = useState(0);

  const [moderationSource, setModerationSource] = useState<SubmissionSource | "">(
    ""
  );
  const [moderationStatus, setModerationStatus] =
    useState<ModerationFilterValue>("pending");

  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(
    null
  );
  const [approvingSubmission, setApprovingSubmission] =
    useState<SubmissionItem | null>(null);

  const [createForm, setCreateForm] = useState<AdminForm>(() => createEmptyForm());
  const [editForm, setEditForm] = useState<AdminForm>(() => createEmptyForm());
  const [approveForm, setApproveForm] = useState<AdminForm>(() =>
    createEmptyForm("Методичка")
  );

  const [createFormError, setCreateFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [approveFormError, setApproveFormError] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<ImportFolderResult | null>(
    null
  );

  const rawTab = searchParams.get("tab");
  const activeTab: AdminTab = isAdminTab(rawTab) ? rawTab : "moderation";

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

  function resetEditing() {
    setEditingDocument(null);
    setEditForm(createEmptyForm());
    setEditFormError("");
  }

  function resetApproving() {
    setApprovingSubmission(null);
    setApproveForm(createEmptyForm("Методичка"));
    setApproveFormError("");
  }

  function closeDrawer() {
    resetApproving();
    resetEditing();
  }

  useEffect(() => {
    if (rawTab === activeTab) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("tab", activeTab);
    setSearchParams(next, { replace: true });
  }, [activeTab, rawTab, searchParams, setSearchParams]);

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

  useEffect(() => {
    if (activeTab !== "moderation" && approvingSubmission) {
      resetApproving();
    }
    if (activeTab !== "catalog" && editingDocument) {
      resetEditing();
    }
  }, [activeTab]);

  const filterDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, filterFacultyId),
    [allDepartments, filterFacultyId]
  );

  const createDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, createForm.facultyId),
    [allDepartments, createForm.facultyId]
  );

  const editDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, editForm.facultyId),
    [allDepartments, editForm.facultyId]
  );

  const approveDepartments = useMemo(
    () => getDepartmentsForFaculty(allDepartments, approveForm.facultyId),
    [allDepartments, approveForm.facultyId]
  );

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((item) => {
        if (moderationSource && item.source !== moderationSource) {
          return false;
        }
        if (moderationStatus && item.status !== moderationStatus) {
          return false;
        }
        return true;
      }),
    [moderationSource, moderationStatus, submissions]
  );

  const pendingSummary = useMemo(() => {
    const pending = submissions.filter((item) => item.status === "pending");
    return {
      total: pending.length,
      importCount: pending.filter((item) => item.source === "admin_import")
        .length,
      userCount: pending.filter((item) => item.source === "user_upload").length,
    };
  }, [submissions]);

  const showModerationDrawer =
    activeTab === "moderation" && Boolean(approvingSubmission);
  const showCatalogDrawer = activeTab === "catalog" && Boolean(editingDocument);
  const drawerOpen = showModerationDrawer || showCatalogDrawer;

  useEffect(() => {
    if (!drawerOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  function switchTab(nextTab: AdminTab, preserveSelection = false) {
    if (!preserveSelection && nextTab !== activeTab) {
      closeDrawer();
    }

    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    setSearchParams(next);
  }

  function startEdit(item: DocumentItem) {
    setEditingDocument(item);
    setEditForm(createEditForm(item));
    setEditFormError("");
    switchTab("catalog", true);
  }

  function startApprove(item: SubmissionItem) {
    if (item.status !== "pending") {
      return;
    }

    setApprovingSubmission(item);
    setApproveForm(createApprovalForm(item));
    setApproveFormError("");
    switchTab("moderation", true);
  }

  async function handleCreateDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCreateFormError("");

    const missing = validateDocumentForm(createForm, true);
    if (missing.length > 0) {
      setCreateFormError(
        `Заполните обязательные поля: ${missing.join(", ")}.`
      );
      return;
    }

    try {
      await createDocument(token, buildDocumentFormData(createForm));
      await loadDocuments();
      setCreateForm(createEmptyForm());
    } catch (error) {
      setCreateFormError(
        resolveErrorMessage(error, "Не удалось создать документ.")
      );
    }
  }

  async function handleUpdateDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !editingDocument) {
      return;
    }

    setEditFormError("");

    const missing = validateDocumentForm(editForm, false);
    if (missing.length > 0) {
      setEditFormError(`Заполните обязательные поля: ${missing.join(", ")}.`);
      return;
    }

    try {
      await updateDocument(token, editingDocument.id, buildDocumentFormData(editForm));
      await loadDocuments();
      resetEditing();
    } catch (error) {
      setEditFormError(
        resolveErrorMessage(error, "Не удалось сохранить изменения.")
      );
    }
  }

  async function handleApproveSubmission(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !approvingSubmission) {
      return;
    }

    setApproveFormError("");

    const missing = validateDocumentForm(approveForm, false);
    if (missing.length > 0) {
      setApproveFormError(
        `Заполните обязательные поля: ${missing.join(", ")}.`
      );
      return;
    }

    try {
      await approveSubmission(
        token,
        approvingSubmission.id,
        buildDocumentFormData(approveForm)
      );
      await Promise.all([loadDocuments(), loadSubmissions()]);
      resetApproving();
    } catch (error) {
      setApproveFormError(
        resolveErrorMessage(error, "Не удалось одобрить заявку.")
      );
    }
  }

  async function removeDocument(id: number) {
    if (!token || !window.confirm("Удалить документ?")) {
      return;
    }

    await deleteDocument(token, id);
    if (editingDocument?.id === id) {
      resetEditing();
    }
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
      resetApproving();
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
        resolveErrorMessage(error, "Не удалось проверить import-папку.")
      );
    }
  }

  return (
    <div className="page-shell admin-page-shell">
      <AdminSectionNav />

      <div className="page-header">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Управление документами</h1>
          <p className="muted-text admin-page-copy">
            Каталог, очередь модерации и загрузка PDF теперь разнесены по
            отдельным режимам.
          </p>
        </div>
      </div>

      <div className="admin-tab-nav" role="tablist" aria-label="Режимы админки">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`admin-tab-button ${
              activeTab === tab.id ? "active" : ""
            }`}
            onClick={() => switchTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "moderation" && (
        <div className="content-card admin-list-card">
          <div className="page-header page-header-compact">
            <div>
              <p className="eyebrow">Модерация</p>
              <h2>Очередь модерации</h2>
            </div>
          </div>

          <div className="admin-summary-grid">
            <div className="admin-summary-card">
              <span>На модерации</span>
              <strong>{pendingSummary.total}</strong>
            </div>
            <div className="admin-summary-card">
              <span>Из import-папки</span>
              <strong>{pendingSummary.importCount}</strong>
            </div>
            <div className="admin-summary-card">
              <span>От пользователей</span>
              <strong>{pendingSummary.userCount}</strong>
            </div>
          </div>

          <div className="filters-bar admin-filters-bar">
            <select
              aria-label="Фильтр по источнику"
              value={moderationSource}
              onChange={(event) =>
                setModerationSource(
                  (event.target.value as SubmissionSource | "") ?? ""
                )
              }
            >
              <option value="">Все источники</option>
              <option value="user_upload">Пользователь</option>
              <option value="admin_import">Import-папка</option>
            </select>
            <select
              aria-label="Фильтр по статусу"
              value={moderationStatus}
              onChange={(event) =>
                setModerationStatus(
                  (event.target.value as ModerationFilterValue) ?? ""
                )
              }
            >
              <option value="">Все статусы</option>
              <option value="pending">На модерации</option>
              <option value="approved">Одобрено</option>
              <option value="rejected">Отклонено</option>
            </select>
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
                {filteredSubmissions.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      approvingSubmission?.id === item.id ? "admin-row-selected" : ""
                    }
                  >
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
                            type="button"
                            onClick={() => startApprove(item)}
                          >
                            Оформить
                          </button>
                          <button
                            className="secondary-button danger"
                            type="button"
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
                {filteredSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-inline-state">
                        По текущим фильтрам заявки не найдены.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "catalog" && (
        <div className="content-card admin-list-card">
          <div className="page-header page-header-compact">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2>Документы каталога</h2>
            </div>
          </div>

          <div className="filters-bar">
            <input
              className="inline-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Сортировка документов"
            >
              <option value="date_desc">Новые</option>
              <option value="date_asc">Старые</option>
              <option value="title_asc">А-Я</option>
              <option value="size_desc">Большой размер</option>
            </select>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              aria-label="Видимость документов"
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
              aria-label="Фильтр по факультету"
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
              onChange={(event) =>
                setFilterDepartmentId(Number(event.target.value) || 0)
              }
              aria-label="Фильтр по кафедре"
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
                  <tr
                    key={item.id}
                    className={
                      editingDocument?.id === item.id ? "admin-row-selected" : ""
                    }
                  >
                    <td>{item.title}</td>
                    <td>{item.type}</td>
                    <td>{item.department}</td>
                    <td>{item.year}</td>
                    <td>{item.isVisible ? "Видим" : "Скрыт"}</td>
                    <td className="actions-cell">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => startEdit(item)}
                      >
                        Редактировать
                      </button>
                      <button
                        className="secondary-button danger"
                        type="button"
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
        </div>
      )}

      {activeTab === "upload" && (
        <div className="admin-upload-grid">
          <div className="content-card admin-pane-card">
            <div className="admin-pane-header">
              <div>
                <p className="eyebrow">Загрузка</p>
                <h2>Добавить документ вручную</h2>
              </div>
            </div>

            <p className="admin-required-note">
              Этот режим создаёт документ сразу в каталоге. Все поля со
              звёздочкой обязательны.
            </p>

            <form className="form-grid" onSubmit={handleCreateDocument} noValidate>
              <DocumentFormFields
                form={createForm}
                setForm={setCreateForm}
                faculties={faculties}
                departments={createDepartments}
                fileLabel="PDF-файл *"
              />

              {createFormError && <p className="error-text">{createFormError}</p>}

              <div className="admin-form-actions">
                <button className="primary-button" type="submit">
                  Создать документ
                </button>
              </div>
            </form>
          </div>

          <div className="content-card admin-pane-card">
            <div className="admin-pane-header">
              <div>
                <p className="eyebrow">Import-папка</p>
                <h2>Папка автоматического импорта</h2>
              </div>
            </div>

            <div className="admin-import-copy">
              <p className="muted-text">
                Кладите PDF в <code>backend/storage/import</code>. Новые файлы
                автоматически попадают в очередь модерации и не появляются в
                каталоге до одобрения.
              </p>
              <p className="muted-text">
                Если нужно, можно запустить проверку папки вручную и сразу
                увидеть результат.
              </p>
            </div>

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

            <div className="admin-form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleImportFromFolder()}
              >
                Проверить папку сейчас
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => switchTab("moderation")}
              >
                Перейти к модерации
              </button>
            </div>
          </div>
        </div>
      )}

      {showModerationDrawer && approvingSubmission && (
        <AdminDrawer
          eyebrow="Модерация"
          title="Одобрить заявку"
          titleId="admin-approve-drawer-title"
          onClose={closeDrawer}
        >
          <p className="admin-required-note">
            Заполните обязательные поля каталога. PDF уже загружен и будет
            привязан к документу после одобрения.
          </p>

          <div className="submission-approve-summary">
            <strong>{approvingSubmission.title}</strong>
            <p className="muted-text">
              Источник: {submissionSourceLabel(approvingSubmission.source)}
            </p>
            {approvingSubmission.department && (
              <p className="submission-meta">
                Предложенная кафедра: {approvingSubmission.department}
              </p>
            )}
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

          <form className="form-grid" onSubmit={handleApproveSubmission} noValidate>
            <DocumentFormFields
              form={approveForm}
              setForm={setApproveForm}
              faculties={faculties}
              departments={approveDepartments}
            />

            {approveFormError && <p className="error-text">{approveFormError}</p>}

            <div className="admin-form-actions">
              <button className="primary-button" type="submit">
                Одобрить заявку
              </button>
              <button
                className="secondary-button danger"
                type="button"
                onClick={() => void handleRejectSubmission(approvingSubmission)}
              >
                Отклонить
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={closeDrawer}
              >
                Отменить
              </button>
            </div>
          </form>
        </AdminDrawer>
      )}

      {showCatalogDrawer && editingDocument && (
        <AdminDrawer
          eyebrow="Каталог"
          title="Редактировать документ"
          titleId="admin-edit-drawer-title"
          onClose={closeDrawer}
        >
          <p className="admin-required-note">
            Меняйте метаданные здесь. Новый PDF добавляйте только если нужно
            заменить файл документа.
          </p>

          <form className="form-grid" onSubmit={handleUpdateDocument} noValidate>
            <DocumentFormFields
              form={editForm}
              setForm={setEditForm}
              faculties={faculties}
              departments={editDepartments}
              fileLabel="Новый PDF"
            />

            {editFormError && <p className="error-text">{editFormError}</p>}

            <div className="admin-form-actions">
              <button className="primary-button" type="submit">
                Сохранить
              </button>
              <button
                className="secondary-button danger"
                type="button"
                onClick={() => void removeDocument(editingDocument.id)}
              >
                Удалить
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={closeDrawer}
              >
                Отменить
              </button>
            </div>
          </form>
        </AdminDrawer>
      )}
    </div>
  );
};

export default AdminDocumentsPage;

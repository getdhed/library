import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createSubmission,
  getDepartments,
  getFaculties,
  getMySubmissions,
  submissionFileUrl,
} from "../api/library";
import { useAuth } from "../auth/AuthContext";
import type {
  Department,
  Faculty,
  SubmissionItem,
  SubmissionStatus,
} from "../types";

const emptyForm = {
  title: "",
  author: "",
  facultyId: "",
  departmentId: "",
  comment: "",
  file: null as File | null,
};

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SubmitPage: React.FC = () => {
  const { token } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSubmissions() {
    if (!token) {
      return;
    }

    const response = await getMySubmissions(token);
    setSubmissions(response.items);
  }

  useEffect(() => {
    getFaculties()
      .then((response) => setFaculties(response.items))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadSubmissions().catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!form.facultyId) {
      setDepartments([]);
      return;
    }

    getDepartments(Number(form.facultyId))
      .then((response) => setDepartments(response.items))
      .catch(console.error);
  }, [form.facultyId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setError("");
    setSuccess("");

    if (!form.file) {
      setError("Выберите PDF-файл.");
      return;
    }

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("file", form.file);
    if (form.author.trim()) {
      formData.set("author", form.author.trim());
    }
    if (form.departmentId) {
      formData.set("departmentId", form.departmentId);
    }
    if (form.comment.trim()) {
      formData.set("comment", form.comment.trim());
    }

    await createSubmission(token, formData);
    setForm(emptyForm);
    setDepartments([]);
    setSuccess("PDF отправлен на модерацию.");
    await loadSubmissions();
  }

  return (
    <div className="page-shell page-shell-clean submit-page-shell">
      <div className="content-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Предложить PDF</p>
            <h1>Загрузка пользовательского документа</h1>
          </div>
        </div>
        <p className="muted-text">
          Отправьте PDF и минимальные данные, а админ проверит файл и оформит
          его как обычный документ каталога.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Название"
            required
          />
          <input
            value={form.author}
            onChange={(event) =>
              setForm((current) => ({ ...current, author: event.target.value }))
            }
            placeholder="Автор (необязательно)"
          />
          <select
            value={form.facultyId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                facultyId: event.target.value,
                departmentId: "",
              }))
            }
          >
            <option value="">Факультет (необязательно)</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
          <select
            value={form.departmentId}
            disabled={!form.facultyId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                departmentId: event.target.value,
              }))
            }
          >
            <option value="">Кафедра (необязательно)</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <label className="file-label">
            PDF-файл
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] ?? null,
                }))
              }
              required
            />
          </label>
          <textarea
            value={form.comment}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
            placeholder="Комментарий для модератора (необязательно)"
          />
          {error && <p className="error-text">{error}</p>}
          {success && <p className="muted-text">{success}</p>}
          <button className="primary-button" type="submit">
            Отправить PDF
          </button>
        </form>
      </div>

      <div className="content-card">
        <div className="page-header">
          <div>
            <p className="eyebrow">Мои заявки</p>
            <h2>История модерации</h2>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="empty-inline-state">
            <strong>Пока нет отправленных PDF.</strong>
            <p className="muted-text">
              После отправки здесь появятся статус модерации и ссылка на
              созданный документ.
            </p>
          </div>
        ) : (
          <div className="submission-list">
            {submissions.map((item) => (
              <article key={item.id} className="submission-card">
                <div className="submission-card-header">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="submission-meta">
                      {item.department || "Кафедра не указана"} •{" "}
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`submission-status-pill submission-status-${item.status}`}
                  >
                    {submissionStatusLabel(item.status)}
                  </span>
                </div>

                <p className="submission-meta">
                  Файл: {item.fileName}
                  {item.author ? ` • Автор: ${item.author}` : ""}
                </p>

                {item.comment && <p className="submission-note">{item.comment}</p>}
                {item.moderationNote && (
                  <p className="submission-note submission-note-rejected">
                    Причина отклонения: {item.moderationNote}
                  </p>
                )}

                <div className="submission-card-actions">
                  <a
                    className="secondary-button"
                    href={submissionFileUrl(item.id, token ?? "", false, item.updatedAt)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть PDF
                  </a>
                  {item.approvedDocumentId && (
                    <Link
                      className="primary-button"
                      to={`/documents/${item.approvedDocumentId}`}
                    >
                      Открыть документ
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitPage;

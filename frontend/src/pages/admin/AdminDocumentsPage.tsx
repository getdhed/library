import React, { useEffect, useMemo, useState } from "react";
import {
  createDocument,
  deleteDocument,
  getAdminDepartments,
  getAdminDocuments,
  getAdminFaculties,
  importDocuments,
  updateDocument,
} from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import type { Department, DocumentItem, Faculty, PagedDocuments } from "../../types";

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

const AdminDocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [payload, setPayload] = useState<PagedDocuments | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [visibility, setVisibility] = useState("");
  const [facultyId, setFacultyId] = useState(0);
  const [departmentId, setDepartmentId] = useState(0);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importInfo, setImportInfo] = useState({ author: "Импорт", type: "Методичка", description: "Импорт из папки" });

  async function loadDocuments() {
    if (!token) return;
    const response = await getAdminDocuments(token, {
      q: search,
      sort,
      visibility,
      facultyId,
      departmentId,
      pageSize: 20,
    });
    setPayload(response);
  }

  useEffect(() => {
    if (!token) return;
    getAdminFaculties(token).then((response) => setFaculties(response.items)).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getAdminDepartments(token, facultyId || undefined).then((response) => setDepartments(response.items)).catch(console.error);
  }, [facultyId, token]);

  useEffect(() => {
    loadDocuments().catch(console.error);
  }, [departmentId, facultyId, search, sort, token, visibility]);

  const isEditing = useMemo(() => Boolean(editing), [editing]);

  function fillForm(item: DocumentItem) {
    setEditing(item);
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
    setFacultyId(item.facultyId);
  }

  async function submitDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("author", form.author);
    formData.set("year", String(form.year));
    formData.set("type", form.type);
    formData.set("description", form.description);
    formData.set("departmentId", String(form.departmentId));
    formData.set("tags", form.tags);
    formData.set("isVisible", String(form.isVisible));
    if (form.file) {
      formData.set("file", form.file);
    }

    if (editing) {
      await updateDocument(token, editing.id, formData);
    } else {
      await createDocument(token, formData);
    }

    setEditing(null);
    setForm(emptyForm);
    await loadDocuments();
  }

  async function removeDocument(id: number) {
    if (!token || !window.confirm("Удалить документ?")) return;
    await deleteDocument(token, id);
    await loadDocuments();
  }

  async function runImport() {
    if (!token || !form.departmentId) return;
    await importDocuments(token, {
      departmentId: form.departmentId,
      author: importInfo.author,
      type: importInfo.type,
      description: importInfo.description,
    });
    await loadDocuments();
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
          <input className="inline-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию" />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date_desc">Новые</option>
            <option value="date_asc">Старые</option>
            <option value="title_asc">А-Я</option>
            <option value="size_desc">Большой размер</option>
          </select>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="">Вся видимость</option>
            <option value="visible">Только видимые</option>
            <option value="hidden">Только скрытые</option>
          </select>
          <select value={facultyId || ""} onChange={(e) => setFacultyId(Number(e.target.value) || 0)}>
            <option value="">Все факультеты</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
            ))}
          </select>
          <select value={departmentId || ""} onChange={(e) => setDepartmentId(Number(e.target.value) || 0)}>
            <option value="">Все кафедры</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
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
                    <button className="secondary-button" onClick={() => fillForm(item)}>Изменить</button>
                    <button className="secondary-button danger" onClick={() => removeDocument(item.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card">
        <h2>{isEditing ? "Редактировать документ" : "Добавить документ"}</h2>
        <form className="form-grid" onSubmit={submitDocument}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Название" />
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Автор" />
          <input value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} placeholder="Год" type="number" />
          <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Тип" />
          <select value={form.facultyId || ""} onChange={(e) => setForm({ ...form, facultyId: Number(e.target.value) || 0, departmentId: 0 })}>
            <option value="">Факультет</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
            ))}
          </select>
          <select value={form.departmentId || ""} onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value) || 0 })}>
            <option value="">Кафедра</option>
            {departments.filter((item) => !form.facultyId || item.facultyId === form.facultyId).map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Теги через запятую" />
          <label className="file-label">
            PDF файл
            <input type="file" accept=".pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
          </label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание" />
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} />
            Документ видим пользователям
          </label>
          <button className="primary-button" type="submit">{isEditing ? "Сохранить" : "Добавить"}</button>
        </form>

        <div className="import-box">
          <h3>Импорт из папки</h3>
          <p className="muted-text">Файлы нужно заранее положить в `backend/storage/import`.</p>
          <input value={importInfo.author} onChange={(e) => setImportInfo({ ...importInfo, author: e.target.value })} placeholder="Автор по умолчанию" />
          <input value={importInfo.type} onChange={(e) => setImportInfo({ ...importInfo, type: e.target.value })} placeholder="Тип по умолчанию" />
          <textarea value={importInfo.description} onChange={(e) => setImportInfo({ ...importInfo, description: e.target.value })} placeholder="Описание по умолчанию" />
          <button className="secondary-button" onClick={runImport}>
            Импортировать из папки
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentsPage;

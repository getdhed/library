import React, { useEffect, useState } from "react";
import { getDepartments, getDocuments, getFaculties } from "../api/library";
import { useAuth } from "../auth/AuthContext";
import DocumentListItem from "../components/DocumentListItem";
import type { Department, Faculty, PagedDocuments } from "../types";

const BrowsePage: React.FC = () => {
  const { token } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<number>(0);
  const [selectedDepartment, setSelectedDepartment] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<PagedDocuments | null>(null);

  useEffect(() => {
    getFaculties().then((response) => setFaculties(response.items)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedFaculty) {
      setDepartments([]);
      setSelectedDepartment(0);
      return;
    }
    getDepartments(selectedFaculty)
      .then((response) => setDepartments(response.items))
      .catch(console.error);
  }, [selectedFaculty]);

  useEffect(() => {
    if (!token) return;
    getDocuments(token, {
      q: query,
      facultyId: selectedFaculty,
      departmentId: selectedDepartment,
      sort: "title_asc",
      pageSize: 24,
    })
      .then(setPayload)
      .catch(console.error);
  }, [query, selectedDepartment, selectedFaculty, token]);

  return (
    <div className="page-shell page-shell-clean">
      <div className="page-header">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Документы по факультетам и кафедрам</h1>
        </div>
      </div>

      <div className="browse-grid browse-grid-clean">
        <div className="content-card content-card-flat">
          <h2>Факультеты</h2>
          <div className="stack-list">
            {faculties.map((faculty) => (
              <button
                key={faculty.id}
                className={`sidebar-item ${selectedFaculty === faculty.id ? "active" : ""}`}
                onClick={() => setSelectedFaculty(faculty.id)}
              >
                {faculty.name}
              </button>
            ))}
          </div>
        </div>

        <div className="content-card content-card-flat">
          <h2>Кафедры</h2>
          <div className="stack-list">
            {departments.map((department) => (
              <button
                key={department.id}
                className={`sidebar-item ${selectedDepartment === department.id ? "active" : ""}`}
                onClick={() => setSelectedDepartment(department.id)}
              >
                {department.name}
              </button>
            ))}
          </div>
        </div>

        <div className="content-card content-card-flat browse-results">
          <div className="section-heading section-heading-tight">
            <div>
              <h2>Список документов</h2>
              <p className="muted-text">Быстрый обзор материалов выбранного раздела.</p>
            </div>
            <input
              className="inline-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск внутри раздела"
            />
          </div>

          <div className="document-list">
            {(payload?.items ?? []).map((item) => (
              <DocumentListItem key={item.id} item={item} token={token} />
            ))}
            {payload && payload.items.length === 0 && (
              <div className="empty-inline-state">
                <h3>Документы появятся здесь</h3>
                <p className="muted-text">Выберите факультет или кафедру, чтобы увидеть список материалов.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowsePage;

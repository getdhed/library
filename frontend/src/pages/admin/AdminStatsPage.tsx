import React, { useEffect, useState } from "react";
import { getAdminStats } from "../../api/library";
import { useAuth } from "../../auth/AuthContext";
import AdminSectionNav from "../../components/AdminSectionNav";
import type { AdminStats } from "../../types";

const AdminStatsPage: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    getAdminStats(token).then(setStats).catch(console.error);
  }, [token]);

  if (!stats) {
    return (
      <div className="page-shell admin-page-shell">
        <AdminSectionNav />
        <div className="content-card">Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div className="page-shell admin-page-shell">
      <AdminSectionNav />

      <div className="page-header">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Статистика</h1>
          <p className="muted-text admin-page-copy">
            Сводка по каталогу, просмотрам, скачиваниям и поисковой активности.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="content-card stat-card">
          <strong>{stats.documentsCount}</strong>
          <span>Всего документов</span>
        </div>
        <div className="content-card stat-card">
          <strong>{stats.viewsToday}</strong>
          <span>Открытий сегодня</span>
        </div>
        <div className="content-card stat-card">
          <strong>{stats.downloadsToday}</strong>
          <span>Скачиваний сегодня</span>
        </div>
        <div className="content-card stat-card">
          <strong>{stats.searchesToday}</strong>
          <span>Поисков сегодня</span>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <h2>Популярные запросы</h2>
          <div className="stack-list">
            {stats.topQueries.map((item) => (
              <div key={item.name} className="stat-line">
                {item.name}
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <h2>Популярные документы</h2>
          <div className="stack-list">
            {stats.topDocuments.map((item) => (
              <div key={item.name} className="stat-line">
                {item.name}
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <h2>Документы по факультетам</h2>
          <div className="stack-list">
            {stats.documentsByFaculty.map((item) => (
              <div key={item.faculty} className="stat-line">
                {item.faculty}
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsPage;

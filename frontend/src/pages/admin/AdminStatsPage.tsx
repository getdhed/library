import React from "react";
import { mockDocuments } from "../../mockData";

const AdminStatsPage: React.FC = () => {
  const totalDocs = mockDocuments.length;
  const byFaculty = mockDocuments.reduce<Record<string, number>>(
    (acc, d) => {
      acc[d.faculty] = (acc[d.faculty] || 0) + 1;
      return acc;
    },
    {}
  );

  const fakeOnline = 7; // чисто для прототипа
  const fakeVisitsToday = 123;

  return (
    <div className="page admin-page">
      <header className="admin-header">
        <h1>Статистика</h1>
      </header>

      <section className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{fakeVisitsToday}</div>
          <div className="stat-label">Посещений за сегодня</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{fakeOnline}</div>
          <div className="stat-label">Сейчас онлайн</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalDocs}</div>
          <div className="stat-label">Всего документов</div>
        </div>
      </section>

      <section className="stats-by-faculty">
        <h2>Документы по факультетам</h2>
        <ul>
          {Object.entries(byFaculty).map(([faculty, count]) => (
            <li key={faculty}>
              <strong>{faculty}</strong>: {count}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminStatsPage;


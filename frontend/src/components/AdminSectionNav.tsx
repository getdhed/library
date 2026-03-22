import React from "react";
import { NavLink } from "react-router-dom";

const sections = [
  {
    to: "/admin/documents",
    label: "Документы",
  },
  {
    to: "/admin/stats",
    label: "Статистика",
  },
];

const AdminSectionNav: React.FC = () => {
  return (
    <nav className="admin-section-nav" aria-label="Разделы админки">
      {sections.map((section) => (
        <NavLink
          key={section.to}
          to={section.to}
          end
          className={({ isActive }) =>
            `admin-section-link ${isActive ? "active" : ""}`
          }
        >
          {section.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default AdminSectionNav;

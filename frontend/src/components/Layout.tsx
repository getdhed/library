import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo-area">
          <Link to="/" className="logo">
            Library
          </Link>
        </div>
        <nav className="main-nav">
          <NavLink to="/" end>
            Главная
          </NavLink>
          <NavLink to="/browse">Каталог</NavLink>
          <NavLink to="/admin/documents">Админка</NavLink>
        </nav>
        <div className="header-right">
          <button className="ghost-btn">Избранное</button>
          <button className="ghost-btn">Недавние</button>
          <button className="ghost-btn">Настройки</button>
          <div className="avatar">
            <span>U</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="breadcrumbs">
          <span>{location.pathname}</span>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;


import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import Seo, { type SeoProps } from "./components/Seo";
import { routeLoaders } from "./routing/routePrefetch";

const Layout = lazy(routeLoaders.layout);
const HomePage = lazy(routeLoaders.home);
const SearchResultsPage = lazy(routeLoaders.searchResults);
const BookPage = lazy(routeLoaders.book);
const BrowsePage = lazy(routeLoaders.browse);
const FavoritesPage = lazy(routeLoaders.favorites);
const SettingsPage = lazy(routeLoaders.settings);
const SubmitPage = lazy(routeLoaders.submit);
const MyPdfsPage = lazy(routeLoaders.myPdfs);
const AdminDocumentsPage = lazy(routeLoaders.adminDocuments);
const AdminStatsPage = lazy(routeLoaders.adminStats);
const LoginPage = lazy(routeLoaders.login);
const RegisterPage = lazy(routeLoaders.register);

const RouteFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      minHeight: "30vh",
      display: "grid",
      placeItems: "center",
      color: "#667684",
      fontWeight: 600,
    }}
  >
    Загрузка...
  </div>
);

const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

function withSeo(page: React.ReactElement, config: SeoProps) {
  return (
    <>
      <Seo {...config} />
      {page}
    </>
  );
}

const App: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/login"
          element={withSeo(<LoginPage />, {
            title: "Вход",
            description: "Вход в библиотеку PDF.",
            canonicalPath: "/login",
          })}
        />
        <Route
          path="/register"
          element={withSeo(<RegisterPage />, {
            title: "Регистрация",
            description: "Создание аккаунта в библиотеке PDF.",
            canonicalPath: "/register",
          })}
        />

        <Route element={<ProtectedLayout />}>
          <Route
            index
            element={withSeo(<HomePage />, {
              title: "Главная",
              description: "Главная страница библиотеки PDF.",
              noIndex: true,
              canonicalPath: "/",
            })}
          />
          <Route
            path="/search"
            element={withSeo(<SearchResultsPage />, {
              title: "Поиск документов",
              description: "Поиск PDF-документов по каталогу.",
              noIndex: true,
              canonicalPath: "/search",
            })}
          />
          <Route
            path="/catalog"
            element={withSeo(<BrowsePage />, {
              title: "Каталог",
              description: "Просмотр каталога PDF-документов.",
              noIndex: true,
              canonicalPath: "/catalog",
            })}
          />
          <Route
            path="/favorites"
            element={withSeo(<FavoritesPage />, {
              title: "Избранное",
              description: "Избранные документы пользователя.",
              noIndex: true,
              canonicalPath: "/favorites",
            })}
          />
          <Route
            path="/settings"
            element={withSeo(<SettingsPage />, {
              title: "Настройки",
              description: "Настройки профиля и темы.",
              noIndex: true,
              canonicalPath: "/settings",
            })}
          />
          <Route
            path="/account/pdfs"
            element={withSeo(<MyPdfsPage />, {
              title: "Мои PDF",
              description: "Отправленные пользователем PDF и их статусы.",
              noIndex: true,
              canonicalPath: "/account/pdfs",
            })}
          />
          <Route
            path="/submit"
            element={withSeo(<SubmitPage />, {
              title: "Отправить PDF",
              description: "Отправка документа на модерацию.",
              noIndex: true,
              canonicalPath: "/submit",
            })}
          />
          <Route
            path="/documents/:id"
            element={withSeo(<BookPage />, {
              title: "Документ",
              description: "Просмотр карточки PDF-документа.",
              noIndex: true,
            })}
          />
          <Route
            path="/admin/documents"
            element={withSeo(
              <AdminRoute>
                <AdminDocumentsPage />
              </AdminRoute>,
              {
                title: "Админка: документы",
                description: "Управление каталогом и модерацией документов.",
                noIndex: true,
                canonicalPath: "/admin/documents",
              }
            )}
          />
          <Route
            path="/admin/stats"
            element={withSeo(
              <AdminRoute>
                <AdminStatsPage />
              </AdminRoute>,
              {
                title: "Админка: статистика",
                description: "Статистика библиотеки и активности.",
                noIndex: true,
                canonicalPath: "/admin/stats",
              }
            )}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;

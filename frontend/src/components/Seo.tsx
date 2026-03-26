import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Библиотека ИПС";
const DEFAULT_DESCRIPTION =
  "Электронная библиотека PDF: поиск, каталог, избранное и управление документами.";

export type SeoProps = {
  title: string;
  description?: string;
  noIndex?: boolean;
  canonicalPath?: string;
};

function resolveSiteUrl() {
  const envValue = import.meta.env.VITE_SITE_URL as string | undefined;
  if (envValue) {
    return envValue.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return "";
}

const siteUrl = resolveSiteUrl();

const Seo: React.FC<SeoProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  noIndex = false,
  canonicalPath,
}) => {
  const location = useLocation();
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const robots = noIndex ? "noindex,nofollow" : "index,follow";

  const canonicalUrl = useMemo(() => {
    if (!siteUrl) {
      return "";
    }

    const routePath = canonicalPath ?? `${location.pathname}${location.search}`;
    const normalizedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;

    return new URL(normalizedPath, `${siteUrl}/`).toString();
  }, [canonicalPath, location.pathname, location.search]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default Seo;

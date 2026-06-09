import React from "react";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Seo from "./Seo";

describe("Seo", () => {
  afterEach(cleanup);

  it("sets document title and meta tags", () => {
    render(
      <MemoryRouter>
        <Seo title="Test Title" description="Test Description" />
      </MemoryRouter>
    );

    expect(document.title).toBe("Test Title | Библиотека ИПС");

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute("content", "Test Description");

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle).toHaveAttribute("content", "Test Title | Библиотека ИПС");

    const ogDescription = document.querySelector('meta[property="og:description"]');
    expect(ogDescription).toHaveAttribute("content", "Test Description");
  });

  it("uses default title and description if not provided", () => {
    render(
      <MemoryRouter>
        <Seo title="Библиотека ИПС" />
      </MemoryRouter>
    );

    expect(document.title).toBe("Библиотека ИПС");

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute(
      "content",
      "Электронная библиотека PDF: поиск, каталог, избранное и управление документами."
    );
  });
});

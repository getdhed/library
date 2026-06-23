import "@testing-library/jest-dom/vitest";

if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:fake-url";
  URL.revokeObjectURL = () => {};
}

import React from "react";
import { vi } from "vitest";

vi.mock("recharts", async () => {
  const OriginalModule = await vi.importActual("recharts");
  return {
    ...OriginalModule as any,
    ResponsiveContainer: ({ children }: any) => 
      React.createElement("div", { style: { width: 800, height: 400 } }, children),
  };
});
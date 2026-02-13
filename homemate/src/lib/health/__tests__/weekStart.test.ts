import { describe, expect, it } from "vitest";

import { getWeekStartMonday } from "../week";

describe("getWeekStartMonday", () => {
  it("returns Monday for a Monday date", () => {
    expect(getWeekStartMonday("2026-02-09")).toBe("2026-02-09");
  });

  it("returns previous Monday for a midweek date", () => {
    expect(getWeekStartMonday("2026-02-11")).toBe("2026-02-09");
  });

  it("returns previous Monday for a Sunday date", () => {
    expect(getWeekStartMonday("2026-02-15")).toBe("2026-02-09");
  });
});

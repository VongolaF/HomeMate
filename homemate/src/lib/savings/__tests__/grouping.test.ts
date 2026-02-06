import { describe, expect, it } from "vitest";
import { groupGoalsByHorizon } from "../grouping";

describe("groupGoalsByHorizon", () => {
  it("groups goals by deadline horizon", () => {
    const result = groupGoalsByHorizon([
      { id: "1", deadline: "2026-06-01" },
      { id: "2", deadline: "2027-01-01" },
      { id: "3", deadline: null },
    ]);
    expect(result.shortTerm).toHaveLength(1);
    expect(result.longTerm).toHaveLength(1);
    expect(result.noDeadline).toHaveLength(1);
  });
});

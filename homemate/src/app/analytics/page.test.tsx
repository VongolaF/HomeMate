import { render, screen } from "@testing-library/react";
import AnalyticsPage from "./page";

describe("AnalyticsPage", () => {
  it("renders analytics title", () => {
    render(<AnalyticsPage />);
    expect(screen.getByText("统计报表")).toBeInTheDocument();
  });
});

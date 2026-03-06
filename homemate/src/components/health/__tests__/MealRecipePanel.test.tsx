import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";

import HealthPage from "@/app/health/page";

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const getUserMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const buildMealPayload = (date: string) => ({
  weekPlan: { id: "week-1" },
  dayPlans: [
    {
      date,
      breakfast: "燕麦酸奶杯",
      lunch: "鸡胸肉沙拉",
      dinner: "清蒸鱼",
      snacks: "坚果",
      breakfast_recipe: {
        name: "燕麦酸奶杯",
        ingredients: ["燕麦 30g", "希腊酸奶 150g", "蓝莓 30g"],
        steps: ["混合燕麦与酸奶", "加入蓝莓", "冷藏 10 分钟"],
        tips: "可加少量蜂蜜调味",
      },
    },
  ],
});

const buildWorkoutPayload = () => ({
  weekPlan: null,
  dayPlans: [],
});

const makeResponse = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);

describe("Meal recipe panel", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "token-1",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });

    refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "token-1",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    maybeSingleMock.mockResolvedValue({ data: { health_goal: "balanced" }, error: null });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock, update: vi.fn() });

    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const urlString = url.toString();
      const parsed = new URL(urlString, "http://localhost");
      const requestedWeekStart = parsed.searchParams.get("weekStart") ?? "";
      if (urlString.includes("/api/health/meal")) {
        return makeResponse(buildMealPayload(requestedWeekStart));
      }
      if (urlString.includes("/api/health/workout")) {
        return makeResponse(buildWorkoutPayload());
      }
      return makeResponse({});
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows recipe panel when a meal slot is selected", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(document.querySelector(".ant-skeleton")).toBeNull();
    });

    const breakfastButtons = await screen.findAllByText("燕麦酸奶杯");
    fireEvent.click(breakfastButtons[0]);

    expect(await screen.findByText(/早餐食谱/)).toBeInTheDocument();
    expect(screen.getAllByText("燕麦酸奶杯").length).toBeGreaterThan(0);
    expect(screen.getByText("燕麦 30g")).toBeInTheDocument();
    expect(screen.getByText("混合燕麦与酸奶")).toBeInTheDocument();
  });
});

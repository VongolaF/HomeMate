import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

vi.mock("antd-img-crop", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

const pushMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();
const storageFromMock = vi.fn();
const createSignedUrlMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@example.com" },
    loading: false,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    storage: {
      from: (...args: unknown[]) => storageFromMock(...args),
    },
    auth: {
      signOut: vi.fn(),
    },
  },
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    fromMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    maybeSingleMock.mockReset();
    storageFromMock.mockReset();
    createSignedUrlMock.mockReset();

    maybeSingleMock.mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "Test User",
        base_currency: "CNY",
        username: "tester",
      },
      error: null,
    });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://example.com/avatar.png" },
      error: null,
    });
    storageFromMock.mockReturnValue({ createSignedUrl: createSignedUrlMock });
  });

  it("navigates back to home when clicking the back button", async () => {
    render(<ProfilePage />);

    const backButton = await screen.findByRole("button", { name: /返回首页/ });
    fireEvent.click(backButton);

    expect(pushMock).toHaveBeenCalledWith("/");
  }, 10000);
});

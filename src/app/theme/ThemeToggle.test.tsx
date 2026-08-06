import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WindowThemeGateway } from "@core/appearance";
import { ThemeProvider } from "@app/theme/ThemeProvider";
import { ThemeToggle } from "@app/theme/ThemeToggle";
import { THEME_STORAGE_KEY } from "@app/theme/theme";
import { installMatchMediaMock } from "../../test/install-match-media-mock";

beforeEach(() => {
  installMatchMediaMock();
});

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
});

describe("ThemeToggle", () => {
  it("sets and persists an explicit dark theme", async () => {
    const setTheme = vi.fn<WindowThemeGateway["setTheme"]>().mockResolvedValue();

    render(
      <ThemeProvider windowThemeGateway={{ setTheme }}>
        <ThemeToggle
          messages={{
            switchToDark: "Switch to dark mode",
            switchToLight: "Switch to light mode",
          }}
        />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("button", {
      name: "Switch to dark mode",
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(setTheme).toHaveBeenLastCalledWith("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  });
});

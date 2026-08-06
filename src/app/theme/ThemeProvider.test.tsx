import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WindowThemeGateway } from "@core/appearance";
import { ThemeProvider } from "@app/theme/ThemeProvider";
import { useTheme } from "@app/theme/use-theme";
import { THEME_STORAGE_KEY } from "@app/theme/theme";

function ThemeConsumer() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <span>{`${preference}:${resolvedTheme}`}</span>
      <button type="button" onClick={() => setPreference("dark")}>Use dark</button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
});

describe("ThemeProvider", () => {
  it("persists an explicit theme and updates the document", async () => {
    const setTheme = vi.fn<WindowThemeGateway["setTheme"]>().mockResolvedValue();

    render(
      <ThemeProvider windowThemeGateway={{ setTheme }}>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    screen.getByRole("button", { name: "Use dark" }).click();

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
    expect(document.documentElement).toHaveAttribute(
      "data-theme-preference",
      "dark",
    );
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByText("dark:dark")).toBeVisible();
    expect(setTheme).toHaveBeenLastCalledWith("dark");
  });
});

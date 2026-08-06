import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LocalizationProvider } from "@app/localization/LocalizationProvider";
import { useLocalization } from "@app/localization/use-localization";
import { LOCALE_STORAGE_KEY } from "@app/localization/locale";

function LocalizationConsumer() {
  const { locale, messages, setLocale } = useLocalization();
  return (
    <div>
      <span>{locale}</span>
      <strong>{messages.projectHub.openProjectTitle}</strong>
      <button type="button" onClick={() => setLocale("ja")}>Use Japanese</button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "en";
});

describe("LocalizationProvider", () => {
  it("switches complete typed catalogs and persists the locale", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    render(
      <LocalizationProvider>
        <LocalizationConsumer />
      </LocalizationProvider>,
    );

    expect(screen.getByText("Open a project")).toBeVisible();
    screen.getByRole("button", { name: "Use Japanese" }).click();

    expect(await screen.findByText("プロジェクトを開く")).toBeVisible();
    await waitFor(() => expect(document.documentElement.lang).toBe("ja"));
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ja");
  });
});

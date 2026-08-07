import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import type { ThemeToggleMessages } from "@app/theme/theme-toggle-messages";
import { useTheme } from "@app/theme/use-theme";

interface ThemeToggleProps {
  readonly messages: ThemeToggleMessages;
}

export function ThemeToggle({ messages }: ThemeToggleProps) {
  const { resolvedTheme, setPreference } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? messages.switchToLight : messages.switchToDark;

  return (
    <IconButton
      aria-label={label}
      onClick={() => {
        setPreference(isDark ? "light" : "dark");
      }}
    >
      <Icon aria-hidden="true" name={isDark ? "sun" : "moon"} size={20} />
    </IconButton>
  );
}

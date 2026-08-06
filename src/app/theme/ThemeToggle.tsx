import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@shared/components/button";
import type { ThemeToggleMessages } from "@app/theme/theme-toggle-messages";
import { useTheme } from "@app/theme/use-theme";
import styles from "@app/theme/ThemeToggle.module.css";

interface ThemeToggleProps {
  readonly messages: ThemeToggleMessages;
}

export function ThemeToggle({ messages }: ThemeToggleProps) {
  const { resolvedTheme, setPreference } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? messages.switchToLight : messages.switchToDark;

  return (
    <Button
      aria-label={label}
      className={styles.button}
      onClick={() => {
        setPreference(isDark ? "light" : "dark");
      }}
      size="sm"
      variant="ghost"
    >
      <HugeiconsIcon
        aria-hidden="true"
        icon={isDark ? Sun03Icon : Moon02Icon}
        size={20}
        strokeWidth={1.75}
      />
    </Button>
  );
}

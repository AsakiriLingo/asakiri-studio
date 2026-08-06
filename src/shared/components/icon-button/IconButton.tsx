import { forwardRef, type ReactNode } from "react";
import { Button, type ButtonProps, type ButtonVariant } from "@shared/components/button";
import styles from "@shared/components/icon-button/IconButton.module.css";

export type IconButtonSize = "sm" | "md";
export type IconButtonVariant = Extract<ButtonVariant, "ghost" | "secondary">;

export interface IconButtonProps extends Omit<
  ButtonProps,
  "aria-label" | "children" | "size" | "variant"
> {
  readonly "aria-label": string;
  readonly children: ReactNode;
  readonly size?: IconButtonSize;
  readonly variant?: IconButtonVariant;
}

function requiredStyle(name: string) {
  const className = styles[name];
  if (!className) throw new Error(`Missing IconButton style: ${name}`);
  return className;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: requiredStyle("sm"),
  md: requiredStyle("md"),
};

const rootClass = requiredStyle("root");

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export const IconButton = forwardRef<HTMLElement, IconButtonProps>(function IconButton(
  { "aria-label": ariaLabel, children, className, size = "md", variant = "ghost", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      aria-label={ariaLabel}
      className={(state) =>
        joinClassNames(
          rootClass,
          sizeClasses[size],
          typeof className === "function" ? className(state) : className,
        )
      }
      size={size}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
});

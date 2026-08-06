import { forwardRef } from "react";
import {
  Button as BaseButton,
  type ButtonProps as BaseButtonProps,
  type ButtonState,
} from "@base-ui/react/button";
import styles from "@shared/components/button/Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<BaseButtonProps, "className"> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: BaseButtonProps["className"];
}

function requiredStyle(name: string) {
  const className = styles[name];
  if (!className) throw new Error(`Missing Button style: ${name}`);
  return className;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: requiredStyle("primary"),
  secondary: requiredStyle("secondary"),
  ghost: requiredStyle("ghost"),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: requiredStyle("sm"),
  md: requiredStyle("md"),
  lg: requiredStyle("lg"),
};

const rootClass = requiredStyle("root");

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    className,
    nativeButton = true,
    size = "md",
    type,
    variant = "primary",
    ...props
  },
  ref,
) {
  const resolveClassName = (state: ButtonState) =>
    joinClassNames(
      rootClass,
      variantClasses[variant],
      sizeClasses[size],
      typeof className === "function" ? className(state) : className,
    );

  return (
    <BaseButton
      ref={ref}
      className={resolveClassName}
      nativeButton={nativeButton}
      type={nativeButton ? (type ?? "button") : type}
      {...props}
    />
  );
});

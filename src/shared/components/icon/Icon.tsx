import type { SVGProps } from "react";
import { icons, type IconName } from "@shared/components/icon/icons";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly name: IconName;
  readonly size?: number;
}

export function Icon({ name, size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      {icons[name]}
    </svg>
  );
}

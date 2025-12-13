import { cn } from "@/lib/utils/cn";

export const iconContainerStyles = {
  primary: {
    className: "flex h-10 w-10 items-center justify-center rounded-lg",
    style: {
      backgroundColor: "var(--icon-container-primary-bg)",
      color: "var(--icon-container-primary-text)",
    },
  },
  locked: {
    className: "flex h-10 w-10 items-center justify-center rounded-lg",
    style: {
      backgroundColor: "var(--icon-container-locked-bg)",
      color: "var(--icon-container-locked-text)",
    },
  },
};

export function getIconContainerClasses(variant: "primary" | "locked") {
  return cn(iconContainerStyles[variant].className);
}

export function getIconContainerStyle(variant: "primary" | "locked") {
  return iconContainerStyles[variant].style;
}


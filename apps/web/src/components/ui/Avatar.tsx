"use client";

import {
  forwardRef,
  useState,
  type HTMLAttributes,
} from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type AvatarShape = "circle" | "rounded";
type AvatarStatus = "online" | "offline" | "busy" | "away";

type AvatarSharedProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: AvatarStatus;
};

type AvatarWithImageProps = AvatarSharedProps & {
  src: string;
  alt: string;
  name?: string;
};

type AvatarWithoutImageProps = AvatarSharedProps & {
  src?: undefined;
  alt?: never;
  name: string;
};

export type AvatarProps = AvatarWithImageProps | AvatarWithoutImageProps;

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6 text-xs",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: "rounded-[var(--radius-full)]",
  rounded: "rounded-[var(--radius-lg)]",
};

const statusClasses: Record<AvatarStatus, string> = {
  online: "bg-hp-success",
  offline: "bg-hp-muted",
  busy: "bg-hp-danger",
  away: "bg-hp-warning",
};

const statusSizeClasses: Record<AvatarSize, string> = {
  xs: "size-2",
  sm: "size-2",
  md: "size-3",
  lg: "size-3",
  xl: "size-4",
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "A";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toLocaleUpperCase("pt-BR");
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase(
    "pt-BR",
  );
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  {
    src,
    alt,
    name,
    size = "md",
    shape = "circle",
    status,
    className,
    role,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src && failedSrc !== src);
  const fallbackName = name?.trim() || alt?.trim() || "Avatar";
  const initials = getInitials(fallbackName);
  const classes = [
    "relative inline-flex shrink-0 items-center justify-center border border-hp-border bg-hp-primary-soft font-semibold leading-none text-hp-primary",
    sizeClasses[size],
    shapeClasses[shape],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      {...props}
      role={showImage ? role : (role ?? "img")}
      aria-label={showImage ? ariaLabel : (ariaLabel ?? fallbackName)}
      className={classes}
    >
      {showImage ? (
        // O contrato oficial exige img nativo neste componente.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          onError={() => setFailedSrc(src ?? null)}
          className={`size-full object-cover ${shapeClasses[shape]}`}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-[var(--radius-full)] border-2 border-hp-surface ${statusSizeClasses[size]} ${statusClasses[status]}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

Avatar.displayName = "Avatar";

export default Avatar;

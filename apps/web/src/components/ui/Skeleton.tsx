import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

type SkeletonVariant = "text" | "rectangular" | "circular";
type SkeletonRadius = "none" | "sm" | "md" | "lg" | "full";

export type SkeletonProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  radius?: SkeletonRadius;
  animate?: boolean;
};

const variantClasses: Record<SkeletonVariant, string> = {
  text: "block h-4 w-full",
  rectangular: "block",
  circular: "inline-block aspect-square",
};

const radiusClasses: Record<SkeletonRadius, string> = {
  none: "rounded-[var(--radius-none)]",
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
  full: "rounded-[var(--radius-full)]",
};

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  {
    variant = "rectangular",
    width,
    height,
    radius = "md",
    animate = true,
    className,
    style,
    "aria-hidden": ariaHidden,
    ...props
  },
  ref,
) {
  let resolvedWidth: CSSProperties["width"] = width ?? style?.width;
  let resolvedHeight: CSSProperties["height"] = height ?? style?.height;

  if (variant === "circular") {
    if (width !== undefined && height === undefined) {
      resolvedHeight = width;
    } else if (height !== undefined && width === undefined) {
      resolvedWidth = height;
    } else if (width === undefined && height === undefined) {
      if (style?.width !== undefined && style.height === undefined) {
        resolvedHeight = style.width;
      } else if (style?.height !== undefined && style.width === undefined) {
        resolvedWidth = style.height;
      }
    }
  }

  const resolvedStyle: CSSProperties = {
    ...style,
    width: resolvedWidth,
    height: resolvedHeight,
  };
  const classes = [
    "bg-hp-surface-subtle",
    variantClasses[variant],
    variant === "circular" ? radiusClasses.full : radiusClasses[radius],
    animate
      ? "motion-safe:animate-pulse motion-safe:[animation-duration:var(--duration-slow)] motion-safe:[animation-timing-function:var(--easing-standard)]"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      {...props}
      aria-hidden={ariaHidden ?? true}
      className={classes}
      style={resolvedStyle}
    />
  );
});

Skeleton.displayName = "Skeleton";

export default Skeleton;

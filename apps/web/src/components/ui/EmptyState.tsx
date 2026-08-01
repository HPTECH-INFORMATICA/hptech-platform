import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type EmptyStateSize = "sm" | "md" | "lg";
type EmptyStateAlign = "center" | "start";
type EmptyStateTitleElement = "h2" | "h3" | "p";

export type EmptyStateProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "title"
> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: EmptyStateSize;
  align?: EmptyStateAlign;
  titleAs?: EmptyStateTitleElement;
};

const containerSizeClasses: Record<EmptyStateSize, string> = {
  sm: "gap-3 p-4",
  md: "gap-4 p-6",
  lg: "gap-5 p-8",
};

const iconSizeClasses: Record<EmptyStateSize, string> = {
  sm: "size-10",
  md: "size-12",
  lg: "size-16",
};

const titleSizeClasses: Record<EmptyStateSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

const descriptionSizeClasses: Record<EmptyStateSize, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    {
      title,
      description,
      icon,
      action,
      secondaryAction,
      size = "md",
      align = "center",
      titleAs = "h2",
      className,
      ...props
    },
    ref,
  ) {
    const Title = titleAs;
    const isCentered = align === "center";
    const classes = [
      "flex max-w-[var(--layout-reading-max)] flex-col rounded-[var(--radius-lg)] border border-hp-border bg-hp-surface text-hp-foreground",
      containerSizeClasses[size],
      isCentered ? "mx-auto items-center text-center" : "items-start text-left",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={classes} {...props}>
        {icon && (
          <div
            className={`inline-flex shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-hp-primary-soft text-hp-primary ${iconSizeClasses[size]}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        <div className="space-y-2">
          <Title
            className={`${titleSizeClasses[size]} font-semibold leading-[var(--line-height-heading)] text-hp-foreground`}
          >
            {title}
          </Title>

          {description && (
            <p
              className={`${descriptionSizeClasses[size]} leading-[var(--line-height-normal)] text-hp-muted`}
            >
              {description}
            </p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
              isCentered ? "sm:justify-center" : "sm:justify-start"
            }`}
          >
            {action && <div>{action}</div>}
            {secondaryAction && (
              <div className="text-hp-muted">{secondaryAction}</div>
            )}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export default EmptyState;

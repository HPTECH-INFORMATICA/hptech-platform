import {
  forwardRef,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type SectionProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  titleAs?: "h2" | "h3";
};

const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  {
    title,
    description,
    actions,
    children,
    titleAs = "h2",
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref,
) {
  const generatedHeadingId = useId();
  const Heading = titleAs;
  const hasTitle = title !== undefined && title !== null;
  const hasDescription = description !== undefined && description !== null;
  const hasActions = actions !== undefined && actions !== null;
  const hasExplicitAccessibleName =
    ariaLabelledBy !== undefined || ariaLabel !== undefined;
  const headingId = hasTitle && !hasExplicitAccessibleName
    ? generatedHeadingId
    : undefined;
  const resolvedAriaLabelledBy = ariaLabelledBy ?? headingId;
  const hasHeader = hasTitle || hasDescription || hasActions;
  const classes = ["min-w-0 max-w-full space-y-6", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={resolvedAriaLabelledBy}
      className={classes}
      {...props}
    >
      {hasHeader ? (
        <header className="flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {hasTitle ? (
              <Heading
                id={headingId}
                className="break-words text-2xl font-semibold leading-[var(--line-height-heading)] text-hp-foreground"
              >
                {title}
              </Heading>
            ) : null}

            {hasDescription ? (
              <div className="min-w-0 break-words text-sm leading-[var(--line-height-normal)] text-hp-muted">
                {description}
              </div>
            ) : null}
          </div>

          {hasActions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      {children}
    </section>
  );
});

Section.displayName = "Section";

export default Section;

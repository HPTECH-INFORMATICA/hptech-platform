import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  titleAs?: "h1" | "h2";
};

const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader(
    {
      title,
      description,
      breadcrumb,
      metadata,
      actions,
      titleAs = "h1",
      className,
      ...props
    },
    ref,
  ) {
    const Heading = titleAs;
    const classes = ["min-w-0 max-w-full space-y-4", className]
      .filter(Boolean)
      .join(" ");

    return (
      <header ref={ref} className={classes} {...props}>
        {breadcrumb ? <div className="min-w-0">{breadcrumb}</div> : null}

        <div className="flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Heading className="break-words text-3xl font-semibold leading-tight text-hp-foreground">
              {title}
            </Heading>

            {description ? (
              <div className="min-w-0 break-words text-sm text-hp-muted">
                {description}
              </div>
            ) : null}

            {metadata ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-hp-muted">
                {metadata}
              </div>
            ) : null}
          </div>

          {actions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  },
);

PageHeader.displayName = "PageHeader";

export default PageHeader;

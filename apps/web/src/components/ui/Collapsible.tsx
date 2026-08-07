"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type CollapsibleProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
};

export type CollapsibleTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type CollapsibleContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  forceMount?: boolean;
};

type CollapsibleContextValue = {
  open: boolean;
  disabled: boolean;
  contentId: string;
  triggerId: string;
  toggle: () => void;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext(componentName: string) {
  const context = useContext(CollapsibleContext);

  if (context === null) {
    throw new Error(
      `${componentName} deve ser utilizado dentro de Collapsible.`,
    );
  }

  return context;
}

export default function Collapsible({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  ...props
}: CollapsibleProps) {
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;
  const contentId = useId();
  const triggerId = useId();

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (disabled || nextOpen === resolvedOpen) return;

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [disabled, isControlled, onOpenChange, resolvedOpen],
  );

  const toggle = useCallback(() => {
    requestOpenChange(!resolvedOpen);
  }, [requestOpenChange, resolvedOpen]);

  const contextValue = useMemo<CollapsibleContextValue>(
    () => ({
      open: resolvedOpen,
      disabled,
      contentId,
      triggerId,
      toggle,
    }),
    [contentId, disabled, resolvedOpen, toggle, triggerId],
  );

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div
        {...props}
        data-state={resolvedOpen ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        className={["min-w-0", className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export const CollapsibleTrigger = forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(function CollapsibleTrigger(
  {
    children,
    type = "button",
    disabled: disabledProp,
    className,
    onClick,
    ...props
  },
  forwardedRef,
) {
  const { open, disabled, contentId, triggerId, toggle } =
    useCollapsibleContext("CollapsibleTrigger");

  const resolvedDisabled = disabled || Boolean(disabledProp);

  const classes = [
    "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center gap-[var(--space-2)] rounded-[var(--collapsible-trigger-radius)] px-[var(--collapsible-trigger-padding-x)] py-[var(--collapsible-trigger-padding-y)] text-sm font-medium text-[var(--collapsible-foreground)] outline-none transition-colors hover:bg-[var(--collapsible-trigger-hover)] focus-visible:bg-[var(--collapsible-trigger-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={forwardedRef}
      {...props}
      id={triggerId}
      type={type}
      disabled={resolvedDisabled}
      aria-expanded={open}
      aria-controls={contentId}
      data-state={open ? "open" : "closed"}
      className={classes}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented || resolvedDisabled) return;

        toggle();
      }}
    >
      {children}
    </button>
  );
});

CollapsibleTrigger.displayName = "CollapsibleTrigger";

export const CollapsibleContent = forwardRef<
  HTMLDivElement,
  CollapsibleContentProps
>(function CollapsibleContent(
  { children, forceMount = false, className, ...props },
  forwardedRef,
) {
  const { open, contentId, triggerId } =
    useCollapsibleContext("CollapsibleContent");

  if (!open && !forceMount) return null;

  return (
    <div
      ref={forwardedRef}
      {...props}
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      hidden={!open}
      data-state={open ? "open" : "closed"}
      className={[
        "min-w-0 text-[var(--collapsible-content-foreground)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
});

CollapsibleContent.displayName = "CollapsibleContent";
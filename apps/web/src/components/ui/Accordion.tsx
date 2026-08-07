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
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

export type AccordionType = "single" | "multiple";

export type AccordionProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "defaultValue" | "onChange"
> & {
  children: ReactNode;
  type?: AccordionType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  loop?: boolean;
};

export type AccordionItemProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  value: string;
  disabled?: boolean;
};

export type AccordionTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type AccordionContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

type AccordionContextValue = {
  type: AccordionType;
  openValues: string[];
  collapsible: boolean;
  loop: boolean;
  toggleValue: (value: string) => void;
};

type AccordionItemContextValue = {
  value: string;
  disabled: boolean;
  open: boolean;
  triggerId: string;
  contentId: string;
};

const AccordionContext =
  createContext<AccordionContextValue | null>(null);
const AccordionItemContext =
  createContext<AccordionItemContextValue | null>(null);

function useAccordionContext(componentName: string) {
  const context = useContext(AccordionContext);

  if (context === null) {
    throw new Error(
      `${componentName} deve ser utilizado dentro de Accordion.`,
    );
  }

  return context;
}

function useAccordionItemContext(componentName: string) {
  const context = useContext(AccordionItemContext);

  if (context === null) {
    throw new Error(
      `${componentName} deve ser utilizado dentro de AccordionItem.`,
    );
  }

  return context;
}

function normalizeValues(
  type: AccordionType,
  value: string | string[] | undefined,
): string[] {
  if (type === "multiple") {
    return Array.isArray(value)
      ? Array.from(new Set(value))
      : value
        ? [value]
        : [];
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? [value[0]] : [];
  }

  return value ? [value] : [];
}

export default function Accordion({
  children,
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = false,
  loop = true,
  className,
  ...props
}: AccordionProps) {
  const [isControlled] = useState(() => value !== undefined);
  const [uncontrolledValues, setUncontrolledValues] = useState<string[]>(() =>
    normalizeValues(type, defaultValue),
  );

  const openValues = isControlled
    ? normalizeValues(type, value)
    : uncontrolledValues;

  const publish = useCallback(
    (nextValues: string[]) => {
      const normalized =
        type === "single"
          ? nextValues.slice(0, 1)
          : Array.from(new Set(nextValues));

      if (!isControlled) {
        setUncontrolledValues(normalized);
      }

      onValueChange?.(
        type === "single"
          ? (normalized[0] ?? "")
          : normalized,
      );
    },
    [isControlled, onValueChange, type],
  );

  const toggleValue = useCallback(
    (itemValue: string) => {
      const isOpen = openValues.includes(itemValue);

      if (type === "multiple") {
        publish(
          isOpen
            ? openValues.filter((candidate) => candidate !== itemValue)
            : [...openValues, itemValue],
        );
        return;
      }

      if (isOpen) {
        if (collapsible) {
          publish([]);
        }
        return;
      }

      publish([itemValue]);
    },
    [collapsible, openValues, publish, type],
  );

  const contextValue = useMemo<AccordionContextValue>(
    () => ({
      type,
      openValues,
      collapsible,
      loop,
      toggleValue,
    }),
    [collapsible, loop, openValues, toggleValue, type],
  );

  const classes = [
    "w-full divide-y divide-[var(--accordion-border)] rounded-[var(--accordion-radius)] border border-[var(--accordion-border)] bg-[var(--accordion-background)] text-[var(--accordion-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AccordionContext.Provider value={contextValue}>
      <div
        {...props}
        className={classes}
        data-accordion-type={type}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export const AccordionItem = forwardRef<
  HTMLDivElement,
  AccordionItemProps
>(function AccordionItem(
  {
    children,
    value,
    disabled = false,
    className,
    ...props
  },
  forwardedRef,
) {
  const { openValues } = useAccordionContext("AccordionItem");
  const generatedId = useId();
  const triggerId = `accordion-trigger-${generatedId}`;
  const contentId = `accordion-content-${generatedId}`;
  const open = openValues.includes(value);

  const contextValue = useMemo<AccordionItemContextValue>(
    () => ({
      value,
      disabled,
      open,
      triggerId,
      contentId,
    }),
    [contentId, disabled, open, triggerId, value],
  );

  const classes = [
    "min-w-0",
    disabled ? "opacity-60" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AccordionItemContext.Provider value={contextValue}>
      <div
        ref={forwardedRef}
        {...props}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        className={classes}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});

AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(function AccordionTrigger(
  {
    children,
    type = "button",
    className,
    onClick,
    onKeyDown,
    ...props
  },
  forwardedRef,
) {
  const { loop, toggleValue } =
    useAccordionContext("AccordionTrigger");
  const {
    value,
    disabled,
    open,
    triggerId,
    contentId,
  } = useAccordionItemContext("AccordionTrigger");

  const moveFocus = useCallback(
    (
      current: HTMLButtonElement,
      direction: "next" | "previous" | "first" | "last",
    ) => {
      const ownerDocument = current.ownerDocument;
      const triggers = Array.from(
        ownerDocument.querySelectorAll<HTMLButtonElement>(
          '[data-accordion-trigger]:not([disabled])',
        ),
      ).filter((trigger) => trigger.isConnected);

      if (triggers.length === 0) return;

      const currentIndex = triggers.indexOf(current);

      let targetIndex = currentIndex;

      if (direction === "first") {
        targetIndex = 0;
      } else if (direction === "last") {
        targetIndex = triggers.length - 1;
      } else if (direction === "next") {
        targetIndex = currentIndex + 1;
      } else {
        targetIndex = currentIndex - 1;
      }

      if (loop) {
        targetIndex =
          (targetIndex + triggers.length) % triggers.length;
      } else {
        targetIndex = Math.min(
          Math.max(targetIndex, 0),
          triggers.length - 1,
        );
      }

      triggers[targetIndex]?.focus({ preventScroll: true });
    },
    [loop],
  );

  const classes = [
    "flex min-h-[var(--layout-touch-target)] w-full items-center justify-between gap-[var(--space-3)] px-[var(--accordion-trigger-padding-x)] py-[var(--accordion-trigger-padding-y)] text-left text-sm font-medium outline-none transition-colors hover:bg-[var(--accordion-trigger-hover)] focus-visible:bg-[var(--accordion-trigger-focus)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)] disabled:cursor-not-allowed",
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
      disabled={disabled}
      aria-expanded={open}
      aria-controls={contentId}
      data-accordion-trigger
      data-state={open ? "open" : "closed"}
      className={classes}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented || disabled) return;

        toggleValue(value);
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || disabled) return;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveFocus(event.currentTarget, "next");
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(event.currentTarget, "previous");
        } else if (event.key === "Home") {
          event.preventDefault();
          moveFocus(event.currentTarget, "first");
        } else if (event.key === "End") {
          event.preventDefault();
          moveFocus(event.currentTarget, "last");
        }
      }}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span
        aria-hidden="true"
        className="shrink-0 text-[var(--accordion-icon-color)] transition-transform duration-200 data-[state=open]:rotate-180"
        data-state={open ? "open" : "closed"}
      >
        ▾
      </span>
    </button>
  );
});

AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(function AccordionContent(
  {
    children,
    className,
    role,
    ...props
  },
  forwardedRef,
) {
  const {
    disabled,
    open,
    triggerId,
    contentId,
  } = useAccordionItemContext("AccordionContent");

  if (!open) return null;

  const classes = [
    "min-w-0 px-[var(--accordion-content-padding-x)] pb-[var(--accordion-content-padding-bottom)] text-sm text-[var(--accordion-content-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={forwardedRef}
      {...props}
      id={contentId}
      role={role ?? "region"}
      aria-labelledby={triggerId}
      aria-disabled={disabled || undefined}
      data-state="open"
      className={classes}
    >
      {children}
    </div>
  );
});

AccordionContent.displayName = "AccordionContent";
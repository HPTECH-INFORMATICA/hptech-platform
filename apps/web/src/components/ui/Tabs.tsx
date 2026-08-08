"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type TabsOrientation = "horizontal" | "vertical";
export type TabsActivationMode = "automatic" | "manual";

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  activationMode?: TabsActivationMode;
  loop?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export type TabsListProps = HTMLAttributes<HTMLDivElement>;

export type TabsTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> & {
  value: string;
};

export type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
  forceMount?: boolean;
};

type TriggerRecord = {
  value: string;
  element: HTMLButtonElement;
  disabled: boolean;
};

type TabsContextValue = {
  value: string | undefined;
  orientation: TabsOrientation;
  activationMode: TabsActivationMode;
  loop: boolean;
  disabled: boolean;
  baseId: string;
  requestValueChange: (value: string) => void;
  registerTrigger: (
    value: string,
    element: HTMLButtonElement,
    disabled: boolean,
  ) => () => void;
  moveFocus: (
    currentValue: string,
    direction: "next" | "previous" | "first" | "last",
  ) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string) {
  const context = useContext(TabsContext);

  if (context === null) {
    throw new Error(`${componentName} deve ser utilizado dentro de Tabs.`);
  }

  return context;
}

export default function Tabs({
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  activationMode = "automatic",
  loop = true,
  disabled = false,
  children,
  className,
  ...props
}: TabsProps) {
  const [isControlled] = useState(() => value !== undefined);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const triggersRef = useRef<TriggerRecord[]>([]);
  const baseId = useId();

  const resolvedValue = isControlled ? value : uncontrolledValue;

  const requestValueChange = useCallback(
    (nextValue: string) => {
      if (disabled || nextValue === resolvedValue) return;

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [disabled, isControlled, onValueChange, resolvedValue],
  );

  const registerTrigger = useCallback(
    (
      triggerValue: string,
      element: HTMLButtonElement,
      triggerDisabled: boolean,
    ) => {
      const record = {
        value: triggerValue,
        element,
        disabled: triggerDisabled,
      };

      triggersRef.current = [...triggersRef.current, record];

      return () => {
        triggersRef.current = triggersRef.current.filter(
          (item) => item !== record,
        );
      };
    },
    [],
  );

  const moveFocus = useCallback(
    (
      currentValue: string,
      direction: "next" | "previous" | "first" | "last",
    ) => {
      const enabled = triggersRef.current
        .filter((item) => !item.disabled)
        .sort((a, b) => {
          if (a.element === b.element) return 0;

          const position = a.element.compareDocumentPosition(b.element);

          return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });

      if (enabled.length === 0) return;

      const currentIndex = enabled.findIndex(
        (item) => item.value === currentValue,
      );

      let target: TriggerRecord | undefined;

      if (direction === "first") {
        target = enabled[0];
      } else if (direction === "last") {
        target = enabled[enabled.length - 1];
      } else if (direction === "next") {
        const nextIndex = currentIndex + 1;

        target =
          enabled[nextIndex] ??
          (loop ? enabled[0] : enabled[currentIndex]);
      } else {
        const previousIndex = currentIndex - 1;

        target =
          enabled[previousIndex] ??
          (loop ? enabled[enabled.length - 1] : enabled[currentIndex]);
      }

      if (!target) return;

      target.element.focus();

      if (activationMode === "automatic") {
        requestValueChange(target.value);
      }
    },
    [activationMode, loop, requestValueChange],
  );

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: resolvedValue,
      orientation,
      activationMode,
      loop,
      disabled,
      baseId,
      requestValueChange,
      registerTrigger,
      moveFocus,
    }),
    [
      activationMode,
      baseId,
      disabled,
      loop,
      moveFocus,
      orientation,
      registerTrigger,
      requestValueChange,
      resolvedValue,
    ],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        {...props}
        data-orientation={orientation}
        data-disabled={disabled ? "" : undefined}
        className={["min-w-0", className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  function TabsList({ className, ...props }, forwardedRef) {
    const { orientation } = useTabsContext("TabsList");

    return (
      <div
        ref={forwardedRef}
        {...props}
        role="tablist"
        aria-orientation={orientation}
        data-orientation={orientation}
        className={[
          "inline-flex min-w-0 gap-[var(--tabs-list-gap)] rounded-[var(--tabs-list-radius)] bg-[var(--tabs-list-background)] p-[var(--tabs-list-padding)]",
          orientation === "vertical" ? "flex-col items-stretch" : "items-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);

TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  function TabsTrigger(
    {
      value: triggerValue,
      disabled: disabledProp,
      className,
      onClick,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) {
    const {
      value,
      orientation,
      activationMode,
      disabled,
      baseId,
      requestValueChange,
      registerTrigger,
      moveFocus,
    } = useTabsContext("TabsTrigger");

    const selected = value === triggerValue;
    const resolvedDisabled = disabled || Boolean(disabledProp);
    const triggerId = `${baseId}-trigger-${triggerValue}`;
    const contentId = `${baseId}-content-${triggerValue}`;

    const setRefs = useCallback(
      (element: HTMLButtonElement | null) => {
        if (typeof forwardedRef === "function") {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
      },
      [forwardedRef],
    );

      const [triggerElement, setTriggerElement] =
      useState<HTMLButtonElement | null>(null);

    useEffect(() => {
      if (!triggerElement) return;

      return registerTrigger(
        triggerValue,
        triggerElement,
        resolvedDisabled,
      );
    }, [
      registerTrigger,
      resolvedDisabled,
      triggerElement,
      triggerValue,
    ]);

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const previousKey =
        orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const nextKey =
        orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

      if (event.key === previousKey) {
        event.preventDefault();
        moveFocus(triggerValue, "previous");
      } else if (event.key === nextKey) {
        event.preventDefault();
        moveFocus(triggerValue, "next");
      } else if (event.key === "Home") {
        event.preventDefault();
        moveFocus(triggerValue, "first");
      } else if (event.key === "End") {
        event.preventDefault();
        moveFocus(triggerValue, "last");
      } else if (
        activationMode === "manual" &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        requestValueChange(triggerValue);
      }
    };

    return (
      <button
        ref={(element) => {
          setRefs(element);
          setTriggerElement(element);
        }}
        {...props}
        id={triggerId}
        type="button"
        role="tab"
        aria-selected={selected}
        aria-controls={contentId}
        disabled={resolvedDisabled}
        tabIndex={selected ? 0 : -1}
        data-state={selected ? "active" : "inactive"}
        className={[
          "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--tabs-trigger-radius)] px-[var(--tabs-trigger-padding-x)] py-[var(--tabs-trigger-padding-y)] text-sm font-medium text-[var(--tabs-trigger-foreground)] outline-none transition-colors hover:bg-[var(--tabs-trigger-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:bg-[var(--tabs-trigger-active-background)] data-[state=active]:text-[var(--tabs-trigger-active-foreground)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented || resolvedDisabled) return;

          requestValueChange(triggerValue);
        }}
        onKeyDown={handleKeyDown}
      />
    );
  },
);

TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  function TabsContent(
    { value: contentValue, forceMount = false, className, ...props },
    forwardedRef,
  ) {
    const { value, baseId } = useTabsContext("TabsContent");
    const selected = value === contentValue;

    if (!selected && !forceMount) return null;

    return (
      <div
        ref={forwardedRef}
        {...props}
        id={`${baseId}-content-${contentValue}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-trigger-${contentValue}`}
        tabIndex={0}
        hidden={!selected}
        data-state={selected ? "active" : "inactive"}
        className={[
          "mt-[var(--tabs-content-gap)] min-w-0 rounded-[var(--tabs-content-radius)] text-[var(--tabs-content-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);

TabsContent.displayName = "TabsContent";
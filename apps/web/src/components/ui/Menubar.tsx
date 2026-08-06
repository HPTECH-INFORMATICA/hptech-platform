"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSeparatorProps,
  type DropdownMenuTriggerProps,
} from "@/components/ui/DropdownMenu";

export type MenubarProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "defaultValue" | "onChange"
> & {
  children: ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  loop?: boolean;
};

export type MenubarMenuProps = {
  children: ReactNode;
  value?: string;
};

export type MenubarTriggerProps = DropdownMenuTriggerProps;

export type MenubarContentProps = DropdownMenuContentProps;

export type MenubarItemProps = DropdownMenuItemProps;

export type MenubarLabelProps = DropdownMenuLabelProps;

export type MenubarSeparatorProps = DropdownMenuSeparatorProps;

type TriggerRecord = {
  value: string;
  element: HTMLButtonElement;
  disabled: boolean;
};

type MenubarContextValue = {
  activeValue: string | null;
  loop: boolean;
  requestValueChange: (value: string | null) => void;
  registerTrigger: (
    value: string,
    element: HTMLButtonElement,
    disabled: boolean,
  ) => () => void;
  updateTrigger: (
    value: string,
    element: HTMLButtonElement,
    disabled: boolean,
  ) => void;
  moveFocus: (
    currentValue: string,
    direction: "next" | "previous" | "first" | "last",
  ) => void;
};

type MenubarMenuContextValue = {
  value: string;
};

const MenubarContext = createContext<MenubarContextValue | null>(null);
const MenubarMenuContext =
  createContext<MenubarMenuContextValue | null>(null);

function useMenubarContext(componentName: string): MenubarContextValue {
  const context = useContext(MenubarContext);

  if (context === null) {
    throw new Error(`${componentName} deve ser utilizado dentro de Menubar.`);
  }

  return context;
}

function useMenubarMenuContext(
  componentName: string,
): MenubarMenuContextValue {
  const context = useContext(MenubarMenuContext);

  if (context === null) {
    throw new Error(
      `${componentName} deve ser utilizado dentro de MenubarMenu.`,
    );
  }

  return context;
}

function compareDomOrder(
  first: HTMLButtonElement,
  second: HTMLButtonElement,
): number {
  if (first === second) return 0;

  const position = first.compareDocumentPosition(second);

  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;

  return 0;
}

export default function Menubar({
  children,
  value,
  defaultValue = null,
  onValueChange,
  loop = true,
  className,
  role,
  ...props
}: MenubarProps) {
  const [isControlled] = useState(() => value !== undefined);
  const [uncontrolledValue, setUncontrolledValue] =
    useState<string | null>(defaultValue);
  const triggersRef = useRef<TriggerRecord[]>([]);

  const activeValue = isControlled
    ? (value ?? null)
    : uncontrolledValue;

  const requestValueChange = useCallback(
    (nextValue: string | null) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  const registerTrigger = useCallback(
    (
      triggerValue: string,
      element: HTMLButtonElement,
      disabled: boolean,
    ) => {
      const existing = triggersRef.current.find(
        (record) =>
          record.value === triggerValue &&
          record.element === element,
      );

      if (existing) {
        existing.disabled = disabled;
      } else {
        triggersRef.current.push({
          value: triggerValue,
          element,
          disabled,
        });
      }

      return () => {
        triggersRef.current = triggersRef.current.filter(
          (record) =>
            !(
              record.value === triggerValue &&
              record.element === element
            ),
        );
      };
    },
    [],
  );

  const updateTrigger = useCallback(
    (
      triggerValue: string,
      element: HTMLButtonElement,
      disabled: boolean,
    ) => {
      const record = triggersRef.current.find(
        (candidate) =>
          candidate.value === triggerValue &&
          candidate.element === element,
      );

      if (record) {
        record.disabled = disabled;
      }
    },
    [],
  );

  const getEnabledTriggers = useCallback(
    () =>
      triggersRef.current
        .filter(
          (record) =>
            !record.disabled &&
            record.element.isConnected,
        )
        .sort((first, second) =>
          compareDomOrder(first.element, second.element),
        ),
    [],
  );

  const moveFocus = useCallback(
    (
      currentValue: string,
      direction: "next" | "previous" | "first" | "last",
    ) => {
      const triggers = getEnabledTriggers();

      if (triggers.length === 0) return;

      const currentIndex = triggers.findIndex(
        (record) => record.value === currentValue,
      );

      let destinationIndex = 0;

      if (direction === "first") {
        destinationIndex = 0;
      } else if (direction === "last") {
        destinationIndex = triggers.length - 1;
      } else if (direction === "next") {
        destinationIndex =
          currentIndex < 0 ? 0 : currentIndex + 1;
      } else {
        destinationIndex =
          currentIndex < 0
            ? triggers.length - 1
            : currentIndex - 1;
      }

      if (loop) {
        destinationIndex =
          (destinationIndex + triggers.length) %
          triggers.length;
      } else {
        destinationIndex = Math.min(
          Math.max(destinationIndex, 0),
          triggers.length - 1,
        );
      }

      const destination = triggers[destinationIndex];

      if (!destination) return;

      destination.element.focus({ preventScroll: true });

      if (activeValue !== null) {
        requestValueChange(destination.value);
      }
    },
    [
      activeValue,
      getEnabledTriggers,
      loop,
      requestValueChange,
    ],
  );

  const contextValue = useMemo<MenubarContextValue>(
    () => ({
      activeValue,
      loop,
      requestValueChange,
      registerTrigger,
      updateTrigger,
      moveFocus,
    }),
    [
      activeValue,
      loop,
      moveFocus,
      registerTrigger,
      requestValueChange,
      updateTrigger,
    ],
  );

  const classes = [
    "inline-flex min-w-0 items-center gap-[var(--menubar-gap)] rounded-[var(--menubar-radius)] border border-[var(--menubar-border)] bg-[var(--menubar-background)] p-[var(--menubar-padding)] text-[var(--menubar-foreground)] shadow-[var(--menubar-shadow)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MenubarContext.Provider value={contextValue}>
      <div
        {...props}
        role={role ?? "menubar"}
        aria-orientation="horizontal"
        className={classes}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
}

export function MenubarMenu({
  children,
  value,
}: MenubarMenuProps) {
  const generatedValue = useId();
  const resolvedValue = value ?? generatedValue;
  const { activeValue, requestValueChange } =
    useMenubarContext("MenubarMenu");

  const contextValue = useMemo<MenubarMenuContextValue>(
    () => ({ value: resolvedValue }),
    [resolvedValue],
  );

  return (
    <MenubarMenuContext.Provider value={contextValue}>
      <DropdownMenu
        open={activeValue === resolvedValue}
        onOpenChange={(open) => {
          requestValueChange(open ? resolvedValue : null);
        }}
      >
        {children}
      </DropdownMenu>
    </MenubarMenuContext.Provider>
  );
}

export const MenubarTrigger = forwardRef<
  HTMLButtonElement,
  MenubarTriggerProps
>(function MenubarTrigger(
  {
    disabled = false,
    className,
    onKeyDown,
    onPointerEnter,
    onFocus,
    ...props
  },
  forwardedRef,
) {
  const {
    activeValue,
    registerTrigger,
    moveFocus,
    requestValueChange,
  } = useMenubarContext("MenubarTrigger");
  const { value } = useMenubarMenuContext("MenubarTrigger");

  const localRef = useRef<HTMLButtonElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current =
        node === null
          ? null
          : registerTrigger(value, node, disabled);
      localRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [disabled, forwardedRef, registerTrigger, value],
  );

  const classes = [
    "inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--menubar-trigger-radius)] px-[var(--menubar-trigger-padding-x)] py-[var(--menubar-trigger-padding-y)] text-sm font-medium outline-none transition-colors hover:bg-[var(--menubar-trigger-hover)] focus-visible:bg-[var(--menubar-trigger-focus)] data-[state=open]:bg-[var(--menubar-trigger-active)] disabled:pointer-events-none disabled:opacity-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DropdownMenuTrigger
      ref={setRefs}
      {...props}
      disabled={disabled}
      role="menuitem"
      className={classes}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);

        if (
          event.defaultPrevented ||
          disabled ||
          activeValue === null ||
          activeValue === value
        ) {
          return;
        }

        requestValueChange(value);
        event.currentTarget.focus({ preventScroll: true });
      }}
      onFocus={(event) => {
        onFocus?.(event);

        if (
          event.defaultPrevented ||
          disabled ||
          activeValue === null ||
          activeValue === value
        ) {
          return;
        }

        requestValueChange(value);
      }}
      onKeyDown={(
        event: ReactKeyboardEvent<HTMLButtonElement>,
      ) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || disabled) return;

        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveFocus(value, "next");
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveFocus(value, "previous");
        } else if (event.key === "Home") {
          event.preventDefault();
          moveFocus(value, "first");
        } else if (event.key === "End") {
          event.preventDefault();
          moveFocus(value, "last");
        }
      }}
    />
  );
});

MenubarTrigger.displayName = "MenubarTrigger";

export const MenubarContent = forwardRef<
  HTMLDivElement,
  MenubarContentProps
>(function MenubarContent(
  {
    side = "bottom",
    align = "start",
    sideOffset = 6,
    ...props
  },
  forwardedRef,
) {
  return (
    <DropdownMenuContent
      ref={forwardedRef}
      {...props}
      side={side}
      align={align}
      sideOffset={sideOffset}
    />
  );
});

MenubarContent.displayName = "MenubarContent";

export const MenubarItem = forwardRef<
  HTMLButtonElement,
  MenubarItemProps
>(function MenubarItem(props, forwardedRef) {
  return <DropdownMenuItem ref={forwardedRef} {...props} />;
});

MenubarItem.displayName = "MenubarItem";

export const MenubarLabel = forwardRef<
  HTMLDivElement,
  MenubarLabelProps
>(function MenubarLabel(props, forwardedRef) {
  return <DropdownMenuLabel ref={forwardedRef} {...props} />;
});

MenubarLabel.displayName = "MenubarLabel";

export const MenubarSeparator = forwardRef<
  HTMLDivElement,
  MenubarSeparatorProps
>(function MenubarSeparator(props, forwardedRef) {
  return (
    <DropdownMenuSeparator ref={forwardedRef} {...props} />
  );
});

MenubarSeparator.displayName = "MenubarSeparator";
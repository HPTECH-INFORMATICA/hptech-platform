"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import Toggle, {
  type ToggleProps,
  type ToggleSize,
  type ToggleVariant,
} from "@/components/ui/Toggle";

export type ToggleGroupOrientation = "horizontal" | "vertical";

type ToggleGroupSharedProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> & {
  children: ReactNode;
  disabled?: boolean;
  orientation?: ToggleGroupOrientation;
  loop?: boolean;
  variant?: ToggleVariant;
  size?: ToggleSize;
};

export type ToggleGroupSingleProps = ToggleGroupSharedProps & {
  type: "single";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export type ToggleGroupMultipleProps = ToggleGroupSharedProps & {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

export type ToggleGroupItemProps = Omit<
  ToggleProps,
  "pressed" | "defaultPressed" | "onPressedChange"
> & {
  value: string;
};

type RegisteredItem = {
  node: HTMLButtonElement;
  value: string;
  disabled: boolean;
};

type ToggleGroupContextValue = {
  selectedValues: readonly string[];
  disabled: boolean;
  orientation: ToggleGroupOrientation;
  loop: boolean;
  variant: ToggleVariant;
  size: ToggleSize;
  tabStopValue: string | null;
  registerItem: (item: RegisteredItem) => () => void;
  requestItemChange: (value: string, pressed: boolean) => void;
  moveFocus: (currentValue: string, direction: "first" | "last" | "next" | "previous") => void;
  setTabStopValue: (value: string) => void;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext(): ToggleGroupContextValue {
  const context = useContext(ToggleGroupContext);
  if (context === null) {
    throw new Error("ToggleGroupItem deve ser utilizado dentro de ToggleGroup.");
  }
  return context;
}

function getEnabledItems(items: Map<HTMLButtonElement, RegisteredItem>): RegisteredItem[] {
  return Array.from(items.values())
    .filter((item) => !item.disabled && item.node.isConnected)
    .sort((first, second) => {
      const position = first.node.compareDocumentPosition(second.node);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
}

const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  function ToggleGroup(props, forwardedRef) {
    const {
      children,
      disabled = false,
      orientation = "horizontal",
      loop = true,
      variant = "default",
      size = "md",
      className,
      ...nativeProps
    } = props;
    const [isControlled] = useState(() => props.value !== undefined);
    const [uncontrolledValues, setUncontrolledValues] = useState<string[]>(() =>
      props.type === "single"
        ? props.defaultValue
          ? [props.defaultValue]
          : []
        : props.defaultValue ?? [],
    );
    const itemsRef = useRef(new Map<HTMLButtonElement, RegisteredItem>());
    const [itemsRevision, setItemsRevision] = useState(0);
    const [tabStopValue, setTabStopValue] = useState<string | null>(null);

    const selectedValues = useMemo(
      () =>
        isControlled
          ? props.type === "single"
            ? props.value
              ? [props.value]
              : []
            : props.value ?? []
          : uncontrolledValues,
      [isControlled, props.type, props.value, uncontrolledValues],
    );

    const requestItemChange = useCallback(
      (itemValue: string, pressed: boolean) => {
        if (disabled) return;

        if (props.type === "single") {
          const nextValue = pressed ? itemValue : "";
          if (selectedValues[0] === nextValue || (!selectedValues.length && nextValue === "")) return;
          if (!isControlled) setUncontrolledValues(nextValue ? [nextValue] : []);
          props.onValueChange?.(nextValue);
          return;
        }

        const nextValues = pressed
          ? selectedValues.includes(itemValue)
            ? selectedValues
            : [...selectedValues, itemValue]
          : selectedValues.filter((value) => value !== itemValue);
        if (nextValues === selectedValues || nextValues.length === selectedValues.length) return;
        if (!isControlled) setUncontrolledValues(nextValues);
        props.onValueChange?.(nextValues);
      },
      [disabled, isControlled, props, selectedValues],
    );

    const registerItem = useCallback((item: RegisteredItem) => {
      const items = itemsRef.current;
      items.set(item.node, item);
      setItemsRevision((revision) => revision + 1);
      return () => {
        if (items.get(item.node) !== item) return;
        items.delete(item.node);
        setItemsRevision((revision) => revision + 1);
      };
    }, []);

    const moveFocus = useCallback(
      (
        currentValue: string,
        direction: "first" | "last" | "next" | "previous",
      ) => {
        const items = getEnabledItems(itemsRef.current);
        if (items.length === 0) return;

        const currentIndex = items.findIndex((item) => item.value === currentValue);
        let targetIndex = currentIndex;
        if (direction === "first") targetIndex = 0;
        else if (direction === "last") targetIndex = items.length - 1;
        else {
          const step = direction === "next" ? 1 : -1;
          const candidate = currentIndex + step;
          if (candidate < 0 || candidate >= items.length) {
            if (!loop) return;
            targetIndex = candidate < 0 ? items.length - 1 : 0;
          } else {
            targetIndex = candidate;
          }
        }

        const target = items[targetIndex];
        if (!target) return;
        setTabStopValue(target.value);
        target.node.focus({ preventScroll: true });
      },
      [loop],
    );

    useEffect(() => {
      const enabledItems = getEnabledItems(itemsRef.current);
      const currentIsEnabled = enabledItems.some((item) => item.value === tabStopValue);
      if (currentIsEnabled) return;
      const selected = enabledItems.find((item) => selectedValues.includes(item.value));
      setTabStopValue(selected?.value ?? enabledItems[0]?.value ?? null);
    }, [itemsRevision, selectedValues, tabStopValue]);

    const contextValue = useMemo<ToggleGroupContextValue>(
      () => ({
        selectedValues,
        disabled,
        orientation,
        loop,
        variant,
        size,
        tabStopValue,
        registerItem,
        requestItemChange,
        moveFocus,
        setTabStopValue,
      }),
      [
        disabled,
        loop,
        moveFocus,
        orientation,
        registerItem,
        requestItemChange,
        selectedValues,
        size,
        tabStopValue,
        variant,
      ],
    );

    return (
      <ToggleGroupContext.Provider value={contextValue}>
        <div
          ref={forwardedRef}
          {...nativeProps}
          role="group"
          aria-disabled={disabled || undefined}
          data-disabled={disabled ? "" : undefined}
          data-orientation={orientation}
          className={[
            "inline-flex gap-[var(--toggle-group-gap)] rounded-[var(--toggle-group-radius)] bg-[var(--toggle-group-background)] p-[var(--toggle-group-padding)] data-[orientation=vertical]:flex-col",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  },
);

ToggleGroup.displayName = "ToggleGroup";

export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  function ToggleGroupItem(
    {
      value,
      disabled = false,
      variant,
      size,
      onFocus,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) {
    const context = useToggleGroupContext();
    const registerItem = context.registerItem;
    const cleanupRef = useRef<(() => void) | null>(null);
    const resolvedDisabled = context.disabled || disabled;
    const resolvedPressed = context.selectedValues.includes(value);

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current =
          node === null
            ? null
            : registerItem({ node, value, disabled: resolvedDisabled });
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef !== null) forwardedRef.current = node;
      },
      [forwardedRef, registerItem, resolvedDisabled, value],
    );

    const handleKeyboardNavigation = (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || resolvedDisabled) return;

      let direction: "first" | "last" | "next" | "previous" | null = null;
      if (event.key === "Home") direction = "first";
      else if (event.key === "End") direction = "last";
      else if (
        (context.orientation === "horizontal" && event.key === "ArrowRight") ||
        (context.orientation === "vertical" && event.key === "ArrowDown")
      ) {
        direction = "next";
      } else if (
        (context.orientation === "horizontal" && event.key === "ArrowLeft") ||
        (context.orientation === "vertical" && event.key === "ArrowUp")
      ) {
        direction = "previous";
      }

      if (direction === null) return;
      event.preventDefault();
      context.moveFocus(value, direction);
    };

    return (
      <Toggle
        ref={setRefs}
        {...props}
        disabled={resolvedDisabled}
        pressed={resolvedPressed}
        variant={variant ?? context.variant}
        size={size ?? context.size}
        tabIndex={context.tabStopValue === value ? 0 : -1}
        data-orientation={context.orientation}
        onPressedChange={(pressed) => context.requestItemChange(value, pressed)}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented) context.setTabStopValue(value);
        }}
        onKeyDown={handleKeyboardNavigation}
      />
    );
  },
);

ToggleGroupItem.displayName = "ToggleGroupItem";

export default ToggleGroup;

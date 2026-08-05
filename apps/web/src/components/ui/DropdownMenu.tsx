"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type DropdownMenuSide = "top" | "right" | "bottom" | "left";
export type DropdownMenuAlign = "start" | "center" | "end";

export type DropdownMenuProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type DropdownMenuTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type DropdownMenuContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
  sideOffset?: number;
  loop?: boolean;
};

export type DropdownMenuItemSelectEvent = {
  defaultPrevented: boolean;
  preventDefault: () => void;
};

export type DropdownMenuItemProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onSelect"
> & {
  children: ReactNode;
  inset?: boolean;
  variant?: "default" | "danger";
  onSelect?: (event: DropdownMenuItemSelectEvent) => void;
};

export type DropdownMenuLabelProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  inset?: boolean;
};

export type DropdownMenuSeparatorProps = HTMLAttributes<HTMLDivElement>;

type CloseReason =
  | "escape"
  | "interact-outside"
  | "item-select"
  | "trigger-toggle"
  | "tab";

type OpeningFocusTarget = "first" | "last";

type ItemRecord = {
  element: HTMLButtonElement;
  disabled: boolean;
};

type Position = {
  top: number;
  left: number;
  side: DropdownMenuSide;
  align: DropdownMenuAlign;
  sideOffset: number;
  trigger: HTMLButtonElement;
  content: HTMLDivElement;
  container: Element | DocumentFragment;
};

type ScheduledFrame = {
  view: Window;
  handle: number;
};

type ContextValue = {
  resolvedOpen: boolean;
  generatedTriggerId: string;
  contentId: string;
  triggerElement: HTMLButtonElement | null;
  contentElement: HTMLDivElement | null;
  container?: Element | DocumentFragment | null;
  closeOnEscape: boolean;
  closeOnInteractOutside: boolean;
  requestOpenChange: (
    open: boolean,
    reason?: CloseReason,
    openingTarget?: OpeningFocusTarget,
  ) => void;
  consumeOpeningTarget: () => OpeningFocusTarget;
  registerTrigger: (node: HTMLButtonElement) => () => void;
  registerContent: (node: HTMLDivElement) => () => void;
  registerItem: (node: HTMLButtonElement, disabled: boolean) => () => void;
  updateItem: (node: HTMLButtonElement, disabled: boolean) => void;
  getEnabledItems: () => HTMLButtonElement[];
  portalMounted: boolean;
  internalPointerEvents: WeakSet<Event>;
};

const DropdownMenuContext = createContext<ContextValue | null>(null);

const activeMenus = new Map<HTMLDivElement, number>();
let nextMenuOrder = 0;

function registerActiveMenu(content: HTMLDivElement): () => void {
  if (!activeMenus.has(content)) {
    nextMenuOrder += 1;
    activeMenus.set(content, nextMenuOrder);
  }

  return () => {
    activeMenus.delete(content);
  };
}

function hasActiveMenuAbove(content: HTMLDivElement): boolean {
  const order = activeMenus.get(content);

  if (order === undefined) return false;

  for (const candidateOrder of activeMenus.values()) {
    if (candidateOrder > order) return true;
  }

  return false;
}

function useDropdownMenuContext(name: string): ContextValue {
  const value = useContext(DropdownMenuContext);

  if (value === null) {
    throw new Error(`${name} deve ser utilizado dentro de DropdownMenu.`);
  }

  return value;
}

function createsFixedContainingBlock(element: Element): boolean {
  const styles = element.ownerDocument.defaultView?.getComputedStyle(element);

  if (!styles) return false;

  const backdropFilter =
    styles.getPropertyValue("backdrop-filter") ||
    styles.getPropertyValue("-webkit-backdrop-filter");
  const contain = styles.contain.split(/\s+/);
  const willChange = styles.willChange
    .split(",")
    .map((value) => value.trim());

  return (
    styles.transform !== "none" ||
    styles.perspective !== "none" ||
    styles.filter !== "none" ||
    (backdropFilter !== "" && backdropFilter !== "none") ||
    contain.some((value) =>
      ["paint", "layout", "strict", "content"].includes(value),
    ) ||
    willChange.some((value) =>
      ["transform", "perspective", "filter"].includes(value),
    )
  );
}

function resolveContainer(
  explicit: Element | DocumentFragment | null | undefined,
  trigger: HTMLButtonElement,
): Element | DocumentFragment | null {
  if (!trigger.isConnected) return null;

  if (explicit != null) {
    if (
      !explicit.isConnected ||
      explicit.ownerDocument !== trigger.ownerDocument
    ) {
      return null;
    }

    if (
      explicit.nodeType === Node.ELEMENT_NODE &&
      createsFixedContainingBlock(explicit as Element)
    ) {
      throw new Error(
        "O container do DropdownMenu não pode criar um containing block para position: fixed.",
      );
    }

    return explicit;
  }

  const dialog = trigger.closest("dialog");
  const DialogConstructor =
    trigger.ownerDocument.defaultView?.HTMLDialogElement;

  if (
    DialogConstructor !== undefined &&
    dialog instanceof DialogConstructor &&
    dialog.isConnected &&
    dialog.open
  ) {
    return dialog;
  }

  const drawer = trigger.closest("[data-drawer-content]");

  if (drawer?.isConnected && drawer.contains(trigger)) {
    return drawer;
  }

  return trigger.ownerDocument.body;
}

function calculatePosition(
  triggerRect: DOMRect,
  contentRect: DOMRect,
  side: DropdownMenuSide,
  align: DropdownMenuAlign,
  offset: number,
): { top: number; left: number } {
  let top = triggerRect.bottom + offset;
  let left = triggerRect.left;

  if (side === "top") {
    top = triggerRect.top - contentRect.height - offset;
  } else if (side === "right") {
    top = triggerRect.top;
    left = triggerRect.right + offset;
  } else if (side === "left") {
    top = triggerRect.top;
    left = triggerRect.left - contentRect.width - offset;
  }

  if (side === "top" || side === "bottom") {
    if (align === "center") {
      left =
        triggerRect.left +
        (triggerRect.width - contentRect.width) / 2;
    } else if (align === "end") {
      left = triggerRect.right - contentRect.width;
    }
  } else if (align === "center") {
    top =
      triggerRect.top +
      (triggerRect.height - contentRect.height) / 2;
  } else if (align === "end") {
    top = triggerRect.bottom - contentRect.height;
  }

  return { top, left };
}

function makeSelectEvent(): DropdownMenuItemSelectEvent {
  let prevented = false;

  return {
    get defaultPrevented() {
      return prevented;
    },
    preventDefault() {
      prevented = true;
    },
  };
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

function eventPathContains(
  event: PointerEvent,
  element: HTMLElement,
): boolean {
  if (event.composedPath().includes(element)) return true;

  const target = event.target;
  return target instanceof Node && element.contains(target);
}

export default function DropdownMenu({
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  container,
  children,
}: DropdownMenuProps) {
  const generatedTriggerId = useId();
  const contentId = useId();
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [triggerElement, setTriggerElement] =
    useState<HTMLButtonElement | null>(null);
  const [contentElement, setContentElement] =
    useState<HTMLDivElement | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);

  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;
  const resolvedOpenRef = useRef(resolvedOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const triggerCountRef = useRef(new Map<HTMLButtonElement, number>());
  const contentCountRef = useRef(new Map<HTMLDivElement, number>());
  const itemsRef = useRef<ItemRecord[]>([]);
  const closeReasonRef = useRef<CloseReason | null>(null);
  const openingFocusTargetRef = useRef<OpeningFocusTarget>("first");
  const closeReasonExpiryRef = useRef<ScheduledFrame | null>(null);
  const restoreFocusFrameRef = useRef<ScheduledFrame | null>(null);
  const [internalPointerEvents] = useState(
    () => new WeakSet<Event>(),
  );

  const cancelCloseReasonExpiry = useCallback(() => {
    const scheduled = closeReasonExpiryRef.current;

    if (scheduled === null) return;

    scheduled.view.cancelAnimationFrame(scheduled.handle);

    if (closeReasonExpiryRef.current === scheduled) {
      closeReasonExpiryRef.current = null;
    }
  }, []);

  const cancelRestoreFocus = useCallback(() => {
    const scheduled = restoreFocusFrameRef.current;

    if (scheduled === null) return;

    scheduled.view.cancelAnimationFrame(scheduled.handle);

    if (restoreFocusFrameRef.current === scheduled) {
      restoreFocusFrameRef.current = null;
    }
  }, []);

  const restoreFocusToTrigger = useCallback(() => {
    cancelRestoreFocus();

    const trigger = triggerRef.current;

    if (
      trigger === null ||
      !trigger.isConnected ||
      trigger.disabled
    ) {
      return;
    }

    const view = trigger.ownerDocument.defaultView;

    if (!view) return;

    const scheduled: ScheduledFrame = { view, handle: 0 };

    scheduled.handle = view.requestAnimationFrame(() => {
      if (restoreFocusFrameRef.current !== scheduled) return;

      restoreFocusFrameRef.current = null;

      if (
        trigger.isConnected &&
        !trigger.disabled
      ) {
        trigger.focus({ preventScroll: true });
      }
    });

    restoreFocusFrameRef.current = scheduled;
  }, [cancelRestoreFocus]);

  const scheduleCloseReasonExpiry = useCallback(() => {
    cancelCloseReasonExpiry();

    const trigger = triggerRef.current;
    const view = trigger?.ownerDocument.defaultView;

    if (!view) {
      closeReasonRef.current = null;
      return;
    }

    const scheduled: ScheduledFrame = { view, handle: 0 };

    scheduled.handle = view.requestAnimationFrame(() => {
      if (closeReasonExpiryRef.current !== scheduled) return;

      closeReasonExpiryRef.current = null;

      if (resolvedOpenRef.current) {
        closeReasonRef.current = null;
      }
    });

    closeReasonExpiryRef.current = scheduled;
  }, [cancelCloseReasonExpiry]);

  const requestOpenChange = useCallback(
    (
      nextOpen: boolean,
      reason?: CloseReason,
      openingTarget?: OpeningFocusTarget,
    ) => {
      if (nextOpen === resolvedOpenRef.current) return;

      if (nextOpen) {
        cancelCloseReasonExpiry();
        cancelRestoreFocus();
        closeReasonRef.current = null;
        openingFocusTargetRef.current = openingTarget ?? "first";
      } else if (reason) {
        closeReasonRef.current = reason;
        scheduleCloseReasonExpiry();
      }

      if (!isControlled) {
        resolvedOpenRef.current = nextOpen;
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [
      cancelCloseReasonExpiry,
      cancelRestoreFocus,
      isControlled,
      onOpenChange,
      scheduleCloseReasonExpiry,
    ],
  );

  const consumeOpeningTarget = useCallback(() => {
    const target = openingFocusTargetRef.current;
    openingFocusTargetRef.current = "first";
    return target;
  }, []);

  const registerTrigger = useCallback((node: HTMLButtonElement) => {
    const current = triggerRef.current;

    if (current !== null && current !== node) {
      throw new Error(
        "DropdownMenu aceita somente um DropdownMenuTrigger por instância.",
      );
    }

    const counts = triggerCountRef.current;

    counts.set(node, (counts.get(node) ?? 0) + 1);
    triggerRef.current = node;
    setTriggerElement(node);

    return () => {
      const count = counts.get(node);

      if (count === undefined) return;

      if (count > 1) {
        counts.set(node, count - 1);
        return;
      }

      counts.delete(node);

      if (triggerRef.current === node) {
        triggerRef.current = null;
        setTriggerElement(null);
      }
    };
  }, []);

  const registerContent = useCallback((node: HTMLDivElement) => {
    const current = contentRef.current;

    if (current !== null && current !== node) {
      throw new Error(
        "DropdownMenu aceita somente um DropdownMenuContent por instância.",
      );
    }

    const counts = contentCountRef.current;

    counts.set(node, (counts.get(node) ?? 0) + 1);
    contentRef.current = node;
    setContentElement(node);

    return () => {
      const count = counts.get(node);

      if (count === undefined) return;

      if (count > 1) {
        counts.set(node, count - 1);
        return;
      }

      counts.delete(node);

      if (contentRef.current === node) {
        contentRef.current = null;
        setContentElement(null);
      }
    };
  }, []);

  const registerItem = useCallback(
    (node: HTMLButtonElement, disabled: boolean) => {
      const existing = itemsRef.current.find(
        (record) => record.element === node,
      );

      if (existing) {
        existing.disabled = disabled;
      } else {
        itemsRef.current.push({ element: node, disabled });
      }

      return () => {
        itemsRef.current = itemsRef.current.filter(
          (record) => record.element !== node,
        );
      };
    },
    [],
  );

  const updateItem = useCallback(
    (node: HTMLButtonElement, disabled: boolean) => {
      const record = itemsRef.current.find(
        (item) => item.element === node,
      );

      if (record) {
        record.disabled = disabled;
      }
    },
    [],
  );

  const getEnabledItems = useCallback(
    () =>
      itemsRef.current
        .filter(
          (record) =>
            !record.disabled &&
            record.element.isConnected,
        )
        .map((record) => record.element)
        .sort(compareDomOrder),
    [],
  );

  useEffect(() => {
    resolvedOpenRef.current = resolvedOpen;

    if (resolvedOpen) {
      cancelCloseReasonExpiry();
      cancelRestoreFocus();
      return;
    }

    const reason = closeReasonRef.current;
    closeReasonRef.current = null;
    cancelCloseReasonExpiry();

    if (reason === "escape" || reason === "item-select") {
      restoreFocusToTrigger();
    }
  }, [
    cancelCloseReasonExpiry,
    cancelRestoreFocus,
    resolvedOpen,
    restoreFocusToTrigger,
  ]);

  useEffect(() => {
    const view = window;
    const frame = view.requestAnimationFrame(() => {
      setPortalMounted(true);
    });

    return () => view.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      cancelCloseReasonExpiry();
      cancelRestoreFocus();
      itemsRef.current = [];
      closeReasonRef.current = null;
    },
    [cancelCloseReasonExpiry, cancelRestoreFocus],
  );

  const value = useMemo<ContextValue>(
    () => ({
      resolvedOpen,
      generatedTriggerId,
      contentId,
      triggerElement,
      contentElement,
      container,
      closeOnEscape,
      closeOnInteractOutside,
      requestOpenChange,
      consumeOpeningTarget,
      registerTrigger,
      registerContent,
      registerItem,
      updateItem,
      getEnabledItems,
      internalPointerEvents,
      portalMounted,
    }),
    [
      closeOnEscape,
      closeOnInteractOutside,
      consumeOpeningTarget,
      container,
      contentElement,
      contentId,
      generatedTriggerId,
      getEnabledItems,
      internalPointerEvents,
      portalMounted,
      registerContent,
      registerItem,
      registerTrigger,
      requestOpenChange,
      resolvedOpen,
      triggerElement,
      updateItem,
    ],
  );

  return (
    <DropdownMenuContext.Provider value={value}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(function DropdownMenuTrigger(
  {
    children,
    type = "button",
    disabled,
    onClick,
    onKeyDown,
    id,
    ...props
  },
  forwardedRef,
) {
  const {
    resolvedOpen,
    generatedTriggerId,
    contentId,
    closeOnEscape,
    registerTrigger,
    requestOpenChange,
  } = useDropdownMenuContext("DropdownMenuTrigger");

  const cleanupRef = useRef<(() => void) | null>(null);
  const effectiveId = id ?? generatedTriggerId;

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current =
        node === null ? null : registerTrigger(node);

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, registerTrigger],
  );

  return (
    <button
      ref={setRefs}
      {...props}
      id={effectiveId}
      type={type}
      disabled={disabled}
      aria-haspopup="menu"
      aria-expanded={resolvedOpen}
      aria-controls={contentId}
      data-state={resolvedOpen ? "open" : "closed"}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented || disabled) return;

        requestOpenChange(
          !resolvedOpen,
          resolvedOpen ? "trigger-toggle" : undefined,
          "first",
        );
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || disabled) return;

        if (
          event.key === "ArrowDown" ||
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          requestOpenChange(true, undefined, "first");
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          requestOpenChange(true, undefined, "last");
          return;
        }

        if (
          event.key === "Escape" &&
          resolvedOpen &&
          closeOnEscape
        ) {
          event.preventDefault();
          requestOpenChange(false, "escape");
        }
      }}
    >
      {children}
    </button>
  );
});

DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(function DropdownMenuContent(
  {
    children,
    side = "bottom",
    align = "start",
    sideOffset = 8,
    loop = true,
    className,
    style,
    role,
    "aria-labelledby": ariaLabelledBy,
    onKeyDown,
    ...props
  },
  forwardedRef,
) {
  const {
    resolvedOpen,
    contentId,
    triggerElement,
    contentElement,
    container,
    closeOnEscape,
    closeOnInteractOutside,
    requestOpenChange,
    consumeOpeningTarget,
    registerContent,
    getEnabledItems,
    portalMounted,
    internalPointerEvents,
  } = useDropdownMenuContext("DropdownMenuContent");

  const cleanupRef = useRef<(() => void) | null>(null);
  const frameRef = useRef<ScheduledFrame | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const normalizedOffset = Number.isFinite(sideOffset)
    ? sideOffset
    : 8;

  const portalContainer =
    portalMounted &&
    resolvedOpen &&
    triggerElement !== null
      ? resolveContainer(container, triggerElement)
      : null;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current =
        node === null ? null : registerContent(node);

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, registerContent],
  );

  const cancelFrame = useCallback(() => {
    const scheduled = frameRef.current;

    if (scheduled === null) return;

    scheduled.view.cancelAnimationFrame(scheduled.handle);

    if (frameRef.current === scheduled) {
      frameRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelFrame();

    if (
      !resolvedOpen ||
      triggerElement === null ||
      contentElement === null ||
      portalContainer === null
    ) {
      return;
    }

    const view = contentElement.ownerDocument.defaultView;

    if (!view) return;

    const scheduled: ScheduledFrame = { view, handle: 0 };

    scheduled.handle = view.requestAnimationFrame(() => {
      if (frameRef.current !== scheduled) return;

      frameRef.current = null;

      if (
        !triggerElement.isConnected ||
        !contentElement.isConnected ||
        !portalContainer.isConnected ||
        resolveContainer(container, triggerElement) !==
          portalContainer
      ) {
        return;
      }

      const coordinates = calculatePosition(
        triggerElement.getBoundingClientRect(),
        contentElement.getBoundingClientRect(),
        side,
        align,
        normalizedOffset,
      );

      if (
        !Number.isFinite(coordinates.top) ||
        !Number.isFinite(coordinates.left)
      ) {
        return;
      }

      setPosition({
        ...coordinates,
        side,
        align,
        sideOffset: normalizedOffset,
        trigger: triggerElement,
        content: contentElement,
        container: portalContainer,
      });
    });

    frameRef.current = scheduled;

    return cancelFrame;
  }, [
    align,
    cancelFrame,
    container,
    contentElement,
    normalizedOffset,
    portalContainer,
    resolvedOpen,
    side,
    triggerElement,
  ]);

  const positionIsCurrent = Boolean(
    position &&
      position.side === side &&
      position.align === align &&
      position.sideOffset === normalizedOffset &&
      position.trigger === triggerElement &&
      position.content === contentElement &&
      position.container === portalContainer,
  );

  useEffect(() => {
    if (
      !resolvedOpen ||
      contentElement === null ||
      !positionIsCurrent
    ) {
      return;
    }

    const view = contentElement.ownerDocument.defaultView;

    if (!view) return;

    const target = consumeOpeningTarget();
    const frame = view.requestAnimationFrame(() => {
      const items = getEnabledItems();
      const destination =
        target === "last"
          ? items[items.length - 1]
          : items[0];

      destination?.focus({ preventScroll: true });
    });

    return () => view.cancelAnimationFrame(frame);
  }, [
    consumeOpeningTarget,
    contentElement,
    getEnabledItems,
    positionIsCurrent,
    resolvedOpen,
  ]);

  useEffect(() => {
    if (
      !resolvedOpen ||
      triggerElement === null ||
      contentElement === null
    ) {
      return;
    }

    const ownerDocument = contentElement.ownerDocument;
    const roots = new Set<Node>();

    roots.add(triggerElement.getRootNode());
    roots.add(contentElement.getRootNode());
    roots.delete(ownerDocument);

    const markInternalPointer = (event: Event) => {
      internalPointerEvents.add(event);
    };

    for (const root of roots) {
      root.addEventListener(
        "pointerdown",
        markInternalPointer,
        true,
      );
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !closeOnInteractOutside ||
        hasActiveMenuAbove(contentElement)
      ) {
        return;
      }

      queueMicrotask(() => {
        if (
          !resolvedOpen ||
          hasActiveMenuAbove(contentElement) ||
          internalPointerEvents.has(event) ||
          eventPathContains(event, triggerElement) ||
          eventPathContains(event, contentElement)
        ) {
          return;
        }

        requestOpenChange(false, "interact-outside");
      });
    };

    ownerDocument.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    return () => {
      ownerDocument.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );

      for (const root of roots) {
        root.removeEventListener(
          "pointerdown",
          markInternalPointer,
          true,
        );
      }
    };
  }, [
    closeOnInteractOutside,
    contentElement,
    internalPointerEvents,
    requestOpenChange,
    resolvedOpen,
    triggerElement,
  ]);

  useEffect(() => {
    if (
      !resolvedOpen ||
      contentElement === null ||
      !contentElement.isConnected
    ) {
      return;
    }

    return registerActiveMenu(contentElement);
  }, [contentElement, resolvedOpen]);

  useEffect(() => cancelFrame, [cancelFrame]);

  if (
    !portalMounted ||
    !resolvedOpen ||
    portalContainer === null
  ) {
    return null;
  }

  const classes = [
    "fixed z-[var(--z-dropdown-menu)] min-w-[var(--dropdown-menu-min-width)] max-w-[min(var(--dropdown-menu-max-width),calc(100vw-var(--space-8)))] overflow-y-auto rounded-[var(--dropdown-menu-radius)] border border-[var(--dropdown-menu-border)] bg-[var(--dropdown-menu-background)] p-[var(--dropdown-menu-padding)] text-sm text-[var(--dropdown-menu-foreground)] shadow-[var(--dropdown-menu-shadow)] outline-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleMenuKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    onKeyDown?.(event);

    if (
      event.defaultPrevented ||
      contentElement === null ||
      hasActiveMenuAbove(contentElement)
    ) {
      return;
    }

    if (event.key === "Escape") {
      if (!closeOnEscape) return;

      event.preventDefault();
      event.stopPropagation();
      requestOpenChange(false, "escape");
      return;
    }

    if (event.key === "Tab") {
      requestOpenChange(false, "tab");
      return;
    }

    const items = getEnabledItems();

    if (items.length === 0) return;

    const activeElement =
      contentElement.ownerDocument.activeElement;
    const currentIndex = items.findIndex(
      (item) => item === activeElement,
    );

    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex < 0
          ? items.length - 1
          : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();

    if (loop) {
      nextIndex =
        (nextIndex + items.length) % items.length;
    } else {
      nextIndex = Math.min(
        Math.max(nextIndex, 0),
        items.length - 1,
      );
    }

    items[nextIndex]?.focus({ preventScroll: true });
  };

  return createPortal(
    <div
      ref={setRefs}
      {...props}
      id={contentId}
      role={role ?? "menu"}
      aria-labelledby={
        ariaLabelledBy ?? triggerElement?.id
      }
      data-side={side}
      data-align={align}
      data-state="open"
      className={classes}
      style={{
        ...style,
        position: "fixed",
        top: positionIsCurrent ? position?.top : 0,
        left: positionIsCurrent ? position?.left : 0,
        visibility: positionIsCurrent
          ? "visible"
          : "hidden",
        pointerEvents: positionIsCurrent
          ? "auto"
          : "none",
      }}
      onKeyDown={handleMenuKeyDown}
    >
      {children}
    </div>,
    portalContainer,
  );
});

DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(function DropdownMenuItem(
  {
    children,
    disabled = false,
    inset = false,
    variant = "default",
    type = "button",
    className,
    onClick,
    onKeyDown,
    onSelect,
    tabIndex = -1,
    ...props
  },
  forwardedRef,
) {
  const {
    registerItem,
    updateItem,
    requestOpenChange,
  } = useDropdownMenuContext("DropdownMenuItem");

  const cleanupRef = useRef<(() => void) | null>(null);
  const localRef = useRef<HTMLButtonElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current =
        node === null
          ? null
          : registerItem(node, disabled);

      localRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [disabled, forwardedRef, registerItem],
  );

  useEffect(() => {
    const node = localRef.current;

    if (node !== null) {
      updateItem(node, disabled);
    }
  }, [disabled, updateItem]);

  const selectItem = useCallback(() => {
    if (disabled) return;

    const selectEvent = makeSelectEvent();
    onSelect?.(selectEvent);

    if (!selectEvent.defaultPrevented) {
      requestOpenChange(false, "item-select");
    }
  }, [disabled, onSelect, requestOpenChange]);

  const classes = [
    "flex w-full cursor-default select-none items-center rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-left text-sm outline-none transition-colors focus-visible:bg-[var(--dropdown-menu-item-focus)] disabled:pointer-events-none disabled:opacity-50",
    inset ? "pl-[var(--space-8)]" : null,
    variant === "danger"
      ? "text-[var(--color-danger)]"
      : "text-[var(--dropdown-menu-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={setRefs}
      {...props}
      type={type}
      role="menuitem"
      tabIndex={tabIndex}
      disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      data-inset={inset ? "" : undefined}
      data-variant={variant}
      className={classes}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          selectItem();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (
          event.defaultPrevented ||
          disabled
        ) {
          return;
        }

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          selectItem();
        }
      }}
    >
      {children}
    </button>
  );
});

DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(function DropdownMenuLabel(
  {
    children,
    inset = false,
    className,
    ...props
  },
  forwardedRef,
) {
  const classes = [
    "px-[var(--space-3)] py-[var(--space-2)] text-xs font-semibold text-[var(--color-text-muted)]",
    inset ? "pl-[var(--space-8)]" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={forwardedRef}
      {...props}
      role="presentation"
      data-inset={inset ? "" : undefined}
      className={classes}
    >
      {children}
    </div>
  );
});

DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(function DropdownMenuSeparator(
  { className, ...props },
  forwardedRef,
) {
  const classes = [
    "-mx-[var(--dropdown-menu-padding)] my-[var(--space-1)] h-px bg-[var(--dropdown-menu-separator)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={forwardedRef}
      {...props}
      role="separator"
      className={classes}
    />
  );
});

DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
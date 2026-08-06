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
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ContextMenuProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type ContextMenuTriggerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  disabled?: boolean;
};

export type ContextMenuContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  loop?: boolean;
};

export type ContextMenuItemSelectEvent = {
  defaultPrevented: boolean;
  preventDefault: () => void;
};

export type ContextMenuItemProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onSelect"
> & {
  children: ReactNode;
  inset?: boolean;
  variant?: "default" | "danger";
  onSelect?: (event: ContextMenuItemSelectEvent) => void;
};

export type ContextMenuLabelProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  inset?: boolean;
};

export type ContextMenuSeparatorProps = HTMLAttributes<HTMLDivElement>;

type CloseReason =
  | "escape"
  | "interact-outside"
  | "item-select"
  | "tab"
  | "reopen"
  | "viewport-change"
  | "trigger-disconnected";

type OpeningFocusTarget = "first" | "last";

type ContextPoint = {
  x: number;
  y: number;
  document: Document;
};

type ScheduledFrame = {
  view: Window;
  handle: number;
};

type PendingReopen = {
  point: ContextPoint;
  openingTarget: OpeningFocusTarget;
};

type ItemRecord = {
  element: HTMLButtonElement;
  disabled: boolean;
};

type ContextMenuContextValue = {
  resolvedOpen: boolean;
  triggerId: string;
  contentId: string;
  triggerElement: HTMLDivElement | null;
  contentElement: HTMLDivElement | null;
  point: ContextPoint | null;
  container?: Element | DocumentFragment | null;
  closeOnEscape: boolean;
  closeOnInteractOutside: boolean;
  requestOpenChange: (
    open: boolean,
    reason?: CloseReason,
    openingTarget?: OpeningFocusTarget,
  ) => void;
  requestOpenAtPoint: (
    point: ContextPoint,
    openingTarget?: OpeningFocusTarget,
  ) => void;
  consumeOpeningTarget: () => OpeningFocusTarget;
  registerTrigger: (node: HTMLDivElement) => () => void;
  registerContent: (node: HTMLDivElement) => () => void;
  registerItem: (node: HTMLButtonElement, disabled: boolean) => () => void;
  updateItem: (node: HTMLButtonElement, disabled: boolean) => void;
  getEnabledItems: () => HTMLButtonElement[];
  portalMounted: boolean;
  internalPointerEvents: WeakSet<Event>;
};

const ContextMenuContext =
  createContext<ContextMenuContextValue | null>(null);

const activeContextMenus = new Map<HTMLDivElement, number>();
let nextContextMenuOrder = 0;

function registerActiveContextMenu(content: HTMLDivElement): () => void {
  if (!activeContextMenus.has(content)) {
    nextContextMenuOrder += 1;
    activeContextMenus.set(content, nextContextMenuOrder);
  }

  return () => {
    activeContextMenus.delete(content);
  };
}

function hasActiveContextMenuAbove(content: HTMLDivElement): boolean {
  const order = activeContextMenus.get(content);

  if (order === undefined) return false;

  for (const candidateOrder of activeContextMenus.values()) {
    if (candidateOrder > order) return true;
  }

  return false;
}

function useContextMenuContext(
  componentName: string,
): ContextMenuContextValue {
  const context = useContext(ContextMenuContext);

  if (context === null) {
    throw new Error(
      `${componentName} deve ser utilizado dentro de ContextMenu.`,
    );
  }

  return context;
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

function resolveContextMenuContainer(
  explicit: Element | DocumentFragment | null | undefined,
  trigger: HTMLDivElement,
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
        "O container do ContextMenu não pode criar um containing block para position: fixed.",
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

function makeSelectEvent(): ContextMenuItemSelectEvent {
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

function eventPathContains(
  event: PointerEvent,
  element: HTMLElement,
): boolean {
  if (event.composedPath().includes(element)) return true;

  const target = event.target;
  return target instanceof Node && element.contains(target);
}

function clampPosition(
  point: ContextPoint,
  contentRect: DOMRect,
): { top: number; left: number } {
  const view = point.document.defaultView;
  const viewportWidth =
    view?.innerWidth ?? point.document.documentElement.clientWidth;
  const viewportHeight =
    view?.innerHeight ?? point.document.documentElement.clientHeight;
  const margin = 8;

  return {
    top: Math.min(
      Math.max(point.y, margin),
      Math.max(margin, viewportHeight - contentRect.height - margin),
    ),
    left: Math.min(
      Math.max(point.x, margin),
      Math.max(margin, viewportWidth - contentRect.width - margin),
    ),
  };
}

export default function ContextMenu({
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  container,
  children,
}: ContextMenuProps) {
  const triggerId = useId();
  const contentId = useId();
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [triggerElement, setTriggerElement] =
    useState<HTMLDivElement | null>(null);
  const [contentElement, setContentElement] =
    useState<HTMLDivElement | null>(null);
  const [point, setPoint] = useState<ContextPoint | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const [internalPointerEvents] = useState(() => new WeakSet<Event>());

  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;
  const resolvedOpenRef = useRef(resolvedOpen);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const triggerCountRef = useRef(new Map<HTMLDivElement, number>());
  const contentCountRef = useRef(new Map<HTMLDivElement, number>());
  const itemsRef = useRef<ItemRecord[]>([]);
  const closeReasonRef = useRef<CloseReason | null>(null);
  const openingFocusTargetRef = useRef<OpeningFocusTarget>("first");
  const closeReasonExpiryRef = useRef<ScheduledFrame | null>(null);
  const restoreFocusFrameRef = useRef<ScheduledFrame | null>(null);
  const reopenFrameRef = useRef<ScheduledFrame | null>(null);
  const pendingReopenRef = useRef<PendingReopen | null>(null);

  const cancelScheduledFrame = useCallback(
    (frameRef: React.MutableRefObject<ScheduledFrame | null>) => {
      const scheduled = frameRef.current;

      if (scheduled === null) return;

      scheduled.view.cancelAnimationFrame(scheduled.handle);

      if (frameRef.current === scheduled) {
        frameRef.current = null;
      }
    },
    [],
  );

  const cancelCloseReasonExpiry = useCallback(
    () => cancelScheduledFrame(closeReasonExpiryRef),
    [cancelScheduledFrame],
  );

  const cancelRestoreFocus = useCallback(
    () => cancelScheduledFrame(restoreFocusFrameRef),
    [cancelScheduledFrame],
  );

  const cancelReopenFrame = useCallback(
    () => cancelScheduledFrame(reopenFrameRef),
    [cancelScheduledFrame],
  );

  const restoreFocusToTrigger = useCallback(() => {
    cancelRestoreFocus();

    const trigger = triggerRef.current;

    if (trigger === null || !trigger.isConnected) return;

    const view = trigger.ownerDocument.defaultView;

    if (!view) return;

    const scheduled: ScheduledFrame = { view, handle: 0 };

    scheduled.handle = view.requestAnimationFrame(() => {
      if (restoreFocusFrameRef.current !== scheduled) return;

      restoreFocusFrameRef.current = null;

      if (trigger.isConnected) {
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
        pendingReopenRef.current = null;
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

  const requestOpenAtPoint = useCallback(
    (
      nextPoint: ContextPoint,
      openingTarget: OpeningFocusTarget = "first",
    ) => {
      cancelReopenFrame();

      if (resolvedOpenRef.current) {
        pendingReopenRef.current = {
          point: nextPoint,
          openingTarget,
        };
        requestOpenChange(false, "reopen");
        return;
      }

      setPoint(nextPoint);
      requestOpenChange(true, undefined, openingTarget);
    },
    [cancelReopenFrame, requestOpenChange],
  );

  const consumeOpeningTarget = useCallback(() => {
    const target = openingFocusTargetRef.current;
    openingFocusTargetRef.current = "first";
    return target;
  }, []);

  const registerTrigger = useCallback((node: HTMLDivElement) => {
    const current = triggerRef.current;

    if (current !== null && current !== node) {
      throw new Error(
        "ContextMenu aceita somente um ContextMenuTrigger por instância.",
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
        "ContextMenu aceita somente um ContextMenuContent por instância.",
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
      cancelReopenFrame();
      return;
    }

    const reason = closeReasonRef.current;
    closeReasonRef.current = null;
    cancelCloseReasonExpiry();

    if (reason === "escape" || reason === "item-select") {
      restoreFocusToTrigger();
    }

    const pendingReopen = pendingReopenRef.current;

    if (reason !== "reopen" || pendingReopen === null) {
      pendingReopenRef.current = null;
      return;
    }

    pendingReopenRef.current = null;

    const view = pendingReopen.point.document.defaultView;

    if (!view) return;

    const scheduled: ScheduledFrame = { view, handle: 0 };

    scheduled.handle = view.requestAnimationFrame(() => {
      if (reopenFrameRef.current !== scheduled) return;

      reopenFrameRef.current = null;
      setPoint(pendingReopen.point);
      requestOpenChange(
        true,
        undefined,
        pendingReopen.openingTarget,
      );
    });

    reopenFrameRef.current = scheduled;
  }, [
    cancelCloseReasonExpiry,
    cancelReopenFrame,
    cancelRestoreFocus,
    requestOpenChange,
    resolvedOpen,
    restoreFocusToTrigger,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPortalMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      cancelCloseReasonExpiry();
      cancelRestoreFocus();
      cancelReopenFrame();
      itemsRef.current = [];
      closeReasonRef.current = null;
      pendingReopenRef.current = null;
    },
    [
      cancelCloseReasonExpiry,
      cancelReopenFrame,
      cancelRestoreFocus,
    ],
  );

  const value = useMemo<ContextMenuContextValue>(
    () => ({
      resolvedOpen,
      triggerId,
      contentId,
      triggerElement,
      contentElement,
      point,
      container,
      closeOnEscape,
      closeOnInteractOutside,
      requestOpenChange,
      requestOpenAtPoint,
      consumeOpeningTarget,
      registerTrigger,
      registerContent,
      registerItem,
      updateItem,
      getEnabledItems,
      portalMounted,
      internalPointerEvents,
    }),
    [
      closeOnEscape,
      closeOnInteractOutside,
      consumeOpeningTarget,
      container,
      contentElement,
      contentId,
      getEnabledItems,
      internalPointerEvents,
      point,
      portalMounted,
      registerContent,
      registerItem,
      registerTrigger,
      requestOpenAtPoint,
      requestOpenChange,
      resolvedOpen,
      triggerElement,
      triggerId,
      updateItem,
    ],
  );

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export const ContextMenuTrigger = forwardRef<
  HTMLDivElement,
  ContextMenuTriggerProps
>(function ContextMenuTrigger(
  {
    children,
    disabled = false,
    tabIndex = disabled ? -1 : 0,
    onContextMenu,
    onKeyDown,
    id,
    ...props
  },
  forwardedRef,
) {
  const {
    triggerId,
    contentId,
    resolvedOpen,
    registerTrigger,
    requestOpenAtPoint,
  } = useContextMenuContext("ContextMenuTrigger");

  const cleanupRef = useRef<(() => void) | null>(null);
  const effectiveId = id ?? triggerId;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
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

  const openFromKeyboard = useCallback(
    (node: HTMLDivElement) => {
      const rect = node.getBoundingClientRect();

      requestOpenAtPoint(
        {
          x: rect.left,
          y: rect.bottom,
          document: node.ownerDocument,
        },
        "first",
      );
    },
    [requestOpenAtPoint],
  );

  return (
    <div
      ref={setRefs}
      {...props}
      id={effectiveId}
      tabIndex={tabIndex}
      aria-disabled={disabled || undefined}
      aria-haspopup="menu"
      aria-expanded={resolvedOpen}
      aria-controls={contentId}
      data-state={resolvedOpen ? "open" : "closed"}
      onContextMenu={(event: ReactMouseEvent<HTMLDivElement>) => {
        onContextMenu?.(event);

        if (event.defaultPrevented || disabled) return;

        event.preventDefault();

        requestOpenAtPoint(
          {
            x: event.clientX,
            y: event.clientY,
            document: event.currentTarget.ownerDocument,
          },
          "first",
        );
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || disabled) return;

        if (
          (event.shiftKey && event.key === "F10") ||
          event.key === "ContextMenu"
        ) {
          event.preventDefault();
          openFromKeyboard(event.currentTarget);
        }
      }}
    >
      {children}
    </div>
  );
});

ContextMenuTrigger.displayName = "ContextMenuTrigger";

export const ContextMenuContent = forwardRef<
  HTMLDivElement,
  ContextMenuContentProps
>(function ContextMenuContent(
  {
    children,
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
    point,
    container,
    closeOnEscape,
    closeOnInteractOutside,
    requestOpenChange,
    consumeOpeningTarget,
    registerContent,
    getEnabledItems,
    portalMounted,
    internalPointerEvents,
  } = useContextMenuContext("ContextMenuContent");

  const cleanupRef = useRef<(() => void) | null>(null);
  const frameRef = useRef<{
    view: Window;
    handle: number;
  } | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    content: HTMLDivElement;
    container: Element | DocumentFragment;
    point: ContextPoint;
  } | null>(null);

  const portalContainer =
    portalMounted &&
    resolvedOpen &&
    triggerElement !== null
      ? resolveContextMenuContainer(container, triggerElement)
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

  const cancelPositionFrame = useCallback(() => {
    const scheduled = frameRef.current;

    if (scheduled === null) return;

    scheduled.view.cancelAnimationFrame(scheduled.handle);

    if (frameRef.current === scheduled) {
      frameRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelPositionFrame();

    if (
      !resolvedOpen ||
      triggerElement === null ||
      contentElement === null ||
      point === null ||
      portalContainer === null ||
      point.document !== contentElement.ownerDocument
    ) {
      return;
    }

    const view = contentElement.ownerDocument.defaultView;

    if (!view) return;

    const scheduled = { view, handle: 0 };

    scheduled.handle = view.requestAnimationFrame(() => {
      if (frameRef.current !== scheduled) return;

      frameRef.current = null;

      if (
        !triggerElement.isConnected ||
        !contentElement.isConnected ||
        !portalContainer.isConnected ||
        resolveContextMenuContainer(
          container,
          triggerElement,
        ) !== portalContainer
      ) {
        return;
      }

      const coordinates = clampPosition(
        point,
        contentElement.getBoundingClientRect(),
      );

      if (
        !Number.isFinite(coordinates.top) ||
        !Number.isFinite(coordinates.left)
      ) {
        return;
      }

      setPosition({
        ...coordinates,
        content: contentElement,
        container: portalContainer,
        point,
      });
    });

    frameRef.current = scheduled;

    return cancelPositionFrame;
  }, [
    cancelPositionFrame,
    container,
    contentElement,
    point,
    portalContainer,
    resolvedOpen,
    triggerElement,
  ]);

  const positionIsCurrent = Boolean(
    position &&
      position.content === contentElement &&
      position.container === portalContainer &&
      position.point === point,
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
        hasActiveContextMenuAbove(contentElement)
      ) {
        return;
      }

      queueMicrotask(() => {
        if (
          hasActiveContextMenuAbove(contentElement) ||
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
      triggerElement === null ||
      contentElement === null
    ) {
      return;
    }

    const ownerDocument = contentElement.ownerDocument;
    const view = ownerDocument.defaultView;

    if (!view) return;

    const closeForViewportChange = () => {
      requestOpenChange(false, "viewport-change");
    };

    view.addEventListener("scroll", closeForViewportChange, true);
    view.addEventListener("resize", closeForViewportChange);

    const observer = new MutationObserver(() => {
      if (!triggerElement.isConnected) {
        requestOpenChange(false, "trigger-disconnected");
      }
    });

    observer.observe(ownerDocument, {
      childList: true,
      subtree: true,
    });

    return () => {
      view.removeEventListener(
        "scroll",
        closeForViewportChange,
        true,
      );
      view.removeEventListener("resize", closeForViewportChange);
      observer.disconnect();
    };
  }, [
    contentElement,
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

    return registerActiveContextMenu(contentElement);
  }, [contentElement, resolvedOpen]);

  useEffect(() => cancelPositionFrame, [cancelPositionFrame]);

  if (
    !portalMounted ||
    !resolvedOpen ||
    portalContainer === null
  ) {
    return null;
  }

  const classes = [
    "fixed z-[var(--z-context-menu)] min-w-[var(--context-menu-min-width)] max-w-[min(var(--context-menu-max-width),calc(100vw-var(--space-8)))] overflow-y-auto rounded-[var(--context-menu-radius)] border border-[var(--context-menu-border)] bg-[var(--context-menu-background)] p-[var(--context-menu-padding)] text-sm text-[var(--context-menu-foreground)] shadow-[var(--context-menu-shadow)] outline-none",
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
      hasActiveContextMenuAbove(contentElement)
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

ContextMenuContent.displayName = "ContextMenuContent";

export const ContextMenuItem = forwardRef<
  HTMLButtonElement,
  ContextMenuItemProps
>(function ContextMenuItem(
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
  } = useContextMenuContext("ContextMenuItem");

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
    "flex w-full cursor-default select-none items-center rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-left text-sm outline-none transition-colors focus-visible:bg-[var(--context-menu-item-focus)] disabled:pointer-events-none disabled:opacity-50",
    inset ? "pl-[var(--space-8)]" : null,
    variant === "danger"
      ? "text-[var(--color-danger)]"
      : "text-[var(--context-menu-foreground)]",
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

ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuLabel = forwardRef<
  HTMLDivElement,
  ContextMenuLabelProps
>(function ContextMenuLabel(
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

ContextMenuLabel.displayName = "ContextMenuLabel";

export const ContextMenuSeparator = forwardRef<
  HTMLDivElement,
  ContextMenuSeparatorProps
>(function ContextMenuSeparator(
  { className, ...props },
  forwardedRef,
) {
  const classes = [
    "-mx-[var(--context-menu-padding)] my-[var(--space-1)] h-px bg-[var(--context-menu-separator)]",
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

ContextMenuSeparator.displayName = "ContextMenuSeparator";
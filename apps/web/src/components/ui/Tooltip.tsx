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
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type TooltipProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type TooltipTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type TooltipSide = "top" | "right" | "bottom" | "left";
export type TooltipAlign = "start" | "center" | "end";

export type TooltipContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
};

type PendingOpen = {
  handle: ReturnType<typeof setTimeout>;
  generation: symbol;
  trigger: HTMLButtonElement;
};

type TooltipContextValue = {
  resolvedOpen: boolean;
  requestOpenChange: (open: boolean) => void;
  openDelay: number;
  container?: Element | DocumentFragment | null;
  contentId: string;
  triggerElement: HTMLButtonElement | null;
  contentElement: HTMLDivElement | null;
  registerTrigger: (node: HTMLButtonElement) => () => void;
  registerContent: (node: HTMLDivElement) => () => void;
  isCurrentTrigger: (node: HTMLButtonElement) => boolean;
  isCurrentContent: (node: HTMLDivElement) => boolean;
  handlePointerEnter: (trigger: HTMLButtonElement) => void;
  handlePointerLeave: () => void;
  handleFocus: () => void;
  handleBlur: () => void;
  openGeneration: symbol | null;
  portalMounted: boolean;
};

type TooltipPosition = {
  top: number;
  left: number;
  side: TooltipSide;
  align: TooltipAlign;
  sideOffset: number;
  trigger: HTMLButtonElement;
  content: HTMLDivElement;
  container: Element | DocumentFragment;
  generation: symbol;
};

type ScheduledPosition = {
  view: Window;
  handle: number;
  generation: symbol;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(componentName: string): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (context === null) {
    throw new Error(`${componentName} deve ser utilizado dentro de Tooltip.`);
  }
  return context;
}

function createsFixedContainingBlock(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  const styles = view?.getComputedStyle(element);
  if (!styles) return false;

  const backdropFilter =
    styles.getPropertyValue("backdrop-filter") ||
    styles.getPropertyValue("-webkit-backdrop-filter");
  const contain = styles.contain.split(/\s+/);
  const willChange = styles.willChange.split(",").map((value) => value.trim());

  return (
    styles.transform !== "none" ||
    styles.perspective !== "none" ||
    styles.filter !== "none" ||
    (backdropFilter !== "" && backdropFilter !== "none") ||
    contain.some((value) =>
      ["paint", "layout", "strict", "content"].includes(value),
    ) ||
    willChange.some((value) => ["transform", "perspective", "filter"].includes(value))
  );
}

function resolveTooltipContainer(
  explicitContainer: Element | DocumentFragment | null | undefined,
  trigger: HTMLButtonElement,
): Element | DocumentFragment | null {
  if (!trigger.isConnected) return null;

  if (explicitContainer != null) {
    if (
      !explicitContainer.isConnected ||
      explicitContainer.ownerDocument !== trigger.ownerDocument
    ) {
      return null;
    }

    if (
      explicitContainer.nodeType === Node.ELEMENT_NODE &&
      createsFixedContainingBlock(explicitContainer as Element)
    ) {
      throw new Error(
        "O container do Tooltip não pode criar um containing block para position: fixed.",
      );
    }
    return explicitContainer;
  }

  const dialog = trigger.closest("dialog");
  const DialogConstructor = trigger.ownerDocument.defaultView?.HTMLDialogElement;
  if (
    DialogConstructor !== undefined &&
    dialog instanceof DialogConstructor &&
    dialog.isConnected &&
    dialog.open
  ) {
    return dialog;
  }

  const drawer = trigger.closest("[data-drawer-content]");
  if (drawer?.isConnected && drawer.contains(trigger)) return drawer;

  return trigger.ownerDocument.body;
}

function calculatePosition(
  triggerRect: DOMRect,
  contentRect: DOMRect,
  side: TooltipSide,
  align: TooltipAlign,
  sideOffset: number,
): Pick<TooltipPosition, "top" | "left"> {
  let top = triggerRect.top - contentRect.height - sideOffset;
  let left = triggerRect.left;

  if (side === "bottom") top = triggerRect.bottom + sideOffset;
  else if (side === "right") {
    top = triggerRect.top;
    left = triggerRect.right + sideOffset;
  } else if (side === "left") {
    top = triggerRect.top;
    left = triggerRect.left - contentRect.width - sideOffset;
  }

  if (side === "top" || side === "bottom") {
    if (align === "center") {
      left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
    } else if (align === "end") {
      left = triggerRect.right - contentRect.width;
    }
  } else if (align === "center") {
    top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
  } else if (align === "end") {
    top = triggerRect.bottom - contentRect.height;
  }

  return { top, left };
}

function mergeDescribedBy(
  explicitValue: string | undefined,
  contentId: string,
): string {
  const ids = new Set(explicitValue?.split(/\s+/).filter(Boolean) ?? []);
  ids.add(contentId);
  return Array.from(ids).join(" ");
}

export default function Tooltip({
  open,
  defaultOpen = false,
  onOpenChange,
  openDelay = 500,
  container,
  children,
}: TooltipProps) {
  const contentId = useId();
  const normalizedOpenDelay =
    Number.isFinite(openDelay) && openDelay >= 0 ? openDelay : 500;
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [triggerElement, setTriggerElement] = useState<HTMLButtonElement | null>(null);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const triggerRegistrationsRef = useRef(new Map<HTMLButtonElement, number>());
  const contentRegistrationsRef = useRef(new Map<HTMLDivElement, number>());
  const currentTriggerRef = useRef<HTMLButtonElement | null>(null);
  const currentContentRef = useRef<HTMLDivElement | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);
  const pointerGenerationRef = useRef<symbol | null>(null);
  const pendingOpenRef = useRef<PendingOpen | null>(null);
  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;
  const resolvedOpenRef = useRef(resolvedOpen);

  const openGeneration = useMemo(
    () => (resolvedOpen ? Symbol("tooltip-open-cycle") : null),
    [resolvedOpen],
  );

  const cancelPendingOpen = useCallback(() => {
    const pending = pendingOpenRef.current;
    pointerGenerationRef.current = null;
    if (pending !== null) {
      clearTimeout(pending.handle);
      if (pendingOpenRef.current === pending) pendingOpenRef.current = null;
    }
  }, []);

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === resolvedOpenRef.current) return;
      if (!nextOpen) cancelPendingOpen();

      if (!isControlled) {
        resolvedOpenRef.current = nextOpen;
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [cancelPendingOpen, isControlled, onOpenChange],
  );

  const requestCloseWithoutCauses = useCallback(() => {
    if (!pointerInsideRef.current && !focusInsideRef.current) {
      cancelPendingOpen();
      requestOpenChange(false);
    }
  }, [cancelPendingOpen, requestOpenChange]);

  const handlePointerEnter = useCallback(
    (trigger: HTMLButtonElement) => {
      pointerInsideRef.current = true;
      cancelPendingOpen();
      if (resolvedOpenRef.current) return;

      const generation = Symbol("tooltip-pointer-delay");
      pointerGenerationRef.current = generation;
      const pending: PendingOpen = {
        handle: setTimeout(() => {
          if (pendingOpenRef.current !== pending) return;
          pendingOpenRef.current = null;
          if (
            pointerGenerationRef.current !== pending.generation ||
            currentTriggerRef.current !== pending.trigger ||
            !pending.trigger.isConnected ||
            !pointerInsideRef.current
          ) {
            return;
          }
          pointerGenerationRef.current = null;
          requestOpenChange(true);
        }, normalizedOpenDelay),
        generation,
        trigger,
      };
      pendingOpenRef.current = pending;
    },
    [cancelPendingOpen, normalizedOpenDelay, requestOpenChange],
  );

  const handlePointerLeave = useCallback(() => {
    pointerInsideRef.current = false;
    requestCloseWithoutCauses();
  }, [requestCloseWithoutCauses]);

  const handleFocus = useCallback(() => {
    focusInsideRef.current = true;
    cancelPendingOpen();
    requestOpenChange(true);
  }, [cancelPendingOpen, requestOpenChange]);

  const handleBlur = useCallback(() => {
    focusInsideRef.current = false;
    requestCloseWithoutCauses();
  }, [requestCloseWithoutCauses]);

  const registerTrigger = useCallback(
    (node: HTMLButtonElement) => {
      const current = currentTriggerRef.current;
      if (current !== null && current !== node) {
        throw new Error("Tooltip aceita somente um TooltipTrigger por instância.");
      }

      const registrations = triggerRegistrationsRef.current;
      registrations.set(node, (registrations.get(node) ?? 0) + 1);
      currentTriggerRef.current = node;
      setTriggerElement(node);

      return () => {
        const count = registrations.get(node);
        if (count === undefined) return;
        if (count > 1) {
          registrations.set(node, count - 1);
          return;
        }
        registrations.delete(node);
        if (currentTriggerRef.current === node) {
          currentTriggerRef.current = null;
          pointerInsideRef.current = false;
          focusInsideRef.current = false;
          cancelPendingOpen();
          setTriggerElement(null);
          requestOpenChange(false);
        }
      };
    },
    [cancelPendingOpen, requestOpenChange],
  );

  const registerContent = useCallback(
    (node: HTMLDivElement) => {
      const current = currentContentRef.current;
      if (current !== null && current !== node) {
        throw new Error("Tooltip aceita somente um TooltipContent por instância.");
      }

      const registrations = contentRegistrationsRef.current;
      registrations.set(node, (registrations.get(node) ?? 0) + 1);
      currentContentRef.current = node;
      setContentElement(node);

      return () => {
        const count = registrations.get(node);
        if (count === undefined) return;
        if (count > 1) {
          registrations.set(node, count - 1);
          return;
        }
        registrations.delete(node);
        if (currentContentRef.current === node) {
          currentContentRef.current = null;
          setContentElement(null);
        }
      };
    },
    [],
  );

  const isCurrentTrigger = useCallback(
    (node: HTMLButtonElement) => currentTriggerRef.current === node,
    [],
  );
  const isCurrentContent = useCallback(
    (node: HTMLDivElement) => currentContentRef.current === node,
    [],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    resolvedOpenRef.current = resolvedOpen;
    cancelPendingOpen();
  }, [cancelPendingOpen, resolvedOpen]);

  useEffect(
    () => () => {
      cancelPendingOpen();
      pointerInsideRef.current = false;
      focusInsideRef.current = false;
    },
    [cancelPendingOpen],
  );

  const contextValue = useMemo<TooltipContextValue>(
    () => ({
      resolvedOpen,
      requestOpenChange,
      openDelay: normalizedOpenDelay,
      container,
      contentId,
      triggerElement,
      contentElement,
      registerTrigger,
      registerContent,
      isCurrentTrigger,
      isCurrentContent,
      handlePointerEnter,
      handlePointerLeave,
      handleFocus,
      handleBlur,
      openGeneration,
      portalMounted,
    }),
    [
      container,
      contentElement,
      contentId,
      handleBlur,
      handleFocus,
      handlePointerEnter,
      handlePointerLeave,
      isCurrentContent,
      isCurrentTrigger,
      normalizedOpenDelay,
      openGeneration,
      portalMounted,
      registerContent,
      registerTrigger,
      requestOpenChange,
      resolvedOpen,
      triggerElement,
    ],
  );

  return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>;
}

export const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  function TooltipTrigger(
    {
      children,
      type = "button",
      disabled,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    forwardedRef,
  ) {
    const {
      resolvedOpen,
      contentId,
      registerTrigger,
      handlePointerEnter,
      handlePointerLeave,
      handleFocus,
      handleBlur,
    } = useTooltipContext("TooltipTrigger");
    const cleanupRef = useRef<(() => void) | null>(null);

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = node === null ? null : registerTrigger(node);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef !== null) forwardedRef.current = node;
      },
      [forwardedRef, registerTrigger],
    );

    return (
      <button
        ref={setRefs}
        {...props}
        type={type}
        disabled={disabled}
        aria-describedby={
          resolvedOpen ? mergeDescribedBy(ariaDescribedBy, contentId) : ariaDescribedBy
        }
        data-state={resolvedOpen ? "open" : "closed"}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (!event.defaultPrevented && !disabled) handlePointerEnter(event.currentTarget);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          if (!event.defaultPrevented && !disabled) handlePointerLeave();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented && !disabled) handleFocus();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (!event.defaultPrevented && !disabled) handleBlur();
        }}
      >
        {children}
      </button>
    );
  },
);

TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    {
      children,
      side = "top",
      align = "center",
      sideOffset = 8,
      className,
      style,
      role,
      ...props
    },
    forwardedRef,
  ) {
    const {
      resolvedOpen,
      container,
      contentId,
      triggerElement,
      contentElement,
      registerContent,
      isCurrentTrigger,
      isCurrentContent,
      openGeneration,
      portalMounted,
    } = useTooltipContext("TooltipContent");
    const cleanupRef = useRef<(() => void) | null>(null);
    const frameRef = useRef<ScheduledPosition | null>(null);
    const [position, setPosition] = useState<TooltipPosition | null>(null);
    const normalizedSideOffset = Number.isFinite(sideOffset) ? sideOffset : 8;
    const portalContainer =
      portalMounted && resolvedOpen && triggerElement !== null
        ? resolveTooltipContainer(container, triggerElement)
        : null;

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = node === null ? null : registerContent(node);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef !== null) forwardedRef.current = node;
      },
      [forwardedRef, registerContent],
    );

    const cancelPositionFrame = useCallback(() => {
      const scheduled = frameRef.current;
      if (scheduled === null) return;
      scheduled.view.cancelAnimationFrame(scheduled.handle);
      if (frameRef.current === scheduled) frameRef.current = null;
    }, []);

    useEffect(() => {
      cancelPositionFrame();
      if (
        !resolvedOpen ||
        !portalMounted ||
        triggerElement === null ||
        contentElement === null ||
        portalContainer === null ||
        openGeneration === null
      ) {
        return;
      }

      const view = contentElement.ownerDocument.defaultView;
      if (!view) return;
      const generation = openGeneration;
      const scheduled: ScheduledPosition = { view, handle: 0, generation };
      scheduled.handle = view.requestAnimationFrame(() => {
        if (frameRef.current !== scheduled) return;
        frameRef.current = null;
        if (
          scheduled.generation !== openGeneration ||
          !triggerElement.isConnected ||
          !contentElement.isConnected ||
          !portalContainer.isConnected ||
          !isCurrentTrigger(triggerElement) ||
          !isCurrentContent(contentElement) ||
          resolveTooltipContainer(container, triggerElement) !== portalContainer
        ) {
          return;
        }

        const coordinates = calculatePosition(
          triggerElement.getBoundingClientRect(),
          contentElement.getBoundingClientRect(),
          side,
          align,
          normalizedSideOffset,
        );
        if (!Number.isFinite(coordinates.top) || !Number.isFinite(coordinates.left)) return;
        setPosition({
          ...coordinates,
          side,
          align,
          sideOffset: normalizedSideOffset,
          trigger: triggerElement,
          content: contentElement,
          container: portalContainer,
          generation,
        });
      });
      frameRef.current = scheduled;
      return cancelPositionFrame;
    }, [
      align,
      cancelPositionFrame,
      container,
      contentElement,
      isCurrentContent,
      isCurrentTrigger,
      normalizedSideOffset,
      openGeneration,
      portalContainer,
      portalMounted,
      resolvedOpen,
      side,
      triggerElement,
    ]);

    useEffect(() => cancelPositionFrame, [cancelPositionFrame]);

    if (!portalMounted || !resolvedOpen || portalContainer === null) return null;

    const positionIsCurrent = Boolean(
      position &&
        position.side === side &&
        position.align === align &&
        position.sideOffset === normalizedSideOffset &&
        position.trigger === triggerElement &&
        position.content === contentElement &&
        position.container === portalContainer &&
        position.generation === openGeneration,
    );
    const classes = [
      "fixed z-[var(--z-tooltip)] w-max max-w-[min(20rem,calc(100vw-var(--space-8)))] break-words rounded-[var(--tooltip-radius)] border border-[var(--tooltip-border)] bg-[var(--tooltip-background)] px-[var(--tooltip-padding-x)] py-[var(--tooltip-padding-y)] text-[var(--font-size-body-xs)] leading-[var(--line-height-body)] text-[var(--tooltip-foreground)] shadow-[var(--tooltip-shadow)]",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return createPortal(
      <div
        ref={setRefs}
        {...props}
        id={contentId}
        role={role ?? "tooltip"}
        data-side={side}
        data-align={align}
        data-state="open"
        className={classes}
        style={{
          ...style,
          position: "fixed",
          top: positionIsCurrent ? position?.top : 0,
          left: positionIsCurrent ? position?.left : 0,
          visibility: positionIsCurrent ? "visible" : "hidden",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>,
      portalContainer,
    );
  },
);

TooltipContent.displayName = "TooltipContent";
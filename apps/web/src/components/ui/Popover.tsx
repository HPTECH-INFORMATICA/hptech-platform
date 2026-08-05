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
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type PopoverProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type PopoverTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
};

export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "center" | "end";

export type PopoverContentProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: ReactNode;
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
};

export type PopoverCloseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
};

export type PopoverTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, "children"> & {
  children: ReactNode;
};

export type PopoverDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, "children"> & {
  children: ReactNode;
};

type PopoverDismissReason = "escape" | "interact-outside" | "close-button";
type PopoverCloseReason = PopoverDismissReason | "trigger-toggle";

type PopoverContextValue = {
  resolvedOpen: boolean;
  requestOpenChange: (open: boolean) => void;
  requestDismiss: (reason: PopoverDismissReason) => boolean;
  container?: Element | DocumentFragment | null;
  contentId: string;
  triggerElement: HTMLButtonElement | null;
  contentElement: HTMLDivElement | null;
  registerTrigger: (node: HTMLButtonElement) => () => void;
  registerContent: (node: HTMLDivElement) => () => void;
  isCurrentTrigger: (node: HTMLButtonElement) => boolean;
  isCurrentContent: (node: HTMLDivElement) => boolean;
  isOpen: () => boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus: boolean;
  openingFocusRef: RefObject<HTMLElement | null>;
  captureFocusForOpening: (preferTrigger?: boolean) => void;
  recordCloseReason: (reason: PopoverCloseReason) => void;
  getCloseReason: () => PopoverCloseReason | null;
  clearCloseReason: () => void;
  markInternalPointerEvent: (event: Event) => void;
  isInternalPointerEvent: (event: Event) => boolean;
  getOpenGeneration: () => symbol | null;
  ensureOpenGeneration: () => symbol;
  titleId: string;
  descriptionId: string;
  registeredTitleId: string | null;
  registeredDescriptionId: string | null;
  registerTitle: (id: string) => () => void;
  registerDescription: (id: string) => () => void;
  portalMounted: boolean;
};

type PopoverPosition = {
  top: number;
  left: number;
  side: PopoverSide;
  align: PopoverAlign;
  sideOffset: number;
  trigger: HTMLButtonElement;
  content: HTMLDivElement;
  container: Element | DocumentFragment;
  containerRevision: number;
};

type ScheduledPositionFrame = {
  view: Window;
  handle: number;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);
const activePopovers = new Map<HTMLDivElement, number>();
let nextPopoverOrder = 0;

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

function getLatestRegistration(registrations: Map<symbol, string>): string | null {
  return Array.from(registrations.values()).at(-1) ?? null;
}

function isElementAvailable(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  const styles = view?.getComputedStyle(element);
  return Boolean(
    element.isConnected &&
      !element.matches(":disabled") &&
      !element.closest('[inert], [aria-hidden="true"]') &&
      styles?.display !== "none" &&
      styles?.visibility !== "hidden" &&
      element.getClientRects().length > 0
  );
}

function canReceiveFocus(element: HTMLElement): boolean {
  return isElementAvailable(element) && element.matches(focusableSelector);
}

function focusElement(element: HTMLElement): boolean {
  if (!canReceiveFocus(element)) return false;
  element.focus({ preventScroll: true });
  return element.ownerDocument.activeElement === element;
}

function isValidExternalFocus(
  element: Element | null,
  ownerDocument: Document,
  content: HTMLDivElement | null,
): element is HTMLElement {
  const HTMLElementConstructor = ownerDocument.defaultView?.HTMLElement;
  return Boolean(
    HTMLElementConstructor &&
      element instanceof HTMLElementConstructor &&
      element !== ownerDocument.body &&
      isElementAvailable(element) &&
      !content?.contains(element)
  );
}

function registerActivePopover(content: HTMLDivElement): () => void {
  nextPopoverOrder += 1;
  activePopovers.set(content, nextPopoverOrder);
  let registered = true;
  return () => {
    if (!registered) return;
    registered = false;
    activePopovers.delete(content);
  };
}

function isTopActivePopover(content: HTMLDivElement): boolean {
  const order = activePopovers.get(content);
  if (order === undefined || !content.isConnected) return false;
  return !Array.from(activePopovers).some(
    ([candidate, candidateOrder]) =>
      candidate.isConnected &&
      candidate.ownerDocument === content.ownerDocument &&
      candidateOrder > order,
  );
}

function hasActivePopoverAbove(
  ownerDocument: Document,
  closingOrder: number | undefined,
): boolean {
  if (closingOrder === undefined) return false;
  return Array.from(activePopovers).some(
    ([candidate, order]) =>
      candidate.isConnected && candidate.ownerDocument === ownerDocument && order > closingOrder,
  );
}

function createConsumerKeyDownEvent<T extends HTMLElement>(
  nativeEvent: globalThis.KeyboardEvent,
  currentTarget: T,
): ReactKeyboardEvent<T> {
  return {
    get altKey() { return nativeEvent.altKey; },
    get bubbles() { return nativeEvent.bubbles; },
    get cancelable() { return nativeEvent.cancelable; },
    get charCode() { return nativeEvent.charCode; },
    get code() { return nativeEvent.code; },
    get ctrlKey() { return nativeEvent.ctrlKey; },
    get currentTarget() { return currentTarget; },
    get defaultPrevented() { return nativeEvent.defaultPrevented; },
    get detail() { return nativeEvent.detail; },
    get eventPhase() { return nativeEvent.eventPhase; },
    get isTrusted() { return nativeEvent.isTrusted; },
    get key() { return nativeEvent.key; },
    get keyCode() { return nativeEvent.keyCode; },
    get locale() { return ""; },
    get location() { return nativeEvent.location; },
    get metaKey() { return nativeEvent.metaKey; },
    get nativeEvent() { return nativeEvent; },
    get repeat() { return nativeEvent.repeat; },
    get shiftKey() { return nativeEvent.shiftKey; },
    get target() { return nativeEvent.target ?? currentTarget; },
    get timeStamp() { return nativeEvent.timeStamp; },
    get type() { return nativeEvent.type; },
    get view() {
      const view = nativeEvent.view ?? currentTarget.ownerDocument.defaultView;
      return {
        document: currentTarget.ownerDocument,
        styleMedia: {
          type: "screen",
          matchMedium: (query: string) => view?.matchMedia(query).matches ?? false,
        },
      };
    },
    get which() { return nativeEvent.which; },
    getModifierState: (key) => nativeEvent.getModifierState(key),
    isDefaultPrevented: () => nativeEvent.defaultPrevented,
    isPropagationStopped: () => nativeEvent.cancelBubble,
    persist: () => undefined,
    preventDefault: () => nativeEvent.preventDefault(),
    stopPropagation: () => nativeEvent.stopPropagation(),
  };
}

function usePopoverContext(componentName: string): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (context === null) {
    throw new Error(`${componentName} deve ser utilizado dentro de Popover.`);
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
    contain.some((value) => ["paint", "layout", "strict", "content"].includes(value)) ||
    willChange.some((value) => ["transform", "perspective", "filter"].includes(value))
  );
}

type ResolvePopoverContainerOptions = {
  explicitContainer: Element | DocumentFragment | null | undefined;
  triggerElement: HTMLButtonElement;
  fallbackDocument: Document;
};

function resolvePopoverContainer({
  explicitContainer,
  triggerElement,
  fallbackDocument,
}: ResolvePopoverContainerOptions): Element | DocumentFragment | null {
  if (!triggerElement.isConnected) return null;

  if (explicitContainer != null) {
    if (!explicitContainer.isConnected) return null;
    if (explicitContainer.nodeType === 1 && createsFixedContainingBlock(explicitContainer as Element)) {
      throw new Error(
        "O container do Popover não pode criar um containing block para position: fixed.",
      );
    }
    return explicitContainer;
  }

  const dialog = triggerElement.closest("dialog");
  const dialogConstructor = triggerElement.ownerDocument.defaultView?.HTMLDialogElement;
  if (
    dialogConstructor !== undefined &&
    dialog instanceof dialogConstructor &&
    dialog.isConnected &&
    dialog.open
  ) {
    return dialog;
  }

  const drawer = triggerElement.closest("[data-drawer-content]");
  if (drawer?.isConnected && drawer.contains(triggerElement)) return drawer;

  return fallbackDocument.body;
}

function calculatePosition(
  triggerRect: DOMRect,
  contentRect: DOMRect,
  side: PopoverSide,
  align: PopoverAlign,
  sideOffset: number,
): Pick<PopoverPosition, "top" | "left"> {
  let top = triggerRect.bottom + sideOffset;
  let left = triggerRect.left;

  if (side === "top") top = triggerRect.top - contentRect.height - sideOffset;
  else if (side === "right") {
    top = triggerRect.top;
    left = triggerRect.right + sideOffset;
  } else if (side === "left") {
    top = triggerRect.top;
    left = triggerRect.left - contentRect.width - sideOffset;
  }

  if (side === "top" || side === "bottom") {
    if (align === "center") left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
    else if (align === "end") left = triggerRect.right - contentRect.width;
  } else if (align === "center") {
    top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
  } else if (align === "end") {
    top = triggerRect.bottom - contentRect.height;
  }

  return { top, left };
}

export default function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  initialFocusRef,
  restoreFocus = true,
  container,
  children,
}: PopoverProps) {
  const contentId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const triggerRegistrations = useRef(new Map<HTMLButtonElement, number>());
  const contentRegistrations = useRef(new Map<HTMLDivElement, number>());
  const titleRegistrations = useRef(new Map<symbol, string>());
  const descriptionRegistrations = useRef(new Map<symbol, string>());
  const currentTriggerRef = useRef<HTMLButtonElement | null>(null);
  const currentContentRef = useRef<HTMLDivElement | null>(null);
  const openingFocusRef = useRef<HTMLElement | null>(null);
  const openGenerationRef = useRef<symbol | null>(null);
  const wasResolvedOpenRef = useRef(false);
  const closeReasonRef = useRef<PopoverCloseReason | null>(null);
  const closeReasonExpiryFrameRef = useRef<number | null>(null);
  const internalPointerEventsRef = useRef(new WeakSet<Event>());
  const openRef = useRef(false);
  const [triggerElement, setTriggerElement] = useState<HTMLButtonElement | null>(null);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  const [registeredTitleId, setRegisteredTitleId] = useState<string | null>(null);
  const [registeredDescriptionId, setRegisteredDescriptionId] = useState<string | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;

  useEffect(() => {
    openRef.current = resolvedOpen;
  }, [resolvedOpen]);

  const requestOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen === openRef.current) return;
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  const clearCloseReason = useCallback(() => {
    if (closeReasonExpiryFrameRef.current !== null) {
      window.cancelAnimationFrame(closeReasonExpiryFrameRef.current);
      closeReasonExpiryFrameRef.current = null;
    }
    closeReasonRef.current = null;
  }, []);

  const recordCloseReason = useCallback((reason: PopoverCloseReason) => {
    if (closeReasonExpiryFrameRef.current !== null) {
      window.cancelAnimationFrame(closeReasonExpiryFrameRef.current);
    }
    closeReasonRef.current = reason;
    const frame = window.requestAnimationFrame(() => {
      if (closeReasonExpiryFrameRef.current !== frame) return;
      closeReasonExpiryFrameRef.current = null;
      if (openRef.current) closeReasonRef.current = null;
    });
    closeReasonExpiryFrameRef.current = frame;
  }, []);

  const getCloseReason = useCallback(() => closeReasonRef.current, []);
  const markInternalPointerEvent = useCallback((event: Event) => {
    internalPointerEventsRef.current.add(event);
  }, []);
  const isInternalPointerEvent = useCallback(
    (event: Event) => internalPointerEventsRef.current.has(event),
    [],
  );

  const requestDismiss = useCallback((reason: PopoverDismissReason) => {
    if (!openRef.current) return false;
    if (reason === "escape" && !closeOnEscape) return false;
    if (reason === "interact-outside" && !closeOnInteractOutside) return false;
    recordCloseReason(reason);
    requestOpenChange(false);
    return true;
  }, [closeOnEscape, closeOnInteractOutside, recordCloseReason, requestOpenChange]);

  const captureFocusForOpening = useCallback((preferTrigger = false) => {
    const trigger = currentTriggerRef.current;
    const ownerDocument = trigger?.ownerDocument ?? container?.ownerDocument ?? document;
    const activeElement = ownerDocument.activeElement;
    openingFocusRef.current =
      preferTrigger && trigger && isElementAvailable(trigger)
        ? trigger
        : isValidExternalFocus(activeElement, ownerDocument, currentContentRef.current)
          ? activeElement
          : null;
  }, [container]);

  const registerTrigger = useCallback((node: HTMLButtonElement) => {
    const current = currentTriggerRef.current;
    if (current !== null && current !== node) {
      throw new Error("Popover aceita somente um PopoverTrigger por instância.");
    }
    const count = triggerRegistrations.current.get(node) ?? 0;
    triggerRegistrations.current.set(node, count + 1);
    currentTriggerRef.current = node;
    setTriggerElement(node);

    return () => {
      const registeredCount = triggerRegistrations.current.get(node);
      if (registeredCount === undefined) return;
      if (registeredCount > 1) {
        triggerRegistrations.current.set(node, registeredCount - 1);
        return;
      }
      triggerRegistrations.current.delete(node);
      if (currentTriggerRef.current === node) {
        currentTriggerRef.current = null;
        setTriggerElement(null);
      }
    };
  }, []);

  const registerContent = useCallback((node: HTMLDivElement) => {
    const current = currentContentRef.current;
    if (current !== null && current !== node) {
      throw new Error("Popover aceita somente um PopoverContent por instância.");
    }
    const count = contentRegistrations.current.get(node) ?? 0;
    contentRegistrations.current.set(node, count + 1);
    currentContentRef.current = node;
    setContentElement(node);

    return () => {
      const registeredCount = contentRegistrations.current.get(node);
      if (registeredCount === undefined) return;
      if (registeredCount > 1) {
        contentRegistrations.current.set(node, registeredCount - 1);
        return;
      }
      contentRegistrations.current.delete(node);
      if (currentContentRef.current === node) {
        currentContentRef.current = null;
        setContentElement(null);
      }
    };
  }, []);

  const isCurrentTrigger = useCallback((node: HTMLButtonElement) => currentTriggerRef.current === node, []);
  const isCurrentContent = useCallback((node: HTMLDivElement) => currentContentRef.current === node, []);
  const isOpen = useCallback(() => openRef.current, []);
  const getOpenGeneration = useCallback(() => openGenerationRef.current, []);
  const ensureOpenGeneration = useCallback(() => {
    openGenerationRef.current ??= Symbol("popover-open-cycle");
    return openGenerationRef.current;
  }, []);

  const registerTitle = useCallback((id: string) => {
    const registration = Symbol("popover-title");
    const registrations = titleRegistrations.current;
    registrations.set(registration, id);
    setRegisteredTitleId(getLatestRegistration(registrations));
    return () => {
      registrations.delete(registration);
      setRegisteredTitleId(getLatestRegistration(registrations));
    };
  }, []);

  const registerDescription = useCallback((id: string) => {
    const registration = Symbol("popover-description");
    const registrations = descriptionRegistrations.current;
    registrations.set(registration, id);
    setRegisteredDescriptionId(getLatestRegistration(registrations));
    return () => {
      registrations.delete(registration);
      setRegisteredDescriptionId(getLatestRegistration(registrations));
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (resolvedOpen) openGenerationRef.current ??= Symbol("popover-open-cycle");
    else openGenerationRef.current = null;

    if (resolvedOpen && !wasResolvedOpenRef.current) {
      clearCloseReason();
      captureFocusForOpening(false);
    }
    wasResolvedOpenRef.current = resolvedOpen;
  }, [captureFocusForOpening, clearCloseReason, resolvedOpen]);

  useEffect(() => clearCloseReason, [clearCloseReason]);

  const contextValue = useMemo<PopoverContextValue>(() => ({
    resolvedOpen, requestOpenChange, requestDismiss, container, contentId, triggerElement, contentElement,
    registerTrigger, registerContent, isCurrentTrigger, isCurrentContent, isOpen, initialFocusRef,
    restoreFocus, openingFocusRef, captureFocusForOpening, recordCloseReason, getCloseReason,
    clearCloseReason, markInternalPointerEvent, isInternalPointerEvent,
    getOpenGeneration, ensureOpenGeneration,
    titleId, descriptionId,
    registeredTitleId, registeredDescriptionId, registerTitle, registerDescription, portalMounted,
  }), [resolvedOpen, requestOpenChange, requestDismiss, container, contentId, triggerElement,
    contentElement, registerTrigger, registerContent, isCurrentTrigger, isCurrentContent, isOpen,
    initialFocusRef, restoreFocus, captureFocusForOpening, recordCloseReason, getCloseReason,
    clearCloseReason, markInternalPointerEvent, isInternalPointerEvent,
    getOpenGeneration, ensureOpenGeneration,
    titleId, descriptionId,
    registeredTitleId, registeredDescriptionId, registerTitle, registerDescription, portalMounted]);

  return <PopoverContext.Provider value={contextValue}>{children}</PopoverContext.Provider>;
}

export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(function PopoverTrigger(
  { children, type = "button", onClick, onKeyDown, ...props }, forwardedRef,
) {
  const { resolvedOpen, requestOpenChange, requestDismiss, contentId, contentElement,
    triggerElement, registerTrigger, captureFocusForOpening, recordCloseReason } =
    usePopoverContext("PopoverTrigger");
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRefs = useCallback((node: HTMLButtonElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = node === null ? null : registerTrigger(node);
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef !== null) forwardedRef.current = node;
  }, [forwardedRef, registerTrigger]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      if (!resolvedOpen) captureFocusForOpening(true);
      else recordCloseReason("trigger-toggle");
      requestOpenChange(!resolvedOpen);
    }
  }, [captureFocusForOpening, onClick, recordCloseReason, requestOpenChange, resolvedOpen]);

  useEffect(() => {
    if (!resolvedOpen || triggerElement === null) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      onKeyDown?.(createConsumerKeyDownEvent(event, triggerElement));
      if (event.defaultPrevented || event.key !== "Escape" ||
          contentElement === null || !isTopActivePopover(contentElement)) return;
      if (requestDismiss("escape")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    triggerElement.addEventListener("keydown", handleKeyDown, true);
    return () => triggerElement.removeEventListener("keydown", handleKeyDown, true);
  }, [contentElement, onKeyDown, requestDismiss, resolvedOpen, triggerElement]);

  return <button ref={setRefs} {...props} type={type} aria-haspopup="dialog" aria-expanded={resolvedOpen}
    aria-controls={contentId} onClick={handleClick}>{children}</button>;
});

PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent(
  { children, side = "bottom", align = "center", sideOffset = 8, className, style, role,
    onKeyDown, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy, ...props }, forwardedRef,
) {
  const context = usePopoverContext("PopoverContent");
  const { resolvedOpen, container, contentId, triggerElement, contentElement, registerContent,
    isCurrentTrigger, isCurrentContent, isOpen, initialFocusRef, restoreFocus, openingFocusRef,
    captureFocusForOpening, getOpenGeneration, ensureOpenGeneration, registeredTitleId, registeredDescriptionId,
    requestDismiss, getCloseReason, clearCloseReason, markInternalPointerEvent,
    isInternalPointerEvent, portalMounted } = context;
  const cleanupRef = useRef<(() => void) | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [containerRevision, setContainerRevision] = useState(0);
  const positionFrameRef = useRef<ScheduledPositionFrame | null>(null);
  const initialFocusFrameRef = useRef<number | null>(null);
  const restoreFocusFrameRef = useRef<number | null>(null);
  const appliedFocusGenerationRef = useRef<symbol | null>(null);
  const wasOpenRef = useRef(false);
  const lastContentRef = useRef<HTMLDivElement | null>(null);
  const lastActiveOrderRef = useRef<number | undefined>(undefined);
  const resolvedSideOffset = Number.isFinite(sideOffset) ? sideOffset : 8;

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = node === null ? null : registerContent(node);
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef !== null) forwardedRef.current = node;
  }, [forwardedRef, registerContent]);

  const portalContainer =
    portalMounted && resolvedOpen && triggerElement !== null
      ? resolvePopoverContainer({
          explicitContainer: container,
          triggerElement,
          fallbackDocument: triggerElement.ownerDocument,
        })
      : null;

  const cancelPositionUpdate = useCallback(() => {
    const scheduled = positionFrameRef.current;
    if (scheduled === null) return;
    scheduled.view.cancelAnimationFrame(scheduled.handle);
    positionFrameRef.current = null;
  }, []);

  const measureAndPublishPosition = useCallback(() => {
    if (
      !resolvedOpen ||
      !portalMounted ||
      !triggerElement ||
      !contentElement ||
      !portalContainer ||
      !isOpen() ||
      !isCurrentTrigger(triggerElement) ||
      !isCurrentContent(contentElement)
    ) return;
    if (triggerElement.ownerDocument !== contentElement.ownerDocument) return;

    const revalidatedContainer = resolvePopoverContainer({
      explicitContainer: container,
      triggerElement,
      fallbackDocument: triggerElement.ownerDocument,
    });
    if (revalidatedContainer !== portalContainer) {
      setContainerRevision((revision) => revision + 1);
      return;
    }
    if (!triggerElement.isConnected || !contentElement.isConnected || !portalContainer.isConnected) return;

    const nextCoordinates = calculatePosition(
      triggerElement.getBoundingClientRect(),
      contentElement.getBoundingClientRect(),
      side,
      align,
      resolvedSideOffset,
    );
    if (!Number.isFinite(nextCoordinates.top) || !Number.isFinite(nextCoordinates.left)) return;

    setPosition((currentPosition) => {
      if (
        currentPosition?.top === nextCoordinates.top &&
        currentPosition.left === nextCoordinates.left &&
        currentPosition.side === side &&
        currentPosition.align === align &&
        currentPosition.sideOffset === resolvedSideOffset &&
        currentPosition.trigger === triggerElement &&
        currentPosition.content === contentElement &&
        currentPosition.container === portalContainer &&
        currentPosition.containerRevision === containerRevision
      ) return currentPosition;

      return {
        ...nextCoordinates,
        side,
        align,
        sideOffset: resolvedSideOffset,
        trigger: triggerElement,
        content: contentElement,
        container: portalContainer,
        containerRevision,
      };
    });
  }, [align, container, containerRevision, contentElement, isCurrentContent, isCurrentTrigger,
    isOpen, portalContainer, portalMounted, resolvedOpen, resolvedSideOffset, side, triggerElement]);

  const schedulePositionUpdate = useCallback(() => {
    if (positionFrameRef.current !== null || contentElement === null) return;
    const view = contentElement.ownerDocument.defaultView;
    if (!view) return;

    const scheduled: ScheduledPositionFrame = { view, handle: 0 };
    scheduled.handle = view.requestAnimationFrame(() => {
      if (positionFrameRef.current !== scheduled) return;
      positionFrameRef.current = null;
      measureAndPublishPosition();
    });
    positionFrameRef.current = scheduled;
  }, [contentElement, measureAndPublishPosition]);

  useEffect(() => {
    cancelPositionUpdate();
    if (!resolvedOpen || !portalMounted || !triggerElement || !contentElement || !portalContainer) return;
    schedulePositionUpdate();
    return cancelPositionUpdate;
  }, [cancelPositionUpdate, contentElement, portalContainer, portalMounted, resolvedOpen,
    schedulePositionUpdate, triggerElement]);

  useEffect(() => {
    if (!resolvedOpen || !triggerElement || !contentElement || !portalContainer) return;
    if (triggerElement.ownerDocument !== contentElement.ownerDocument) return;
    const view = contentElement.ownerDocument.defaultView;
    if (!view) return;

    const handleAutoUpdate = () => schedulePositionUpdate();
    view.addEventListener("resize", handleAutoUpdate, { passive: true });
    view.addEventListener("scroll", handleAutoUpdate, { capture: true, passive: true });

    const scrollRoots = new Set<Node>();
    const triggerRoot = triggerElement.getRootNode();
    const contentRoot = contentElement.getRootNode();
    if (triggerRoot !== contentElement.ownerDocument && triggerRoot.isConnected) {
      scrollRoots.add(triggerRoot);
    }
    if (contentRoot !== contentElement.ownerDocument && contentRoot.isConnected) {
      scrollRoots.add(contentRoot);
    }
    for (const root of scrollRoots) {
      root.addEventListener("scroll", handleAutoUpdate, { capture: true, passive: true });
    }

    const ResizeObserverConstructor = view.ResizeObserver;
    const resizeObserver = ResizeObserverConstructor
      ? new ResizeObserverConstructor(handleAutoUpdate)
      : null;
    resizeObserver?.observe(triggerElement);
    resizeObserver?.observe(contentElement);

    return () => {
      view.removeEventListener("resize", handleAutoUpdate);
      view.removeEventListener("scroll", handleAutoUpdate, true);
      for (const root of scrollRoots) {
        root.removeEventListener("scroll", handleAutoUpdate, true);
      }
      resizeObserver?.disconnect();
      cancelPositionUpdate();
    };
  }, [cancelPositionUpdate, contentElement, portalContainer, resolvedOpen,
    schedulePositionUpdate, triggerElement]);

  const positionIsCurrent = Boolean(position && position.side === side && position.align === align &&
    position.sideOffset === resolvedSideOffset && position.trigger === triggerElement &&
    position.content === contentElement && position.container === portalContainer &&
    position.containerRevision === containerRevision &&
    triggerElement?.ownerDocument === contentElement?.ownerDocument);

  useEffect(() => {
    if (!resolvedOpen || contentElement === null || !contentElement.isConnected) return;
    const cleanup = registerActivePopover(contentElement);
    lastContentRef.current = contentElement;
    lastActiveOrderRef.current = activePopovers.get(contentElement);
    return cleanup;
  }, [contentElement, resolvedOpen]);

  useEffect(() => {
    if (!resolvedOpen || contentElement === null) return;
    const ownerDocument = contentElement.ownerDocument;
    const view = ownerDocument.defaultView;
    if (!view) return;

    const roots = new Set<Node>([
      triggerElement?.getRootNode(),
      contentElement.getRootNode(),
    ].filter((root): root is Node => root instanceof view.Node));
    roots.delete(ownerDocument);

    const handleInternalPointerDown = (event: Event) => {
      const path = event.composedPath();
      if (
        path.includes(contentElement) ||
        (triggerElement !== null && path.includes(triggerElement))
      ) {
        markInternalPointerEvent(event);
      }
    };

    for (const root of roots) {
      if (root.isConnected) root.addEventListener("pointerdown", handleInternalPointerDown);
    }

    return () => {
      for (const root of roots) {
        root.removeEventListener("pointerdown", handleInternalPointerDown);
      }
    };
  }, [contentElement, markInternalPointerEvent, resolvedOpen, triggerElement]);

  useEffect(() => {
    if (!resolvedOpen || contentElement === null) return;
    const ownerDocument = contentElement.ownerDocument;
    const view = ownerDocument.defaultView;
    if (!view) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!isTopActivePopover(contentElement)) return;
      if (isInternalPointerEvent(event)) return;
      const path = event.composedPath();
      const interactionIsInternal =
        path.includes(contentElement) ||
        (triggerElement !== null && path.includes(triggerElement));
      if (interactionIsInternal) return;

      const target = event.target;
      if (
        path.length === 0 &&
        target instanceof view.Node &&
        (contentElement.contains(target) || triggerElement?.contains(target))
      ) return;
      requestDismiss("interact-outside");
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown);
    return () => ownerDocument.removeEventListener("pointerdown", handlePointerDown);
  }, [contentElement, isInternalPointerEvent, requestDismiss, resolvedOpen, triggerElement]);

  useEffect(() => {
    if (!resolvedOpen || contentElement === null) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      onKeyDown?.(createConsumerKeyDownEvent(event, contentElement));
      if (event.defaultPrevented || event.key !== "Escape" || !isTopActivePopover(contentElement)) return;
      if (requestDismiss("escape")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    contentElement.addEventListener("keydown", handleKeyDown, true);
    return () => contentElement.removeEventListener("keydown", handleKeyDown, true);
  }, [contentElement, onKeyDown, requestDismiss, resolvedOpen]);

  useEffect(() => {
    const content = contentElement;
    const view = content?.ownerDocument.defaultView;
    if (!resolvedOpen || !positionIsCurrent || !content || !view) return;
    const generation = getOpenGeneration() ?? ensureOpenGeneration();
    if (appliedFocusGenerationRef.current === generation) return;
    if (openingFocusRef.current === null) captureFocusForOpening();

    if (initialFocusFrameRef.current !== null) view.cancelAnimationFrame(initialFocusFrameRef.current);
    const scheduledInitialFocusRef = initialFocusRef;
    const frame = view.requestAnimationFrame(() => {
      if (initialFocusFrameRef.current !== frame) return;
      initialFocusFrameRef.current = null;
      if (!isOpen() || getOpenGeneration() !== generation || !isCurrentContent(content) || !content.isConnected) return;

      const requested = scheduledInitialFocusRef?.current;
      const autofocus = content.querySelector<HTMLElement>("[autofocus]");
      const firstFocusable = Array.from(content.querySelectorAll<HTMLElement>(focusableSelector)).find(canReceiveFocus);
      const target = requested && content.contains(requested) && canReceiveFocus(requested)
        ? requested
        : autofocus && canReceiveFocus(autofocus)
          ? autofocus
          : firstFocusable;
      if (target) focusElement(target);
      appliedFocusGenerationRef.current = generation;
    });
    initialFocusFrameRef.current = frame;

    return () => {
      if (initialFocusFrameRef.current === frame) {
        view.cancelAnimationFrame(frame);
        initialFocusFrameRef.current = null;
      }
    };
  }, [captureFocusForOpening, contentElement, ensureOpenGeneration, getOpenGeneration, initialFocusRef,
    isCurrentContent, isOpen, openingFocusRef, positionIsCurrent, resolvedOpen]);

  useEffect(() => {
    const content = contentElement ?? lastContentRef.current;
    const ownerDocument = content?.ownerDocument ?? triggerElement?.ownerDocument;
    const view = ownerDocument?.defaultView;

    if (resolvedOpen) {
      wasOpenRef.current = true;
      if (view && restoreFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(restoreFocusFrameRef.current);
        restoreFocusFrameRef.current = null;
      }
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    appliedFocusGenerationRef.current = null;
    const closeReason = getCloseReason();
    clearCloseReason();
    if (view && initialFocusFrameRef.current !== null) {
      view.cancelAnimationFrame(initialFocusFrameRef.current);
      initialFocusFrameRef.current = null;
    }
    if (
      !restoreFocus ||
      closeReason === "interact-outside" ||
      closeReason === "trigger-toggle" ||
      !view ||
      !ownerDocument
    ) {
      openingFocusRef.current = null;
      return;
    }

    const trigger = triggerElement;
    const previousFocus = openingFocusRef.current;
    const closingOrder = lastActiveOrderRef.current;
    const frame = view.requestAnimationFrame(() => {
      if (restoreFocusFrameRef.current !== frame) return;
      restoreFocusFrameRef.current = null;
      if (isOpen()) return;
      if (hasActivePopoverAbove(ownerDocument, closingOrder)) {
        openingFocusRef.current = null;
        return;
      }
      if (trigger && isElementAvailable(trigger)) focusElement(trigger);
      else if (previousFocus && isElementAvailable(previousFocus)) focusElement(previousFocus);
      openingFocusRef.current = null;
    });
    restoreFocusFrameRef.current = frame;
  }, [clearCloseReason, contentElement, getCloseReason, isOpen, openingFocusRef,
    resolvedOpen, restoreFocus, triggerElement]);

  useEffect(() => () => {
    const view = lastContentRef.current?.ownerDocument.defaultView ?? window;
    if (initialFocusFrameRef.current !== null) view.cancelAnimationFrame(initialFocusFrameRef.current);
    if (restoreFocusFrameRef.current !== null) view.cancelAnimationFrame(restoreFocusFrameRef.current);
  }, []);

  if (!portalMounted || !resolvedOpen || portalContainer === null) return null;

  const hasAriaLabel = typeof ariaLabel === "string" && ariaLabel.trim().length > 0;
  const explicitLabelledBy = typeof ariaLabelledBy === "string" && ariaLabelledBy.trim().length > 0
    ? ariaLabelledBy : undefined;
  const explicitDescribedBy = typeof ariaDescribedBy === "string" && ariaDescribedBy.trim().length > 0
    ? ariaDescribedBy : undefined;
  const resolvedLabelledBy = explicitLabelledBy ?? (hasAriaLabel ? undefined : registeredTitleId ?? undefined);
  const resolvedDescribedBy = explicitDescribedBy ?? registeredDescriptionId ?? undefined;
  const classes = [
    "fixed z-[var(--z-popover)] w-max max-w-[calc(100vw-var(--space-8))] max-h-[calc(100dvh-var(--space-8))] overflow-y-auto rounded-[var(--popover-radius)] border border-[var(--popover-border)] bg-[var(--popover-background)] p-[var(--popover-padding)] text-hp-foreground shadow-[var(--popover-shadow)]",
    className,
  ].filter(Boolean).join(" ");

  return createPortal(<div ref={setRefs} {...props} id={contentId} role={role ?? "dialog"}
    {...(hasAriaLabel ? { "aria-label": ariaLabel } : {})}
    {...(resolvedLabelledBy ? { "aria-labelledby": resolvedLabelledBy } : {})}
    {...(resolvedDescribedBy ? { "aria-describedby": resolvedDescribedBy } : {})}
    data-side={side} data-align={align} data-state="open" className={classes}
    style={{ ...style, position: "fixed", top: positionIsCurrent ? position?.top : 0,
      left: positionIsCurrent ? position?.left : 0, visibility: positionIsCurrent ? "visible" : "hidden",
      pointerEvents: positionIsCurrent ? style?.pointerEvents : "none" }}>
    {children}
  </div>, portalContainer);
});

PopoverContent.displayName = "PopoverContent";

export const PopoverClose = forwardRef<HTMLButtonElement, PopoverCloseProps>(function PopoverClose(
  { children, type = "button", onClick, ...props }, forwardedRef,
) {
  const { requestDismiss } = usePopoverContext("PopoverClose");
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) requestDismiss("close-button");
  }, [onClick, requestDismiss]);

  return <button ref={forwardedRef} {...props} type={type} onClick={handleClick}>{children}</button>;
});

PopoverClose.displayName = "PopoverClose";

export const PopoverTitle = forwardRef<HTMLHeadingElement, PopoverTitleProps>(function PopoverTitle(
  { children, className, id, ...props }, forwardedRef,
) {
  const { titleId, registerTitle } = usePopoverContext("PopoverTitle");
  const resolvedTitleId = id ?? titleId;
  useEffect(() => registerTitle(resolvedTitleId), [registerTitle, resolvedTitleId]);
  const classes = [
    "min-w-0 break-words text-[var(--font-size-heading-3)] font-semibold leading-[var(--line-height-heading)] text-hp-foreground",
    className,
  ].filter(Boolean).join(" ");
  return <h2 ref={forwardedRef} {...props} id={resolvedTitleId} className={classes}>{children}</h2>;
});

PopoverTitle.displayName = "PopoverTitle";

export const PopoverDescription = forwardRef<HTMLParagraphElement, PopoverDescriptionProps>(
  function PopoverDescription({ children, className, id, ...props }, forwardedRef) {
    const { descriptionId, registerDescription } = usePopoverContext("PopoverDescription");
    const resolvedDescriptionId = id ?? descriptionId;
    useEffect(
      () => registerDescription(resolvedDescriptionId),
      [registerDescription, resolvedDescriptionId],
    );
    const classes = [
      "min-w-0 break-words text-[var(--font-size-body-sm)] leading-[var(--line-height-body)] text-hp-muted-foreground",
      className,
    ].filter(Boolean).join(" ");
    return <p ref={forwardedRef} {...props} id={resolvedDescriptionId} className={classes}>{children}</p>;
  },
);

PopoverDescription.displayName = "PopoverDescription";

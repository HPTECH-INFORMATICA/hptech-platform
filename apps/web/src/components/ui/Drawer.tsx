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
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type DrawerProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  preventDismiss?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  lockScroll?: boolean;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type DrawerTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

type DrawerSide = "left" | "right" | "bottom";
type DrawerSize = "sm" | "md" | "lg" | "xl";

type DrawerContentBaseProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

type LateralDrawerContentProps = DrawerContentBaseProps & {
  side?: Exclude<DrawerSide, "bottom">;
  size?: DrawerSize;
};

type BottomDrawerContentProps = DrawerContentBaseProps & {
  side: "bottom";
  size?: never;
};

export type DrawerContentProps =
  | LateralDrawerContentProps
  | BottomDrawerContentProps;

export type DrawerCloseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type DrawerHeaderProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

export type DrawerTitleProps = Omit<
  HTMLAttributes<HTMLHeadingElement>,
  "children"
> & {
  children: ReactNode;
};

export type DrawerDescriptionProps = Omit<
  HTMLAttributes<HTMLParagraphElement>,
  "children"
> & {
  children: ReactNode;
};

export type DrawerFooterProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

export type DrawerOverlayProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: ReactNode;
};

type DrawerDismissReason = "escape" | "overlay" | "close-button";

type OverlayPointer = {
  pointerId: number;
};

type InternalTabIndexOwnership = {
  generation: number;
  value: "-1";
};

type DocumentScrollLock = {
  count: number;
  overflow: string;
  paddingRight: string;
};

type DrawerContextValue = {
  resolvedOpen: boolean;
  requestOpenChange: (open: boolean) => void;
  requestDismiss: (reason: DrawerDismissReason) => boolean;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;
  preventDismiss: boolean;
  portalMounted: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus: boolean;
  lockScroll: boolean;
  container?: Element | DocumentFragment | null;
  contentId: string;
  registerContentId: (id: string) => void;
  titleId: string;
  descriptionId: string;
  registeredTitleId: string | null;
  registeredDescriptionId: string | null;
  registerTitle: (id: string) => () => void;
  registerDescription: (id: string) => () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  lastExternalFocusRef: RefObject<HTMLElement | null>;
  openingFocusRef: RefObject<HTMLElement | null>;
  captureFocusForOpening: () => void;
  instanceId: string;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);
const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");
const documentScrollLocks = new Map<Document, DocumentScrollLock>();
const activeDrawers = new Map<HTMLDivElement, number>();
let nextDrawerOrder = 0;

function getLatestRegistration(
  registrations: Map<symbol, string>,
): string | null {
  let latestId: string | null = null;

  for (const id of registrations.values()) {
    latestId = id;
  }

  return latestId;
}

function createConsumerKeyDownEvent(
  nativeEvent: globalThis.KeyboardEvent,
  currentTarget: HTMLDivElement,
): ReactKeyboardEvent<HTMLDivElement> {
  return {
    get altKey() {
      return nativeEvent.altKey;
    },
    get bubbles() {
      return nativeEvent.bubbles;
    },
    get cancelable() {
      return nativeEvent.cancelable;
    },
    get charCode() {
      return nativeEvent.charCode;
    },
    get code() {
      return nativeEvent.code;
    },
    get ctrlKey() {
      return nativeEvent.ctrlKey;
    },
    get currentTarget() {
      return currentTarget;
    },
    get defaultPrevented() {
      return nativeEvent.defaultPrevented;
    },
    get detail() {
      return nativeEvent.detail;
    },
    get eventPhase() {
      return nativeEvent.eventPhase;
    },
    get isTrusted() {
      return nativeEvent.isTrusted;
    },
    get key() {
      return nativeEvent.key;
    },
    get keyCode() {
      return nativeEvent.keyCode;
    },
    get locale() {
      return "";
    },
    get location() {
      return nativeEvent.location;
    },
    get metaKey() {
      return nativeEvent.metaKey;
    },
    get nativeEvent() {
      return nativeEvent;
    },
    get repeat() {
      return nativeEvent.repeat;
    },
    get shiftKey() {
      return nativeEvent.shiftKey;
    },
    get target() {
      return nativeEvent.target ?? currentTarget;
    },
    get timeStamp() {
      return nativeEvent.timeStamp;
    },
    get type() {
      return nativeEvent.type;
    },
    get view() {
      const view = nativeEvent.view ?? currentTarget.ownerDocument.defaultView;

      return {
        document: currentTarget.ownerDocument,
        styleMedia: {
          type: "screen",
          matchMedium: (query: string) =>
            view?.matchMedia(query).matches ?? false,
        },
      };
    },
    get which() {
      return nativeEvent.which;
    },
    getModifierState: (key) => nativeEvent.getModifierState(key),
    isDefaultPrevented: () => nativeEvent.defaultPrevented,
    isPropagationStopped: () => nativeEvent.cancelBubble,
    persist: () => undefined,
    preventDefault: () => nativeEvent.preventDefault(),
    stopPropagation: () => nativeEvent.stopPropagation(),
  };
}

function isElementAvailable(element: HTMLElement): boolean {
  if (!element.isConnected || element.matches(":disabled")) {
    return false;
  }

  if (element.closest('[inert], [aria-hidden="true"]')) {
    return false;
  }

  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);

  return (
    style?.display !== "none" &&
    style?.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

function canReceiveFocus(element: HTMLElement): boolean {
  return (
    isElementAvailable(element) &&
    (element.matches(focusableSelector) || element.hasAttribute("tabindex"))
  );
}

function focusElement(element: HTMLElement): boolean {
  if (!canReceiveFocus(element)) {
    return false;
  }

  element.focus({ preventScroll: true });
  return element.ownerDocument.activeElement === element;
}

function isValidExternalFocus(
  element: Element | null,
  ownerDocument: Document,
  content: HTMLDivElement | null,
): element is HTMLElement {
  const view = ownerDocument.defaultView;

  return Boolean(
    view &&
      element instanceof view.HTMLElement &&
      element.isConnected &&
      element !== ownerDocument.body &&
      !content?.contains(element),
  );
}

function ensureInternalTabIndex(
  content: HTMLDivElement,
  consumerTabIndex: number | undefined,
  generation: number,
  ownershipRef: RefObject<InternalTabIndexOwnership | null>,
): void {
  if (consumerTabIndex !== undefined) {
    ownershipRef.current = null;
    return;
  }

  if (!content.hasAttribute("tabindex")) {
    content.setAttribute("tabindex", "-1");
    ownershipRef.current = { generation, value: "-1" };
  }
}

function acquireScrollLock(ownerDocument: Document): () => void {
  const existingLock = documentScrollLocks.get(ownerDocument);

  if (existingLock) {
    existingLock.count += 1;
  } else {
    const root = ownerDocument.documentElement;
    const view = ownerDocument.defaultView;
    const scrollbarWidth = Math.max(
      0,
      (view?.innerWidth ?? root.clientWidth) - root.clientWidth,
    );
    const computedPadding = Number.parseFloat(
      view?.getComputedStyle(root).paddingRight ?? "0",
    );

    documentScrollLocks.set(ownerDocument, {
      count: 1,
      overflow: root.style.overflow,
      paddingRight: root.style.paddingRight,
    });
    root.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      root.style.paddingRight = `${
        (Number.isFinite(computedPadding) ? computedPadding : 0) +
        scrollbarWidth
      }px`;
    }
  }

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    const lock = documentScrollLocks.get(ownerDocument);

    if (!lock) {
      return;
    }

    lock.count = Math.max(0, lock.count - 1);

    if (lock.count === 0) {
      const root = ownerDocument.documentElement;
      root.style.overflow = lock.overflow;
      root.style.paddingRight = lock.paddingRight;
      documentScrollLocks.delete(ownerDocument);
    }
  };
}

function registerActiveDrawer(content: HTMLDivElement): () => void {
  nextDrawerOrder += 1;
  activeDrawers.set(content, nextDrawerOrder);
  let registered = true;

  return () => {
    if (!registered) {
      return;
    }

    registered = false;
    activeDrawers.delete(content);
  };
}

function isTopActiveDrawer(content: HTMLDivElement): boolean {
  const currentOrder = activeDrawers.get(content);

  if (currentOrder === undefined || !content.isConnected) {
    return false;
  }

  return !Array.from(activeDrawers).some(
    ([activeDrawer, order]) =>
      activeDrawer.isConnected &&
      activeDrawer.ownerDocument === content.ownerDocument &&
      order > currentOrder,
  );
}

function hasActiveDrawerAbove(
  ownerDocument: Document,
  closingOrder: number | undefined,
): boolean {
  if (closingOrder === undefined) {
    return false;
  }

  return Array.from(activeDrawers).some(
    ([activeDrawer, order]) =>
      activeDrawer.isConnected &&
      activeDrawer.ownerDocument === ownerDocument &&
      order > closingOrder,
  );
}

const drawerSizeClasses = {
  sm: "sm:w-[var(--drawer-width-sm)]",
  md: "sm:w-[var(--drawer-width-md)]",
  lg: "sm:w-[var(--drawer-width-lg)]",
  xl: "sm:w-[var(--drawer-width-xl)]",
} as const;

const drawerSideClasses = {
  left: "inset-y-0 left-0 h-full border-r",
  right: "inset-y-0 right-0 h-full border-l",
  bottom:
    "inset-x-0 bottom-0 max-h-[var(--drawer-max-height)] rounded-t-[var(--drawer-radius)] border-t",
} as const;

function useDrawerContext(componentName: string) {
  const context = useContext(DrawerContext);

  if (context === null) {
    throw new Error(`${componentName} deve ser utilizado dentro de Drawer.`);
  }

  return context;
}

export default function Drawer({
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  preventDismiss = false,
  initialFocusRef,
  restoreFocus = true,
  lockScroll = true,
  container,
  children,
}: DrawerProps) {
  const generatedContentId = useId();
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const instanceId = useId();
  const [contentId, setContentId] = useState(generatedContentId);
  const [registeredTitleId, setRegisteredTitleId] = useState<string | null>(
    null,
  );
  const [registeredDescriptionId, setRegisteredDescriptionId] = useState<
    string | null
  >(null);
  const titleRegistrationsRef = useRef(new Map<symbol, string>());
  const descriptionRegistrationsRef = useRef(new Map<symbol, string>());
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastExternalFocusRef = useRef<HTMLElement | null>(null);
  const openingFocusRef = useRef<HTMLElement | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === resolvedOpen) {
        return;
      }

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange, resolvedOpen],
  );

  const registerContentId = useCallback((nextContentId: string) => {
    setContentId((currentContentId) =>
      currentContentId === nextContentId ? currentContentId : nextContentId,
    );
  }, []);

  const captureFocusForOpening = useCallback(() => {
    const ownerDocument = container?.ownerDocument ?? document;
    const activeElement = ownerDocument.activeElement;

    openingFocusRef.current = isValidExternalFocus(
      activeElement,
      ownerDocument,
      contentRef.current,
    )
      ? activeElement
      : lastExternalFocusRef.current;
  }, [container, contentRef]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const ownerDocument = container?.ownerDocument ?? document;
    const view = ownerDocument.defaultView;

    if (!view) {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (resolvedOpen) {
        return;
      }

      const target = event.target;

      if (!(target instanceof view.HTMLElement)) {
        return;
      }

      const originDrawer = target.closest<HTMLElement>(
        "[data-drawer-instance]",
      );

      if (originDrawer?.dataset.drawerInstance === instanceId) {
        return;
      }

      if (
        isValidExternalFocus(target, ownerDocument, contentRef.current)
      ) {
        lastExternalFocusRef.current = target;
      }
    };

    const activeElement = ownerDocument.activeElement;

    if (
      !resolvedOpen &&
      isValidExternalFocus(activeElement, ownerDocument, contentRef.current)
    ) {
      lastExternalFocusRef.current = activeElement;
    }

    ownerDocument.addEventListener("focusin", handleFocusIn);

    return () => ownerDocument.removeEventListener("focusin", handleFocusIn);
  }, [container, contentRef, instanceId, resolvedOpen]);

  const requestDismiss = useCallback(
    (reason: DrawerDismissReason) => {
      if (preventDismiss || !resolvedOpen) {
        return false;
      }

      if (reason === "escape" && !closeOnEscape) {
        return false;
      }

      if (reason === "overlay" && !closeOnOverlayClick) {
        return false;
      }

      requestOpenChange(false);
      return true;
    },
    [
      closeOnEscape,
      closeOnOverlayClick,
      preventDismiss,
      requestOpenChange,
      resolvedOpen,
    ],
  );

  const registerTitle = useCallback((id: string) => {
    const registration = Symbol("drawer-title");
    const registrations = titleRegistrationsRef.current;
    registrations.set(registration, id);
    setRegisteredTitleId(getLatestRegistration(registrations));

    return () => {
      registrations.delete(registration);
      setRegisteredTitleId(getLatestRegistration(registrations));
    };
  }, []);

  const registerDescription = useCallback((id: string) => {
    const registration = Symbol("drawer-description");
    const registrations = descriptionRegistrationsRef.current;
    registrations.set(registration, id);
    setRegisteredDescriptionId(getLatestRegistration(registrations));

    return () => {
      registrations.delete(registration);
      setRegisteredDescriptionId(getLatestRegistration(registrations));
    };
  }, []);

  const contextValue = useMemo<DrawerContextValue>(
    () => ({
      resolvedOpen,
      requestOpenChange,
      requestDismiss,
      closeOnEscape,
      closeOnOverlayClick,
      preventDismiss,
      portalMounted,
      initialFocusRef,
      restoreFocus,
      lockScroll,
      container,
      contentId,
      registerContentId,
      titleId: generatedTitleId,
      descriptionId: generatedDescriptionId,
      registeredTitleId,
      registeredDescriptionId,
      registerTitle,
      registerDescription,
      triggerRef,
      contentRef,
      lastExternalFocusRef,
      openingFocusRef,
      captureFocusForOpening,
      instanceId,
    }),
    [
      closeOnEscape,
      closeOnOverlayClick,
      captureFocusForOpening,
      container,
      contentId,
      generatedDescriptionId,
      generatedTitleId,
      initialFocusRef,
      instanceId,
      lockScroll,
      portalMounted,
      preventDismiss,
      registerContentId,
      registerDescription,
      registerTitle,
      registeredDescriptionId,
      registeredTitleId,
      requestOpenChange,
      requestDismiss,
      resolvedOpen,
      restoreFocus,
    ],
  );

  return (
    <DrawerContext.Provider value={contextValue}>
      {children}
    </DrawerContext.Provider>
  );
}

export const DrawerTrigger = forwardRef<
  HTMLButtonElement,
  DrawerTriggerProps
>(function DrawerTrigger(
  { children, type = "button", onClick, ...props },
  forwardedRef,
) {
  const {
    resolvedOpen,
    requestOpenChange,
    contentId,
    triggerRef,
    captureFocusForOpening,
  } = useDrawerContext("DrawerTrigger");

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, triggerRef],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        captureFocusForOpening();
        requestOpenChange(true);
      }
    },
    [captureFocusForOpening, onClick, requestOpenChange],
  );

  return (
    <button
      ref={setRefs}
      {...props}
      type={type}
      aria-haspopup="dialog"
      aria-expanded={resolvedOpen}
      aria-controls={contentId}
      onClick={handleClick}
    >
      {children}
    </button>
  );
});

DrawerTrigger.displayName = "DrawerTrigger";

export const DrawerContent = forwardRef<
  HTMLDivElement,
  DrawerContentProps
>(function DrawerContent(
  {
    children,
    className,
    id,
    role,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    onKeyDown,
    tabIndex,
    side,
    size,
    ...props
  },
  forwardedRef,
) {
  const {
    resolvedOpen,
    container,
    contentId,
    registerContentId,
    registeredTitleId,
    registeredDescriptionId,
    requestDismiss,
    portalMounted,
    initialFocusRef,
    restoreFocus,
    lockScroll,
    triggerRef,
    contentRef,
    lastExternalFocusRef,
    openingFocusRef,
    instanceId,
  } = useDrawerContext("DrawerContent");
  const [contentElement, setContentElement] =
    useState<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const openingGenerationRef = useRef(0);
  const initialFocusFrameRef = useRef<number | null>(null);
  const restoreFocusFrameRef = useRef<number | null>(null);
  const releaseScrollLockRef = useRef<(() => void) | null>(null);
  const releaseActiveDrawerRef = useRef<(() => void) | null>(null);
  const internalTabIndexRef = useRef<InternalTabIndexOwnership | null>(null);
  const lastFocusedInsideRef = useRef<HTMLElement | null>(null);
  const appliedInitialFocusRef = useRef(initialFocusRef);
  const appliedConsumerTabIndexRef = useRef(tabIndex);
  const currentInitialFocusRef = useRef(initialFocusRef);
  const currentConsumerTabIndexRef = useRef(tabIndex);
  const currentResolvedOpenRef = useRef(resolvedOpen);
  const resolvedContentId = id ?? contentId;
  const resolvedSide = side ?? "right";
  const resolvedSize = resolvedSide === "bottom" ? undefined : (size ?? "md");
  const hasAriaLabel =
    typeof ariaLabel === "string" && ariaLabel.trim().length > 0;
  const explicitLabelledBy = ariaLabelledBy?.trim() || undefined;
  const explicitDescribedBy = ariaDescribedBy?.trim() || undefined;
  const resolvedLabelledBy = hasAriaLabel
    ? explicitLabelledBy
    : (explicitLabelledBy ?? registeredTitleId ?? undefined);
  const resolvedDescribedBy =
    explicitDescribedBy ?? registeredDescriptionId ?? undefined;

  useEffect(() => {
    registerContentId(resolvedContentId);
  }, [registerContentId, resolvedContentId]);

  useEffect(() => {
    currentInitialFocusRef.current = initialFocusRef;
    currentConsumerTabIndexRef.current = tabIndex;
    currentResolvedOpenRef.current = resolvedOpen;
  }, [initialFocusRef, resolvedOpen, tabIndex]);

  const handleContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      setContentElement(node);

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [contentRef, forwardedRef],
  );

  useEffect(() => {
    return () => {
      openingGenerationRef.current += 1;

      if (initialFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(initialFocusFrameRef.current);
        initialFocusFrameRef.current = null;
      }

      if (restoreFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFocusFrameRef.current);
        restoreFocusFrameRef.current = null;
      }

      releaseActiveDrawerRef.current?.();
      releaseActiveDrawerRef.current = null;
      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;

      const content = contentRef.current;
      const internalTabIndex = internalTabIndexRef.current;

      if (
        content &&
        currentConsumerTabIndexRef.current === undefined &&
        internalTabIndex &&
        content.getAttribute("tabindex") === internalTabIndex.value
      ) {
        content.removeAttribute("tabindex");
      }

      contentRef.current = null;
      internalTabIndexRef.current = null;
      lastFocusedInsideRef.current = null;
      wasOpenRef.current = false;
    };
  }, [contentRef]);

  useEffect(() => {
    if (contentElement === null) {
      return;
    }

    const ownerDocument = contentElement.ownerDocument;
    const view = ownerDocument.defaultView;

    if (!view) {
      return;
    }

    if (tabIndex !== undefined && internalTabIndexRef.current) {
      internalTabIndexRef.current = null;
    }

    if (!resolvedOpen || !contentElement.isConnected) {
      const closingGeneration = openingGenerationRef.current;
      const closingOrder = activeDrawers.get(contentElement);
      openingGenerationRef.current += 1;

      if (initialFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(initialFocusFrameRef.current);
        initialFocusFrameRef.current = null;
      }

      releaseActiveDrawerRef.current?.();
      releaseActiveDrawerRef.current = null;
      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;

      const internalTabIndex = internalTabIndexRef.current;

      if (
        tabIndex === undefined &&
        internalTabIndex?.generation === closingGeneration &&
        contentElement.getAttribute("tabindex") === internalTabIndex.value
      ) {
        contentElement.removeAttribute("tabindex");
      }

      internalTabIndexRef.current = null;

      if (wasOpenRef.current && restoreFocus) {
        const generation = openingGenerationRef.current;
        const trigger = triggerRef.current;
        const previousFocus = previouslyFocusedRef.current;

        if (restoreFocusFrameRef.current !== null) {
          view.cancelAnimationFrame(restoreFocusFrameRef.current);
        }

        const restoreFrame = view.requestAnimationFrame(() => {
          if (restoreFocusFrameRef.current !== restoreFrame) {
            return;
          }

          restoreFocusFrameRef.current = null;

          if (
            openingGenerationRef.current !== generation ||
            currentResolvedOpenRef.current ||
            hasActiveDrawerAbove(ownerDocument, closingOrder)
          ) {
            return;
          }

          if (trigger && focusElement(trigger)) {
            return;
          }

          if (previousFocus) {
            focusElement(previousFocus);
          }
        });
        restoreFocusFrameRef.current = restoreFrame;
      }

      wasOpenRef.current = false;
      return;
    }

    const focusConfigurationChanged =
      wasOpenRef.current && appliedInitialFocusRef.current !== initialFocusRef;
    const tabIndexConfigurationChanged =
      wasOpenRef.current && appliedConsumerTabIndexRef.current !== tabIndex;

    if (!wasOpenRef.current || focusConfigurationChanged) {
      const previousGeneration = openingGenerationRef.current;
      const internalTabIndex = internalTabIndexRef.current;

      if (
        focusConfigurationChanged &&
        tabIndex === undefined &&
        internalTabIndex?.generation === previousGeneration &&
        contentElement.getAttribute("tabindex") === internalTabIndex.value
      ) {
        contentElement.removeAttribute("tabindex");
        internalTabIndexRef.current = null;
      }

      openingGenerationRef.current += 1;

      if (restoreFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(restoreFocusFrameRef.current);
        restoreFocusFrameRef.current = null;
      }

      if (!wasOpenRef.current) {
        const activeElement = ownerDocument.activeElement;
        const openingFocus =
          openingFocusRef.current ?? lastExternalFocusRef.current;
        openingFocusRef.current = null;
        previouslyFocusedRef.current = isValidExternalFocus(
          openingFocus,
          ownerDocument,
          contentElement,
        )
          ? openingFocus
          : isValidExternalFocus(
                activeElement,
                ownerDocument,
                contentElement,
              )
            ? activeElement
            : null;
        lastFocusedInsideRef.current =
          activeElement instanceof view.HTMLElement &&
          contentElement.contains(activeElement) &&
          isElementAvailable(activeElement)
            ? activeElement
            : null;
      }
    }

    if (!activeDrawers.has(contentElement)) {
      releaseActiveDrawerRef.current = registerActiveDrawer(contentElement);
    }

    if (lockScroll) {
      if (!releaseScrollLockRef.current) {
        releaseScrollLockRef.current = acquireScrollLock(ownerDocument);
      }
    } else {
      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;
    }

    if (tabIndexConfigurationChanged && tabIndex === undefined) {
      const hasFocusableElement = Array.from(
        contentElement.querySelectorAll<HTMLElement>(focusableSelector),
      ).some(canReceiveFocus);

      if (!hasFocusableElement) {
        ensureInternalTabIndex(
          contentElement,
          tabIndex,
          openingGenerationRef.current,
          internalTabIndexRef,
        );
      }
    }

    if (!wasOpenRef.current || focusConfigurationChanged) {
      const generation = openingGenerationRef.current;
      const scheduledInitialFocusRef = initialFocusRef;

      if (initialFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(initialFocusFrameRef.current);
      }

      const focusFrame = view.requestAnimationFrame(() => {
        if (initialFocusFrameRef.current !== focusFrame) {
          return;
        }

        initialFocusFrameRef.current = null;

        if (
          openingGenerationRef.current !== generation ||
          !contentElement.isConnected ||
          !currentResolvedOpenRef.current ||
          currentInitialFocusRef.current !== scheduledInitialFocusRef ||
          !isTopActiveDrawer(contentElement)
        ) {
          return;
        }
        const activeElement = ownerDocument.activeElement;
        const explicitTarget = scheduledInitialFocusRef?.current;

        if (
          explicitTarget &&
          contentElement.contains(explicitTarget) &&
          focusElement(explicitTarget)
        ) {
          return;
        }

        if (
          activeElement instanceof view.HTMLElement &&
          contentElement.contains(activeElement)
        ) {
          return;
        }

        const autofocusTarget =
          contentElement.querySelector<HTMLElement>("[autofocus]");

        if (autofocusTarget && focusElement(autofocusTarget)) {
          return;
        }

        const firstInteractive = Array.from(
          contentElement.querySelectorAll<HTMLElement>(focusableSelector),
        ).find(canReceiveFocus);

        if (firstInteractive && focusElement(firstInteractive)) {
          return;
        }

        ensureInternalTabIndex(
          contentElement,
          tabIndex,
          generation,
          internalTabIndexRef,
        );

        focusElement(contentElement);
      });
      initialFocusFrameRef.current = focusFrame;
    }

    wasOpenRef.current = true;
    appliedInitialFocusRef.current = initialFocusRef;
    appliedConsumerTabIndexRef.current = tabIndex;
  }, [
    contentElement,
    initialFocusRef,
    lockScroll,
    resolvedOpen,
    restoreFocus,
    tabIndex,
    triggerRef,
    lastExternalFocusRef,
    openingFocusRef,
  ]);

  useEffect(() => {
    if (!resolvedOpen || contentElement === null || !contentElement.isConnected) {
      return;
    }

    const ownerDocument = contentElement.ownerDocument;
    const view = ownerDocument.defaultView;

    if (!view) {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopActiveDrawer(contentElement)) {
        return;
      }

      const target = event.target;

      if (!(target instanceof view.HTMLElement)) {
        return;
      }

      if (contentElement.contains(target)) {
        if (isElementAvailable(target)) {
          lastFocusedInsideRef.current = target;
        }

        return;
      }

      const previousInternalFocus = lastFocusedInsideRef.current;

      if (
        previousInternalFocus &&
        contentElement.contains(previousInternalFocus) &&
        focusElement(previousInternalFocus)
      ) {
        return;
      }

      const firstFocusable = Array.from(
        contentElement.querySelectorAll<HTMLElement>(focusableSelector),
      ).find(canReceiveFocus);

      if (firstFocusable && focusElement(firstFocusable)) {
        return;
      }

      ensureInternalTabIndex(
        contentElement,
        currentConsumerTabIndexRef.current,
        openingGenerationRef.current,
        internalTabIndexRef,
      );
      focusElement(contentElement);
    };

    ownerDocument.addEventListener("focusin", handleFocusIn);

    return () => ownerDocument.removeEventListener("focusin", handleFocusIn);
  }, [contentElement, resolvedOpen]);

  useEffect(() => {
    const content = contentElement;

    if (!portalMounted || !resolvedOpen || content === null) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const eventTarget = event.target;
      const originContent =
        eventTarget instanceof Element
          ? eventTarget.closest("[data-drawer-content]")
          : null;

      if (originContent !== content) {
        return;
      }

      if (!isTopActiveDrawer(content)) {
        return;
      }

      onKeyDown?.(createConsumerKeyDownEvent(event, content));

      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = Array.from(
          content.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter(canReceiveFocus);
        const activeElement = content.ownerDocument.activeElement;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);

        if (!firstElement || !lastElement) {
          event.preventDefault();
          ensureInternalTabIndex(
            content,
            currentConsumerTabIndexRef.current,
            openingGenerationRef.current,
            internalTabIndexRef,
          );
          focusElement(content);
          return;
        }

        if (!content.contains(activeElement)) {
          event.preventDefault();
          focusElement(event.shiftKey ? lastElement : firstElement);
          return;
        }

        if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          focusElement(firstElement);
          return;
        }

        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          focusElement(lastElement);
        }

        return;
      }

      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();

      if (requestDismiss("escape")) {
        event.stopPropagation();
      }
    };

    content.addEventListener("keydown", handleKeyDown, true);

    return () => content.removeEventListener("keydown", handleKeyDown, true);
  }, [contentElement, onKeyDown, portalMounted, requestDismiss, resolvedOpen]);

  const classes = useMemo(
    () =>
      [
        "fixed z-[var(--z-drawer)] flex w-full max-w-full flex-col overflow-y-auto border-[var(--drawer-border)] bg-[var(--drawer-background)] text-hp-foreground shadow-[var(--drawer-shadow)]",
        drawerSideClasses[resolvedSide],
        resolvedSize === undefined ? null : drawerSizeClasses[resolvedSize],
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [className, resolvedSide, resolvedSize],
  );

  if (!portalMounted || !resolvedOpen) {
    return null;
  }

  const portalContainer = container ?? document.body;

  return createPortal(
    <div
      ref={handleContentRef}
      {...props}
      id={resolvedContentId}
      role={role ?? "dialog"}
      aria-modal="true"
      tabIndex={tabIndex}
      data-drawer-content=""
      data-drawer-instance={instanceId}
      {...(hasAriaLabel ? { "aria-label": ariaLabel } : {})}
      {...(resolvedLabelledBy === undefined
        ? {}
        : { "aria-labelledby": resolvedLabelledBy })}
      {...(resolvedDescribedBy === undefined
        ? {}
        : { "aria-describedby": resolvedDescribedBy })}
      data-side={resolvedSide}
      {...(resolvedSize === undefined ? {} : { "data-size": resolvedSize })}
      className={classes}
    >
      {children}
    </div>,
    portalContainer,
  );
});

DrawerContent.displayName = "DrawerContent";

export const DrawerClose = forwardRef<HTMLButtonElement, DrawerCloseProps>(
  function DrawerClose(
    { children, type = "button", onClick, ...props },
    forwardedRef,
  ) {
    const { requestDismiss } = useDrawerContext("DrawerClose");

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          requestDismiss("close-button");
        }
      },
      [onClick, requestDismiss],
    );

    return (
      <button
        ref={forwardedRef}
        {...props}
        type={type}
        onClick={handleClick}
      >
        {children}
      </button>
    );
  },
);

DrawerClose.displayName = "DrawerClose";

export const DrawerOverlay = forwardRef<HTMLDivElement, DrawerOverlayProps>(
  function DrawerOverlay(
    {
      children,
      className,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      ...props
    },
    forwardedRef,
  ) {
    const { resolvedOpen, requestDismiss, container, portalMounted } =
      useDrawerContext("DrawerOverlay");
    const pointerRef = useRef<OverlayPointer | null>(null);

    useEffect(() => {
      if (!resolvedOpen) {
        pointerRef.current = null;
      }

      return () => {
        pointerRef.current = null;
      };
    }, [resolvedOpen]);

    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        onPointerDown?.(event);

        if (event.defaultPrevented || event.target !== event.currentTarget) {
          pointerRef.current = null;
          return;
        }

        pointerRef.current = { pointerId: event.pointerId };
      },
      [onPointerDown],
    );

    const handlePointerUp = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        onPointerUp?.(event);

        if (event.defaultPrevented) {
          pointerRef.current = null;
          return;
        }

        const pointer = pointerRef.current;
        pointerRef.current = null;

        if (
          pointer === null ||
          pointer.pointerId !== event.pointerId ||
          event.target !== event.currentTarget
        ) {
          return;
        }

        requestDismiss("overlay");
      },
      [onPointerUp, requestDismiss],
    );

    const handlePointerCancel = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        onPointerCancel?.(event);
        pointerRef.current = null;
      },
      [onPointerCancel],
    );

    if (!portalMounted || !resolvedOpen) {
      return null;
    }

    const portalContainer = container ?? document.body;
    const classes = [
      "fixed inset-0 z-[var(--z-drawer-overlay)] bg-[var(--drawer-overlay-background)]",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return createPortal(
      <div
        ref={forwardedRef}
        {...props}
        className={classes}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {children}
      </div>,
      portalContainer,
    );
  },
);

DrawerOverlay.displayName = "DrawerOverlay";

export const DrawerHeader = forwardRef<HTMLDivElement, DrawerHeaderProps>(
  function DrawerHeader({ children, className, ...props }, forwardedRef) {
    const classes = [
      "flex min-w-0 flex-col gap-[var(--space-2)] text-start",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={forwardedRef} {...props} className={classes}>
        {children}
      </div>
    );
  },
);

DrawerHeader.displayName = "DrawerHeader";

export const DrawerTitle = forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  function DrawerTitle({ children, className, id, ...props }, forwardedRef) {
    const { titleId, registerTitle } = useDrawerContext("DrawerTitle");
    const resolvedTitleId = id?.trim() || titleId;

    useEffect(
      () => registerTitle(resolvedTitleId),
      [registerTitle, resolvedTitleId],
    );

    const classes = [
      "min-w-0 break-words text-[var(--font-size-heading-3)] font-semibold leading-[var(--line-height-heading)] text-hp-foreground",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <h2
        ref={forwardedRef}
        {...props}
        id={resolvedTitleId}
        className={classes}
      >
        {children}
      </h2>
    );
  },
);

DrawerTitle.displayName = "DrawerTitle";

export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  DrawerDescriptionProps
>(function DrawerDescription(
  { children, className, id, ...props },
  forwardedRef,
) {
  const { descriptionId, registerDescription } = useDrawerContext(
    "DrawerDescription",
  );
  const resolvedDescriptionId = id?.trim() || descriptionId;

  useEffect(
    () => registerDescription(resolvedDescriptionId),
    [registerDescription, resolvedDescriptionId],
  );

  const classes = [
    "min-w-0 break-words text-sm leading-[var(--line-height-normal)] text-hp-muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p
      ref={forwardedRef}
      {...props}
      id={resolvedDescriptionId}
      className={classes}
    >
      {children}
    </p>
  );
});

DrawerDescription.displayName = "DrawerDescription";

export const DrawerFooter = forwardRef<HTMLDivElement, DrawerFooterProps>(
  function DrawerFooter({ children, className, ...props }, forwardedRef) {
    const classes = [
      "flex min-w-0 flex-col-reverse gap-[var(--space-2)] pt-[var(--space-4)] sm:flex-row sm:justify-end",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={forwardedRef} {...props} className={classes}>
        {children}
      </div>
    );
  },
);

DrawerFooter.displayName = "DrawerFooter";

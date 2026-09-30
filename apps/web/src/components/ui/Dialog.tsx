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
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

export type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  preventDismiss?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type DialogTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type DialogContentProps = Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "children" | "open"
> & {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
};

const dialogSizeClasses = {
  sm: "max-w-md",
  md: "max-w-[var(--modal-width-md)]",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const;

export type DialogCloseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
};

export type DialogHeaderProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

export type DialogTitleProps = Omit<
  HTMLAttributes<HTMLHeadingElement>,
  "children"
> & {
  children: ReactNode;
};

export type DialogDescriptionProps = Omit<
  HTMLAttributes<HTMLParagraphElement>,
  "children"
> & {
  children: ReactNode;
};

export type DialogFooterProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

type DialogContextValue = {
  resolvedOpen: boolean;
  requestOpenChange: (open: boolean) => void;
  modal: boolean;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;
  preventDismiss: boolean;
  requestDismiss: (reason: DialogDismissReason) => boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus: boolean;
  container?: Element | DocumentFragment | null;
  contentId: string;
  registerContentId: (id: string) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  descriptionId: string;
  registeredTitleId: string | null;
  registeredDescriptionId: string | null;
  registerTitle: (id: string) => () => void;
  registerDescription: (id: string) => () => void;
};

type DialogDismissReason = "escape" | "overlay" | "close-button";

type BackdropPointer = {
  pointerId: number;
  startedOnBackdrop: boolean;
  endedOnBackdrop: boolean;
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

type ConsumerCancelEventAdapter = {
  event: SyntheticEvent<HTMLDialogElement, Event>;
  isConsumerPrevented: () => boolean;
};

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
const activeModalDialogs = new Map<HTMLDialogElement, number>();
let nextModalOrder = 0;

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(componentName: string) {
  const context = useContext(DialogContext);

  if (context === null) {
    throw new Error(`${componentName} deve ser utilizado dentro de Dialog.`);
  }

  return context;
}

function isPointInsideDialog(
  event: PointerEvent<HTMLDialogElement>,
): boolean {
  const rect = event.currentTarget.getBoundingClientRect();

  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function isPointerFromAnotherDialog(
  target: EventTarget | null,
  currentDialog: HTMLDialogElement,
): boolean {
  const view = currentDialog.ownerDocument.defaultView;

  if (!view || !(target instanceof view.Node)) {
    return false;
  }

  const originElement =
    target instanceof view.Element ? target : target.parentElement;
  const originDialog = originElement?.closest("dialog");

  return (
    originDialog instanceof view.HTMLDialogElement &&
    originDialog !== currentDialog
  );
}

function isPointerFromCurrentDialogContent(
  target: EventTarget | null,
  currentDialog: HTMLDialogElement,
): boolean {
  const view = currentDialog.ownerDocument.defaultView;

  return Boolean(
    view &&
      target instanceof view.Node &&
      target !== currentDialog &&
      currentDialog.contains(target),
  );
}

function createConsumerCancelEvent(
  nativeEvent: Event,
  currentTarget: HTMLDialogElement,
): ConsumerCancelEventAdapter {
  let consumerPrevented = nativeEvent.defaultPrevented;
  const event: SyntheticEvent<HTMLDialogElement, Event> = {
    get bubbles() {
      return nativeEvent.bubbles;
    },
    get cancelable() {
      return nativeEvent.cancelable;
    },
    get currentTarget() {
      return currentTarget;
    },
    get defaultPrevented() {
      return consumerPrevented || nativeEvent.defaultPrevented;
    },
    get eventPhase() {
      return nativeEvent.eventPhase;
    },
    get isTrusted() {
      return nativeEvent.isTrusted;
    },
    get nativeEvent() {
      return nativeEvent;
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
    isDefaultPrevented: () =>
      consumerPrevented || nativeEvent.defaultPrevented,
    isPropagationStopped: () => nativeEvent.cancelBubble,
    persist: () => undefined,
    preventDefault: () => {
      consumerPrevented = true;

      if (nativeEvent.cancelable) {
        nativeEvent.preventDefault();
      }
    },
    stopPropagation: () => nativeEvent.stopPropagation(),
  };

  return {
    event,
    isConsumerPrevented: () =>
      consumerPrevented || nativeEvent.defaultPrevented,
  };
}

function createConsumerKeyDownEvent(
  nativeEvent: globalThis.KeyboardEvent,
  currentTarget: HTMLDialogElement,
): ReactKeyboardEvent<HTMLDialogElement> {
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

function hasActiveModalAbove(
  ownerDocument: Document,
  closingOrder: number | undefined,
): boolean {
  if (closingOrder === undefined) {
    return false;
  }

  return Array.from(activeModalDialogs).some(
    ([activeDialog, activeOrder]) =>
      activeDialog.isConnected &&
      activeDialog.open &&
      activeDialog.ownerDocument === ownerDocument &&
      activeOrder > closingOrder,
  );
}

export default function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  preventDismiss = false,
  initialFocusRef,
  restoreFocus = true,
  container,
  children,
}: DialogProps) {
  const generatedContentId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const [contentId, setContentId] = useState(generatedContentId);
  const [registeredTitleId, setRegisteredTitleId] = useState<string | null>(
    null,
  );
  const [registeredDescriptionId, setRegisteredDescriptionId] = useState<
    string | null
  >(null);
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDialogElement | null>(null);
  const titleRegistrationsRef = useRef(new Map<symbol, string>());
  const descriptionRegistrationsRef = useRef(new Map<symbol, string>());
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

  const requestDismiss = useCallback(
    (reason: DialogDismissReason) => {
      if (preventDismiss || !resolvedOpen) {
        return false;
      }

      if (reason === "escape" && !closeOnEscape) {
        return false;
      }

      if (reason === "overlay" && (!modal || !closeOnOverlayClick)) {
        return false;
      }

      requestOpenChange(false);
      return true;
    },
    [
      closeOnEscape,
      closeOnOverlayClick,
      modal,
      preventDismiss,
      requestOpenChange,
      resolvedOpen,
    ],
  );

  const registerTitle = useCallback((id: string) => {
    const registration = Symbol("dialog-title");
    const registrations = titleRegistrationsRef.current;
    registrations.set(registration, id);
    setRegisteredTitleId(registrations.values().next().value ?? null);

    return () => {
      registrations.delete(registration);
      setRegisteredTitleId(registrations.values().next().value ?? null);
    };
  }, []);

  const registerDescription = useCallback((id: string) => {
    const registration = Symbol("dialog-description");
    const registrations = descriptionRegistrationsRef.current;
    registrations.set(registration, id);
    setRegisteredDescriptionId(registrations.values().next().value ?? null);

    return () => {
      registrations.delete(registration);
      setRegisteredDescriptionId(registrations.values().next().value ?? null);
    };
  }, []);

  const contextValue = useMemo<DialogContextValue>(
    () => ({
      resolvedOpen,
      requestOpenChange,
      modal,
      closeOnEscape,
      closeOnOverlayClick,
      preventDismiss,
      requestDismiss,
      initialFocusRef,
      restoreFocus,
      container,
      contentId,
      registerContentId,
      triggerRef,
      contentRef,
      titleId,
      descriptionId,
      registeredTitleId,
      registeredDescriptionId,
      registerTitle,
      registerDescription,
    }),
    [
      closeOnEscape,
      closeOnOverlayClick,
      container,
      contentId,
      modal,
      preventDismiss,
      initialFocusRef,
      restoreFocus,
      descriptionId,
      registeredDescriptionId,
      registeredTitleId,
      registerDescription,
      registerContentId,
      registerTitle,
      requestOpenChange,
      requestDismiss,
      resolvedOpen,
      titleId,
    ],
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  );
}

export const DialogTrigger = forwardRef<
  HTMLButtonElement,
  DialogTriggerProps
>(function DialogTrigger(
  { children, type = "button", onClick, ...props },
  forwardedRef,
) {
  const { resolvedOpen, requestOpenChange, contentId, triggerRef } =
    useDialogContext("DialogTrigger");

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, triggerRef],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        requestOpenChange(true);
      }
    },
    [onClick, requestOpenChange],
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

DialogTrigger.displayName = "DialogTrigger";

export const DialogContent = forwardRef<
  HTMLDialogElement,
  DialogContentProps
>(function DialogContent(
  {
    children,
    className,
    size = "md",
    id,
    onClose,
    onCancel,
    onKeyDown,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    tabIndex,
    "aria-label": ariaLabel,
    "aria-labelledby": consumerLabelledBy,
    "aria-describedby": consumerDescribedBy,
    ...props
  },
  forwardedRef,
) {
  const {
    resolvedOpen,
    requestOpenChange,
    modal,
    container,
    contentId,
    registerContentId,
    contentRef,
    registeredTitleId,
    registeredDescriptionId,
    requestDismiss,
    initialFocusRef,
    restoreFocus,
    triggerRef,
  } = useDialogContext("DialogContent");
  const [mounted, setMounted] = useState(false);
  const [dialogElement, setDialogElement] =
    useState<HTMLDialogElement | null>(null);
  const [nativeSyncVersion, setNativeSyncVersion] = useState(0);
  const suppressNativeCloseRequestRef = useRef(false);
  const backdropPointerRef = useRef<BackdropPointer | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const openingGenerationRef = useRef(0);
  const initialFocusFrameRef = useRef<number | null>(null);
  const restoreFocusFrameRef = useRef<number | null>(null);
  const releaseScrollLockRef = useRef<(() => void) | null>(null);
  const lockedDialogRef = useRef<HTMLDialogElement | null>(null);
  const internalTabIndexRef = useRef<InternalTabIndexOwnership | null>(null);
  const appliedFocusModalRef = useRef(modal);
  const appliedInitialFocusRef = useRef(initialFocusRef);
  const currentFocusModalRef = useRef(modal);
  const currentInitialFocusRef = useRef(initialFocusRef);
  const currentConsumerTabIndexRef = useRef(tabIndex);
  const handledEscapeCycleRef = useRef<symbol | null>(null);
  const resolvedContentId = id ?? contentId;
  const resolvedLabelledBy =
    consumerLabelledBy?.trim() || (ariaLabel ? undefined : registeredTitleId);
  const resolvedDescribedBy =
    consumerDescribedBy?.trim() || registeredDescriptionId || undefined;

  useEffect(() => {
    currentFocusModalRef.current = modal;
    currentInitialFocusRef.current = initialFocusRef;
    currentConsumerTabIndexRef.current = tabIndex;
  }, [initialFocusRef, modal, tabIndex]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    registerContentId(resolvedContentId);
  }, [registerContentId, resolvedContentId]);

  useEffect(
    () => () => {
      backdropPointerRef.current = null;
      openingGenerationRef.current += 1;

      if (initialFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(initialFocusFrameRef.current);
      }

      if (restoreFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFocusFrameRef.current);
      }

      const content = contentRef.current;

      if (content) {
        activeModalDialogs.delete(content);

        const internalTabIndex = internalTabIndexRef.current;

        if (
          currentConsumerTabIndexRef.current === undefined &&
          internalTabIndex &&
          content.getAttribute("tabindex") === internalTabIndex.value
        ) {
          content.removeAttribute("tabindex");
        }
      }

      if (lockedDialogRef.current) {
        activeModalDialogs.delete(lockedDialogRef.current);
      }

      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;
      lockedDialogRef.current = null;
      wasOpenRef.current = false;
      internalTabIndexRef.current = null;
      handledEscapeCycleRef.current = null;
    },
    [contentRef],
  );

  useEffect(() => {
    if (!dialogElement || !dialogElement.isConnected) {
      return;
    }

    const ownerDocument = dialogElement.ownerDocument;
    const view = ownerDocument.defaultView;

    if (!view) {
      return;
    }

    if (tabIndex !== undefined && internalTabIndexRef.current) {
      internalTabIndexRef.current = null;
    }

    if (!resolvedOpen) {
      const closingGeneration = openingGenerationRef.current;
      const closingOrder = activeModalDialogs.get(dialogElement);
      openingGenerationRef.current += 1;

      if (initialFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(initialFocusFrameRef.current);
        initialFocusFrameRef.current = null;
      }

      if (dialogElement.open) {
        suppressNativeCloseRequestRef.current = true;
        dialogElement.close();
      }

      activeModalDialogs.delete(dialogElement);
      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;
      lockedDialogRef.current = null;

      const internalTabIndex = internalTabIndexRef.current;

      if (
        tabIndex === undefined &&
        internalTabIndex?.generation === closingGeneration &&
        dialogElement.getAttribute("tabindex") === internalTabIndex.value
      ) {
        dialogElement.removeAttribute("tabindex");
      }

      internalTabIndexRef.current = null;

      if (wasOpenRef.current && restoreFocus) {
        const generation = openingGenerationRef.current;
        const trigger = triggerRef.current;
        const previousFocus = previouslyFocusedRef.current;

        if (restoreFocusFrameRef.current !== null) {
          view.cancelAnimationFrame(restoreFocusFrameRef.current);
        }

        restoreFocusFrameRef.current = view.requestAnimationFrame(() => {
          restoreFocusFrameRef.current = null;

          if (
            openingGenerationRef.current !== generation ||
            dialogElement.open ||
            hasActiveModalAbove(ownerDocument, closingOrder)
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
      }

      wasOpenRef.current = false;

      return;
    }

    const focusConfigurationChanged =
      wasOpenRef.current &&
      (appliedFocusModalRef.current !== modal ||
        appliedInitialFocusRef.current !== initialFocusRef);

    if (!wasOpenRef.current || focusConfigurationChanged) {
      const previousGeneration = openingGenerationRef.current;
      const internalTabIndex = internalTabIndexRef.current;

      if (
        focusConfigurationChanged &&
        tabIndex === undefined &&
        internalTabIndex?.generation === previousGeneration &&
        dialogElement.getAttribute("tabindex") === internalTabIndex.value
      ) {
        dialogElement.removeAttribute("tabindex");
        internalTabIndexRef.current = null;
      }

      openingGenerationRef.current += 1;

      if (restoreFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(restoreFocusFrameRef.current);
        restoreFocusFrameRef.current = null;
      }

      if (!wasOpenRef.current) {
        const activeElement = ownerDocument.activeElement;
        previouslyFocusedRef.current =
          activeElement instanceof view.HTMLElement &&
          activeElement.isConnected &&
          activeElement !== ownerDocument.body &&
          !dialogElement.contains(activeElement)
            ? activeElement
            : null;
      }
    }

    const isCurrentlyModal = dialogElement.matches(":modal");

    if (dialogElement.open && isCurrentlyModal !== modal) {
      suppressNativeCloseRequestRef.current = true;
      dialogElement.close();
    }

    if (!dialogElement.open) {
      if (modal) {
        dialogElement.showModal();
      } else {
        dialogElement.show();
      }
    }

    if (modal && dialogElement.open) {
      if (!activeModalDialogs.has(dialogElement)) {
        nextModalOrder += 1;
        activeModalDialogs.set(dialogElement, nextModalOrder);
      }

      if (!releaseScrollLockRef.current) {
        releaseScrollLockRef.current = acquireScrollLock(ownerDocument);
        lockedDialogRef.current = dialogElement;
      }
    } else {
      activeModalDialogs.delete(dialogElement);
      releaseScrollLockRef.current?.();
      releaseScrollLockRef.current = null;
      lockedDialogRef.current = null;
    }

    if (!wasOpenRef.current || focusConfigurationChanged) {
      const generation = openingGenerationRef.current;
      const scheduledModal = modal;
      const scheduledInitialFocusRef = initialFocusRef;

      if (initialFocusFrameRef.current !== null) {
        view.cancelAnimationFrame(initialFocusFrameRef.current);
      }

      const focusFrame = view.requestAnimationFrame(() => {
        if (initialFocusFrameRef.current !== focusFrame) {
          return;
        }

        if (
          openingGenerationRef.current !== generation ||
          !dialogElement.isConnected ||
          !dialogElement.open ||
          currentFocusModalRef.current !== scheduledModal ||
          currentInitialFocusRef.current !== scheduledInitialFocusRef
        ) {
          return;
        }

        initialFocusFrameRef.current = null;

        const activeElement = ownerDocument.activeElement;
        const explicitTarget = scheduledInitialFocusRef?.current;

        if (
          explicitTarget &&
          dialogElement.contains(explicitTarget) &&
          focusElement(explicitTarget)
        ) {
          return;
        }

        if (
          activeElement instanceof view.HTMLElement &&
          dialogElement.contains(activeElement)
        ) {
          return;
        }

        if (!scheduledModal) {
          return;
        }

        const autofocusTarget = dialogElement.querySelector<HTMLElement>(
          "[autofocus]",
        );

        if (autofocusTarget && focusElement(autofocusTarget)) {
          return;
        }

        const firstInteractive = Array.from(
          dialogElement.querySelectorAll<HTMLElement>(focusableSelector),
        ).find(canReceiveFocus);

        if (firstInteractive && focusElement(firstInteractive)) {
          return;
        }

        if (!dialogElement.hasAttribute("tabindex")) {
          dialogElement.setAttribute("tabindex", "-1");
          internalTabIndexRef.current = {
            generation,
            value: "-1",
          };
        }

        focusElement(dialogElement);
      });
      initialFocusFrameRef.current = focusFrame;
    }

    wasOpenRef.current = true;
    appliedFocusModalRef.current = modal;
    appliedInitialFocusRef.current = initialFocusRef;
  }, [
    dialogElement,
    initialFocusRef,
    modal,
    nativeSyncVersion,
    resolvedOpen,
    restoreFocus,
    tabIndex,
    triggerRef,
  ]);

  useEffect(() => {
    if (!dialogElement) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      onKeyDown?.(createConsumerKeyDownEvent(event, dialogElement));

      if (!resolvedOpen || event.key !== "Escape") {
        return;
      }

      const escapeCycle = Symbol("dialog-escape-cycle");
      handledEscapeCycleRef.current = escapeCycle;

      queueMicrotask(() => {
        if (handledEscapeCycleRef.current === escapeCycle) {
          handledEscapeCycleRef.current = null;
        }
      });

      if (event.defaultPrevented) {
        return;
      }

      event.preventDefault();

      if (requestDismiss("escape")) {
        event.stopPropagation();
      }
    };

    const handleCancel = (event: Event) => {
      const consumerEvent = createConsumerCancelEvent(event, dialogElement);
      onCancel?.(consumerEvent.event);
      const consumerPrevented = consumerEvent.isConsumerPrevented();

      if (event.cancelable) {
        event.preventDefault();
      }

      if (handledEscapeCycleRef.current !== null || consumerPrevented) {
        return;
      }

      requestDismiss("escape");
    };

    dialogElement.addEventListener("keydown", handleKeyDown, {
      capture: true,
    });
    dialogElement.addEventListener("cancel", handleCancel);

    return () => {
      handledEscapeCycleRef.current = null;
      dialogElement.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
      dialogElement.removeEventListener("cancel", handleCancel);
    };
  }, [dialogElement, onCancel, onKeyDown, requestDismiss, resolvedOpen]);

  const handleNativeClose = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }

      onClose?.(event);

      if (suppressNativeCloseRequestRef.current) {
        suppressNativeCloseRequestRef.current = false;
        return;
      }

      if (resolvedOpen) {
        requestOpenChange(false);
        setNativeSyncVersion((version) => version + 1);
      }
    },
    [onClose, requestOpenChange, resolvedOpen],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDialogElement>) => {
      onPointerDown?.(event);

      if (event.defaultPrevented) {
        backdropPointerRef.current = null;
        return;
      }

      if (isPointerFromAnotherDialog(event.target, event.currentTarget)) {
        backdropPointerRef.current = null;
        return;
      }

      if (isPointerFromCurrentDialogContent(event.target, event.currentTarget)) {
        backdropPointerRef.current = null;
        return;
      }

      if (!modal) {
        backdropPointerRef.current = null;
        return;
      }

      backdropPointerRef.current = {
        pointerId: event.pointerId,
        startedOnBackdrop: !isPointInsideDialog(event),
        endedOnBackdrop: false,
      };
    },
    [modal, onPointerDown],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDialogElement>) => {
      onPointerUp?.(event);

      if (event.defaultPrevented) {
        backdropPointerRef.current = null;
        return;
      }

      if (isPointerFromAnotherDialog(event.target, event.currentTarget)) {
        backdropPointerRef.current = null;
        return;
      }

      if (isPointerFromCurrentDialogContent(event.target, event.currentTarget)) {
        backdropPointerRef.current = null;
        return;
      }

      const pointer = backdropPointerRef.current;

      if (!pointer || pointer.pointerId !== event.pointerId) {
        backdropPointerRef.current = null;
        return;
      }

      pointer.endedOnBackdrop = !isPointInsideDialog(event);
      backdropPointerRef.current = null;

      if (pointer.startedOnBackdrop && pointer.endedOnBackdrop) {
        requestDismiss("overlay");
      }
    },
    [onPointerUp, requestDismiss],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDialogElement>) => {
      onPointerCancel?.(event);
      backdropPointerRef.current = null;
    },
    [onPointerCancel],
  );

  const setRefs = useCallback(
    (node: HTMLDialogElement | null) => {
      setDialogElement(node);
      contentRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [contentRef, forwardedRef],
  );

  const classes = useMemo(
    () =>
      [
        "m-auto max-h-[var(--modal-max-height)] w-[calc(100%-var(--space-8))] flex-col gap-[var(--modal-gap)] rounded-[var(--modal-radius)] border border-[var(--modal-border)] bg-[var(--modal-background)] p-[var(--modal-padding)] text-hp-foreground shadow-[var(--modal-shadow)] open:flex open:z-[var(--z-modal)]",
        dialogSizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [className, size],
  );

  if (!mounted) {
    return null;
  }

  const portalContainer = container ?? document.body;

  return createPortal(
    <dialog
      ref={setRefs}
      {...props}
      id={resolvedContentId}
      role="dialog"
      aria-modal={modal ? "true" : undefined}
      aria-label={ariaLabel}
      aria-labelledby={resolvedLabelledBy || undefined}
      aria-describedby={resolvedDescribedBy}
      tabIndex={tabIndex}
      className={classes}
      onClose={handleNativeClose}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {children}
    </dialog>,
    portalContainer,
  );
});

DialogContent.displayName = "DialogContent";

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose(
    { children, type = "button", onClick, ...props },
    forwardedRef,
  ) {
    const { requestDismiss } = useDialogContext("DialogClose");

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

DialogClose.displayName = "DialogClose";

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  function DialogHeader({ children, className, ...props }, forwardedRef) {
    const classes = [
      "flex min-w-0 flex-col gap-[var(--space-2)]",
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

DialogHeader.displayName = "DialogHeader";

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle({ children, className, id, ...props }, forwardedRef) {
    const { titleId, registerTitle } = useDialogContext("DialogTitle");
    const resolvedTitleId = id ?? titleId;

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

DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(function DialogDescription(
  { children, className, id, ...props },
  forwardedRef,
) {
  const { descriptionId, registerDescription } = useDialogContext(
    "DialogDescription",
  );
  const resolvedDescriptionId = id ?? descriptionId;

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

DialogDescription.displayName = "DialogDescription";

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  function DialogFooter({ children, className, ...props }, forwardedRef) {
    const classes = [
      "flex min-w-0 flex-col-reverse gap-[var(--space-2)] pt-[var(--space-1)] sm:flex-row sm:justify-end",
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

DialogFooter.displayName = "DialogFooter";

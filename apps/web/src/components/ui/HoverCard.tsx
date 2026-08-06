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
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import Popover, {
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverAlign,
  type PopoverContentProps,
  type PopoverDescriptionProps,
  type PopoverSide,
  type PopoverTitleProps,
  type PopoverTriggerProps,
} from "@/components/ui/Popover";

export type HoverCardProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  container?: Element | DocumentFragment | null;
  children: ReactNode;
};

export type HoverCardTriggerProps = PopoverTriggerProps;

export type HoverCardContentProps = PopoverContentProps;

export type HoverCardTitleProps = PopoverTitleProps;

export type HoverCardDescriptionProps = PopoverDescriptionProps;

export type HoverCardSide = PopoverSide;

export type HoverCardAlign = PopoverAlign;

type HoverCardContextValue = {
  resolvedOpen: boolean;
  contentElement: HTMLDivElement | null;
  scheduleOpen: () => void;
  scheduleClose: () => void;
  cancelOpen: () => void;
  cancelClose: () => void;
  registerContent: (node: HTMLDivElement | null) => void;
};

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

function useHoverCardContext(componentName: string): HoverCardContextValue {
  const context = useContext(HoverCardContext);

  if (context === null) {
    throw new Error(
      `${componentName} deve ser utilizado dentro de HoverCard.`,
    );
  }

  return context;
}

function normalizeDelay(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined
    ? Math.max(0, value)
    : fallback;
}

export default function HoverCard({
  open,
  defaultOpen = false,
  onOpenChange,
  openDelay = 300,
  closeDelay = 150,
  container,
  children,
}: HoverCardProps) {
  const [isControlled] = useState(() => open !== undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [contentElement, setContentElement] =
    useState<HTMLDivElement | null>(null);

  const resolvedOpen = isControlled ? Boolean(open) : uncontrolledOpen;
  const resolvedOpenRef = useRef(resolvedOpen);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedOpenDelay = normalizeDelay(openDelay, 300);
  const resolvedCloseDelay = normalizeDelay(closeDelay, 150);

  useEffect(() => {
    resolvedOpenRef.current = resolvedOpen;
  }, [resolvedOpen]);

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === resolvedOpenRef.current) return;

      resolvedOpenRef.current = nextOpen;

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const cancelOpen = useCallback(() => {
    if (openTimerRef.current === null) return;

    clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current === null) return;

    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    cancelClose();

    if (resolvedOpenRef.current || openTimerRef.current !== null) return;

    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      requestOpenChange(true);
    }, resolvedOpenDelay);
  }, [cancelClose, requestOpenChange, resolvedOpenDelay]);

  const scheduleClose = useCallback(() => {
    cancelOpen();

    if (!resolvedOpenRef.current || closeTimerRef.current !== null) return;

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      requestOpenChange(false);
    }, resolvedCloseDelay);
  }, [cancelOpen, requestOpenChange, resolvedCloseDelay]);

  useEffect(
    () => () => {
      cancelOpen();
      cancelClose();
    },
    [cancelClose, cancelOpen],
  );

  const contextValue = useMemo<HoverCardContextValue>(
    () => ({
      resolvedOpen,
      contentElement,
      scheduleOpen,
      scheduleClose,
      cancelOpen,
      cancelClose,
      registerContent: setContentElement,
    }),
    [
      cancelClose,
      cancelOpen,
      contentElement,
      resolvedOpen,
      scheduleClose,
      scheduleOpen,
    ],
  );

  return (
    <HoverCardContext.Provider value={contextValue}>
      <Popover
        open={resolvedOpen}
        onOpenChange={(nextOpen) => {
          cancelOpen();
          cancelClose();
          requestOpenChange(nextOpen);
        }}
        closeOnEscape
        closeOnInteractOutside
        restoreFocus={false}
        container={container}
      >
        {children}
      </Popover>
    </HoverCardContext.Provider>
  );
}

export const HoverCardTrigger = forwardRef<
  HTMLButtonElement,
  HoverCardTriggerProps
>(function HoverCardTrigger(
  {
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    onClick,
    ...props
  },
  forwardedRef,
) {
  const {
    contentElement,
    scheduleOpen,
    scheduleClose,
    cancelOpen,
    cancelClose,
  } = useHoverCardContext("HoverCardTrigger");

  return (
    <PopoverTrigger
      ref={forwardedRef}
      {...props}
      onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(event);

        if (event.defaultPrevented) return;

        scheduleOpen();
      }}
      onPointerLeave={(event: ReactPointerEvent<HTMLButtonElement>) => {
        onPointerLeave?.(event);

        if (event.defaultPrevented) return;

        const relatedTarget = event.relatedTarget;

        if (
          relatedTarget instanceof Node &&
          contentElement?.contains(relatedTarget)
        ) {
          cancelClose();
          return;
        }

        scheduleClose();
      }}
      onFocus={(event: ReactFocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);

        if (event.defaultPrevented) return;

        cancelClose();
        scheduleOpen();
      }}
      onBlur={(event: ReactFocusEvent<HTMLButtonElement>) => {
        onBlur?.(event);

        if (event.defaultPrevented) return;

        const relatedTarget = event.relatedTarget;

        if (
          relatedTarget instanceof Node &&
          contentElement?.contains(relatedTarget)
        ) {
          cancelClose();
          return;
        }

        scheduleClose();
      }}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          event.preventDefault();
          cancelOpen();
          cancelClose();
        }
      }}
    />
  );
});

HoverCardTrigger.displayName = "HoverCardTrigger";

export const HoverCardContent = forwardRef<
  HTMLDivElement,
  HoverCardContentProps
>(function HoverCardContent(
  {
    side = "bottom",
    align = "center",
    sideOffset = 8,
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  forwardedRef,
) {
  const {
    scheduleClose,
    cancelClose,
    registerContent,
  } = useHoverCardContext("HoverCardContent");

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      registerContent(node);

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef !== null) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, registerContent],
  );

  const classes = [
    "w-[var(--hover-card-width)] max-w-[calc(100vw-var(--space-8))] rounded-[var(--hover-card-radius)] border border-[var(--hover-card-border)] bg-[var(--hover-card-background)] p-[var(--hover-card-padding)] text-[var(--hover-card-foreground)] shadow-[var(--hover-card-shadow)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <PopoverContent
      ref={setRefs}
      {...props}
      side={side}
      align={align}
      sideOffset={sideOffset}
      role="group"
      className={classes}
      onPointerEnter={(event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(event);

        if (!event.defaultPrevented) {
          cancelClose();
        }
      }}
      onPointerLeave={(event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(event);

        if (!event.defaultPrevented) {
          scheduleClose();
        }
      }}
      onFocus={(event: ReactFocusEvent<HTMLDivElement>) => {
        onFocus?.(event);

        if (!event.defaultPrevented) {
          cancelClose();
        }
      }}
      onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
        onBlur?.(event);

        if (event.defaultPrevented) return;

        const relatedTarget = event.relatedTarget;

        if (
          relatedTarget instanceof Node &&
          event.currentTarget.contains(relatedTarget)
        ) {
          return;
        }

        scheduleClose();
      }}
    />
  );
});

HoverCardContent.displayName = "HoverCardContent";

export const HoverCardTitle = forwardRef<
  HTMLHeadingElement,
  HoverCardTitleProps
>(function HoverCardTitle(props, forwardedRef) {
  return <PopoverTitle ref={forwardedRef} {...props} />;
});

HoverCardTitle.displayName = "HoverCardTitle";

export const HoverCardDescription = forwardRef<
  HTMLParagraphElement,
  HoverCardDescriptionProps
>(function HoverCardDescription(props, forwardedRef) {
  return <PopoverDescription ref={forwardedRef} {...props} />;
});

HoverCardDescription.displayName = "HoverCardDescription";
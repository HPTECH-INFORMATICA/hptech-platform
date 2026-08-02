"use client";

import {
  Children,
  forwardRef,
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastViewportProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "role" | "aria-live" | "aria-atomic"
> & {
  children: ReactNode;
  container?: Element | DocumentFragment | null;
};

const ToastViewport = forwardRef<HTMLDivElement, ToastViewportProps>(
  function ToastViewport(
    { children, container, className, ...props },
    ref,
  ) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      const frame = window.requestAnimationFrame(() => setMounted(true));

      return () => window.cancelAnimationFrame(frame);
    }, []);

    if (!mounted) {
      return null;
    }

    const portalContainer = container ?? document.body;
    const classes = [
      "pointer-events-none fixed inset-x-4 bottom-[calc(var(--space-4)+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex min-w-0 flex-col gap-3 lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-6 lg:w-full lg:max-w-[var(--layout-reading-min)]",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return createPortal(
      <div ref={ref} {...props} className={classes}>
        {Children.map(children, (child) => (
          <div className="pointer-events-auto min-w-0 max-w-full">{child}</div>
        ))}
      </div>,
      portalContainer,
    );
  },
);

ToastViewport.displayName = "ToastViewport";

export default ToastViewport;

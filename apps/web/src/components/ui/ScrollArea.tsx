"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type UIEvent,
} from "react";

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  viewportClassName?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
  orientation?: "vertical" | "horizontal" | "both";
  onViewportScroll?: (event: UIEvent<HTMLDivElement>) => void;
};

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  function ScrollArea(
    {
      children,
      className,
      viewportClassName,
      viewportProps,
      orientation = "vertical",
      onViewportScroll,
      ...props
    },
    forwardedRef,
  ) {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [edges, setEdges] = useState({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });

    const updateEdges = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const epsilon = 1;
      setEdges({
        top: viewport.scrollTop > epsilon,
        bottom:
          viewport.scrollTop + viewport.clientHeight <
          viewport.scrollHeight - epsilon,
        left: viewport.scrollLeft > epsilon,
        right:
          viewport.scrollLeft + viewport.clientWidth <
          viewport.scrollWidth - epsilon,
      });
    }, []);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      updateEdges();

      if (typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver(updateEdges);
      observer.observe(viewport);

      const content = viewport.firstElementChild;
      if (content instanceof HTMLElement) observer.observe(content);

      return () => observer.disconnect();
    }, [updateEdges]);

    const overflowClass =
      orientation === "horizontal"
        ? "overflow-x-auto overflow-y-hidden"
        : orientation === "both"
          ? "overflow-auto"
          : "overflow-y-auto overflow-x-hidden";

    return (
      <div
        ref={forwardedRef}
        {...props}
        data-scroll-area=""
        data-orientation={orientation}
        data-scroll-top={edges.top ? "" : undefined}
        data-scroll-bottom={edges.bottom ? "" : undefined}
        data-scroll-left={edges.left ? "" : undefined}
        data-scroll-right={edges.right ? "" : undefined}
        className={["relative min-h-0 min-w-0", className]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          {...viewportProps}
          ref={viewportRef}
          tabIndex={viewportProps?.tabIndex ?? 0}
          data-scroll-area-viewport=""
          className={[
            "h-full w-full rounded-[inherit] outline-none [scrollbar-color:var(--scroll-area-thumb)_var(--scroll-area-track)] [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
            overflowClass,
            viewportClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          onScroll={(event) => {
            viewportProps?.onScroll?.(event);
            onViewportScroll?.(event);
            updateEdges();
          }}
        >
          {children}
        </div>
      </div>
    );
  },
);

ScrollArea.displayName = "ScrollArea";

export default ScrollArea;
"use client";

import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import Menubar, {
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  type MenubarContentProps,
  type MenubarItemProps,
  type MenubarLabelProps,
  type MenubarMenuProps,
  type MenubarProps,
  type MenubarSeparatorProps,
  type MenubarTriggerProps,
} from "@/components/ui/Menubar";

export type NavigationMenuProps = Omit<MenubarProps, "role"> & {
  "aria-label"?: string;
};

export type NavigationMenuListProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
};

export type NavigationMenuMenuProps = MenubarMenuProps;

export type NavigationMenuTriggerProps = MenubarTriggerProps;

export type NavigationMenuContentProps = MenubarContentProps;

export type NavigationMenuItemProps = MenubarItemProps;

export type NavigationMenuLabelProps = MenubarLabelProps;

export type NavigationMenuSeparatorProps = MenubarSeparatorProps;

export type NavigationMenuLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children"
> & {
  children: ReactNode;
  inset?: boolean;
  active?: boolean;
  variant?: "default" | "danger";
};

export default function NavigationMenu({
  children,
  className,
  "aria-label": ariaLabel = "Navegação principal",
  ...props
}: NavigationMenuProps) {
  const classes = [
    "w-fit max-w-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav aria-label={ariaLabel} className={classes}>
      <Menubar {...props}>{children}</Menubar>
    </nav>
  );
}

export const NavigationMenuList = forwardRef<
  HTMLDivElement,
  NavigationMenuListProps
>(function NavigationMenuList(
  { children, className, ...props },
  forwardedRef,
) {
  const classes = [
    "flex min-w-0 flex-wrap items-center gap-[var(--navigation-menu-gap)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={forwardedRef} {...props} className={classes}>
      {children}
    </div>
  );
});

NavigationMenuList.displayName = "NavigationMenuList";

export function NavigationMenuMenu(
  props: NavigationMenuMenuProps,
) {
  return <MenubarMenu {...props} />;
}

export const NavigationMenuTrigger = forwardRef<
  HTMLButtonElement,
  NavigationMenuTriggerProps
>(function NavigationMenuTrigger(
  { className, ...props },
  forwardedRef,
) {
  const classes = [
    "rounded-[var(--navigation-menu-trigger-radius)] px-[var(--navigation-menu-trigger-padding-x)] py-[var(--navigation-menu-trigger-padding-y)] text-sm font-medium text-[var(--navigation-menu-foreground)] outline-none transition-colors hover:bg-[var(--navigation-menu-trigger-hover)] focus-visible:bg-[var(--navigation-menu-trigger-focus)] data-[state=open]:bg-[var(--navigation-menu-trigger-active)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MenubarTrigger
      ref={forwardedRef}
      {...props}
      className={classes}
    />
  );
});

NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

export const NavigationMenuContent = forwardRef<
  HTMLDivElement,
  NavigationMenuContentProps
>(function NavigationMenuContent(
  {
    className,
    side = "bottom",
    align = "start",
    sideOffset = 8,
    ...props
  },
  forwardedRef,
) {
  const classes = [
    "min-w-[var(--navigation-menu-content-min-width)] max-w-[min(var(--navigation-menu-content-max-width),calc(100vw-var(--space-8)))]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MenubarContent
      ref={forwardedRef}
      {...props}
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={classes}
    />
  );
});

NavigationMenuContent.displayName = "NavigationMenuContent";

export const NavigationMenuItem = forwardRef<
  HTMLButtonElement,
  NavigationMenuItemProps
>(function NavigationMenuItem(
  { className, ...props },
  forwardedRef,
) {
  const classes = [
    "min-h-[var(--layout-touch-target)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MenubarItem
      ref={forwardedRef}
      {...props}
      className={classes}
    />
  );
});

NavigationMenuItem.displayName = "NavigationMenuItem";

export const NavigationMenuLink = forwardRef<
  HTMLAnchorElement,
  NavigationMenuLinkProps
>(function NavigationMenuLink(
  {
    children,
    inset = false,
    active = false,
    variant = "default",
    className,
    "aria-current": ariaCurrent,
    ...props
  },
  forwardedRef,
) {
  const classes = [
    "flex min-h-[var(--layout-touch-target)] w-full items-center rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none transition-colors hover:bg-[var(--navigation-menu-item-hover)] focus-visible:bg-[var(--navigation-menu-item-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-1",
    inset ? "pl-[var(--space-8)]" : null,
    active ? "bg-[var(--navigation-menu-item-active)] font-medium" : null,
    variant === "danger"
      ? "text-[var(--color-danger)]"
      : "text-[var(--navigation-menu-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      ref={forwardedRef}
      {...props}
      aria-current={ariaCurrent ?? (active ? "page" : undefined)}
      data-active={active ? "" : undefined}
      data-inset={inset ? "" : undefined}
      data-variant={variant}
      className={classes}
    >
      {children}
    </a>
  );
});

NavigationMenuLink.displayName = "NavigationMenuLink";

export const NavigationMenuLabel = forwardRef<
  HTMLDivElement,
  NavigationMenuLabelProps
>(function NavigationMenuLabel(props, forwardedRef) {
  return <MenubarLabel ref={forwardedRef} {...props} />;
});

NavigationMenuLabel.displayName = "NavigationMenuLabel";

export const NavigationMenuSeparator = forwardRef<
  HTMLDivElement,
  NavigationMenuSeparatorProps
>(function NavigationMenuSeparator(props, forwardedRef) {
  return (
    <MenubarSeparator ref={forwardedRef} {...props} />
  );
});

NavigationMenuSeparator.displayName = "NavigationMenuSeparator";
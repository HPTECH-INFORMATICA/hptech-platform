"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import Toast from "./Toast";
import ToastViewport from "./ToastViewport";

export type ToastVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type ToastInput = {
  id?: string;
  dedupeKey?: string;
  variant?: ToastVariant;
  title?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  duration?: number | null;
  dismissible?: boolean;
};

export type ToastApi = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

type ToastProviderProps = {
  children: ReactNode;
};

type ToastItem = {
  id: string;
  generation: symbol;
  dedupeKey?: string;
  variant: ToastVariant;
  title?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  duration: number | null;
  dismissible: boolean;
  revision: number;
};

type ToastState = {
  visible: ToastItem[];
  queued: ToastItem[];
};

type ToastAction =
  | { type: "upsert"; toast: ToastItem }
  | { type: "dismiss"; id: string }
  | { type: "dismissAll" };

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION = 5_000;
const DANGER_DURATION = 8_000;
const MIN_DURATION = 4_000;
const MAX_DURATION = 10_000;

const initialState: ToastState = {
  visible: [],
  queued: [],
};

export const ToastContextInternal = createContext<ToastApi | null>(null);

function findToastIndex(items: ToastItem[], toast: ToastItem): number {
  if (!toast.dedupeKey) {
    return -1;
  }

  return items.findIndex((item) => item.dedupeKey === toast.dedupeKey);
}

function replaceToast(items: ToastItem[], index: number, toast: ToastItem) {
  const current = items[index];
  const next = [...items];

  next[index] = {
    ...toast,
    id: current.id,
    revision: current.revision + 1,
  };

  return next;
}

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  if (action.type === "dismissAll") {
    return initialState;
  }

  if (action.type === "dismiss") {
    const visibleIndex = state.visible.findIndex(
      (toast) => toast.id === action.id,
    );

    if (visibleIndex >= 0) {
      const visible = state.visible.filter((_, index) => index !== visibleIndex);
      const [promoted, ...queued] = state.queued;

      return {
        visible: promoted ? [...visible, promoted] : visible,
        queued,
      };
    }

    const queuedIndex = state.queued.findIndex(
      (toast) => toast.id === action.id,
    );

    if (queuedIndex < 0) {
      return state;
    }

    return {
      visible: state.visible,
      queued: state.queued.filter((_, index) => index !== queuedIndex),
    };
  }

  const visibleIndex = findToastIndex(state.visible, action.toast);

  if (visibleIndex >= 0) {
    return {
      visible: replaceToast(state.visible, visibleIndex, action.toast),
      queued: state.queued,
    };
  }

  const queuedIndex = findToastIndex(state.queued, action.toast);

  if (queuedIndex >= 0) {
    return {
      visible: state.visible,
      queued: replaceToast(state.queued, queuedIndex, action.toast),
    };
  }

  if (state.visible.length < MAX_VISIBLE_TOASTS) {
    return {
      visible: [...state.visible, action.toast],
      queued: state.queued,
    };
  }

  return {
    visible: state.visible,
    queued: [...state.queued, action.toast],
  };
}

function normalizeDuration(input: ToastInput, variant: ToastVariant) {
  if (input.action != null || input.duration === null) {
    return null;
  }

  if (typeof input.duration === "number") {
    if (Number.isNaN(input.duration)) {
      return variant === "danger" ? DANGER_DURATION : DEFAULT_DURATION;
    }

    return Math.min(MAX_DURATION, Math.max(MIN_DURATION, input.duration));
  }

  return variant === "danger" ? DANGER_DURATION : DEFAULT_DURATION;
}

function normalizeDedupeKey(dedupeKey: string | undefined) {
  const normalized = dedupeKey?.trim();
  return normalized ? normalized : undefined;
}

function generateToastId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function findExistingToastByDedupeKey(state: ToastState, input: ToastInput) {
  const dedupeKey = normalizeDedupeKey(input.dedupeKey);

  if (!dedupeKey) {
    return undefined;
  }

  return [...state.visible, ...state.queued].find(
    (toast) => toast.dedupeKey === dedupeKey,
  );
}

function hasToastId(state: ToastState, id: string) {
  return [...state.visible, ...state.queued].some((toast) => toast.id === id);
}

function generateAvailableToastId(state: ToastState) {
  let id = generateToastId();

  while (hasToastId(state, id)) {
    id = generateToastId();
  }

  return id;
}

function normalizeToast(input: ToastInput, id: string): ToastItem {
  const variant = input.variant ?? "neutral";

  return {
    id,
    generation: Symbol("toast-generation"),
    dedupeKey: normalizeDedupeKey(input.dedupeKey),
    variant,
    title: input.title,
    description: input.description,
    icon: input.icon,
    action: input.action,
    duration: normalizeDuration(input, variant),
    dismissible: input.dismissible ?? true,
    revision: 0,
  };
}

type ManagedToastProps = {
  toast: ToastItem;
  latestDismissibleId?: string;
  onDismiss: (id: string) => void;
  isCurrentGeneration: (id: string, generation: symbol) => boolean;
};

function ManagedToast({
  toast,
  latestDismissibleId,
  onDismiss,
  isCurrentGeneration,
}: ManagedToastProps) {
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef<number | null>(toast.duration);
  const startedAtRef = useRef<number | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    startedAtRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    const remaining = remainingRef.current;

    if (
      timerRef.current !== null ||
      remaining === null ||
      pointerInsideRef.current ||
      focusInsideRef.current
    ) {
      return;
    }

    const id = toast.id;
    const generation = toast.generation;
    startedAtRef.current = performance.now();
    const handle = window.setTimeout(() => {
      if (
        !isCurrentGeneration(id, generation) ||
        timerRef.current !== handle
      ) {
        return;
      }

      timerRef.current = null;
      startedAtRef.current = null;
      remainingRef.current = 0;

      onDismiss(id);
    }, remaining);
    timerRef.current = handle;
  }, [isCurrentGeneration, onDismiss, toast.generation, toast.id]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current === null || startedAtRef.current === null) {
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = remainingRef.current ?? 0;
    remainingRef.current = Math.max(0, remaining - elapsed);
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (pointerInsideRef.current || focusInsideRef.current) {
      return;
    }

    if (remainingRef.current === 0) {
      if (isCurrentGeneration(toast.id, toast.generation)) {
        onDismiss(toast.id);
      }

      return;
    }

    startTimer();
  }, [isCurrentGeneration, onDismiss, startTimer, toast.generation, toast.id]);

  useEffect(() => {
    clearTimer();
    remainingRef.current = toast.duration;
    startTimer();

    return clearTimer;
  }, [
    clearTimer,
    startTimer,
    toast.duration,
    toast.generation,
    toast.revision,
  ]);

  const handlePointerEnter = () => {
    pointerInsideRef.current = true;
    pauseTimer();
  };

  const handlePointerLeave = () => {
    pointerInsideRef.current = false;
    resumeTimer();
  };

  const handleFocus = () => {
    focusInsideRef.current = true;
    pauseTimer();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    focusInsideRef.current = false;
    resumeTimer();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !latestDismissibleId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onDismiss(latestDismissibleId);
  };

  const dismissAction = toast.dismissible ? (
    <button
      type="button"
      aria-label="Fechar notificação"
      onClick={() => onDismiss(toast.id)}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xl text-hp-muted transition-colors duration-[var(--duration-fast)] hover:bg-hp-surface-subtle hover:text-hp-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus"
    >
      <span aria-hidden="true">×</span>
    </button>
  ) : undefined;

  return (
    <div
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <Toast
        variant={toast.variant}
        title={toast.title}
        description={toast.description}
        icon={toast.icon}
        action={toast.action}
        dismissible={toast.dismissible}
        dismissAction={dismissAction}
        live={toast.variant === "danger" ? "assertive" : "polite"}
      />
    </div>
  );
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, initialState);
  const stateRef = useRef(initialState);

  const dispatchAction = useCallback((action: ToastAction) => {
    stateRef.current = toastReducer(stateRef.current, action);
    dispatch(action);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const existing = findExistingToastByDedupeKey(stateRef.current, input);
      const providedId = input.id?.trim() || undefined;
      const id =
        existing?.id ??
        (providedId && !hasToastId(stateRef.current, providedId)
          ? providedId
          : generateAvailableToastId(stateRef.current));

      dispatchAction({
        type: "upsert",
        toast: normalizeToast(input, id),
      });

      return id;
    },
    [dispatchAction],
  );

  const dismiss = useCallback(
    (id: string) => dispatchAction({ type: "dismiss", id }),
    [dispatchAction],
  );

  const dismissAll = useCallback(
    () => dispatchAction({ type: "dismissAll" }),
    [dispatchAction],
  );

  const isCurrentGeneration = useCallback(
    (id: string, generation: symbol) => {
      const current = [...stateRef.current.visible, ...stateRef.current.queued].find(
        (item) => item.id === id,
      );

      return current?.generation === generation;
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({ toast, dismiss, dismissAll }),
    [dismiss, dismissAll, toast],
  );
  const latestDismissibleId = [...state.visible]
    .reverse()
    .find((item) => item.dismissible)?.id;

  return (
    <ToastContextInternal.Provider value={api}>
      {children}
      <ToastViewport>
        {state.visible.map((item) => (
          <ManagedToast
            key={item.id}
            toast={item}
            latestDismissibleId={latestDismissibleId}
            onDismiss={dismiss}
            isCurrentGeneration={isCurrentGeneration}
          />
        ))}
      </ToastViewport>
    </ToastContextInternal.Provider>
  );
}

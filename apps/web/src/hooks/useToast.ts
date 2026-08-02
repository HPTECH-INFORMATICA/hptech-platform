"use client";

import { useContext } from "react";

import {
  ToastContextInternal,
  type ToastApi,
} from "@/components/ui/ToastProvider";

export default function useToast(): ToastApi {
  const context = useContext(ToastContextInternal);

  if (context === null) {
    throw new Error("useToast deve ser utilizado dentro de ToastProvider.");
  }

  return context;
}

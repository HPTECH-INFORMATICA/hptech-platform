import { notFound } from "next/navigation";

import UIPlaygroundClient from "./UIPlaygroundClient";

export default function DevUIPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <UIPlaygroundClient />;
}

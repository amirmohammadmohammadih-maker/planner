"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Loading } from "./ui";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Renders children only on the client, after hydration.
 *  All planner views depend on the device's local date, so we skip
 *  build-time prerendered content to avoid hydration mismatches. */
export default function Mounted({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (!mounted) return <Loading />;
  return <>{children}</>;
}

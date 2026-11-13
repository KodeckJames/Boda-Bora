"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";

const variants = {
  primary: "bg-ink text-white hover:bg-ink/90",
  secondary: "border border-line bg-surface text-foreground hover:bg-black/3",
  hivis: "bg-hivis text-ink hover:bg-hivis/90",
  danger: "border border-danger/30 text-danger hover:bg-danger/5",
  link: "font-semibold hover:underline",
} as const;

// A one-click Server Action (already bound to its arguments) with pending and error states.
export function ActionButton({
  action,
  children,
  variant = "secondary",
  small = false,
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  small?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const size = variant === "link" ? "text-sm" : small ? "h-8 px-3 text-xs" : "h-10 px-5 text-sm";
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-60 ${size} ${variants[variant]}`}
      >
        {pending ? "…" : children}
      </button>
      {state.error && (
        <span role="alert" className="max-w-56 text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

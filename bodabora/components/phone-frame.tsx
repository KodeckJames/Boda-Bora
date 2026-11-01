import type { ReactNode } from "react";

// Desktop-only phone mock-up for demos. On a real phone (the installed PWA) the content
// renders full width with no frame.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full lg:max-w-[380px] lg:rounded-[2.5rem] lg:border-[10px] lg:border-ink lg:bg-ink lg:shadow-2xl">
      <div className="relative overflow-hidden lg:rounded-[1.9rem] lg:bg-background">
        <div className="hidden items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold lg:flex">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
          <span className="flex items-center gap-1">
            <span>Safaricom</span>
            <span className="inline-block h-2.5 w-5 rounded-sm border border-current p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>
        <div className="lg:h-[680px] lg:overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[2.5rem] border-[10px] border-ink bg-ink shadow-2xl">
      <div className="relative overflow-hidden rounded-[1.9rem] bg-background">
        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
          <span className="flex items-center gap-1">
            <span>Safaricom</span>
            <span className="inline-block h-2.5 w-5 rounded-sm border border-current p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>
        <div className="h-[680px] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

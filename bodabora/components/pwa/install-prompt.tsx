"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Detected = "installed" | "ios" | "other";

const STANDALONE = "(display-mode: standalone)";

function detect(): Detected {
  const standalone =
    window.matchMedia(STANDALONE).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "other";
}

function subscribeDisplayMode(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Android/Chrome: our own install button via beforeinstallprompt.
// iOS has no install API, so we show the Share → Add to Home Screen steps instead.
export function InstallPrompt() {
  const { t } = useI18n();
  const detected = useSyncExternalStore(subscribeDisplayMode, detect, () => "other" as const);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const platform = installed || detected === "installed" ? "installed" : deferred ? "android" : detected;
  if (dismissed || platform === "installed" || platform === "other") return null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-ink p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{t.install.title}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sm text-white/60"
          aria-label={t.install.dismiss}
        >
          ✕
        </button>
      </div>
      {platform === "android" && deferred && (
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="mt-3 h-10 w-full rounded-full bg-hivis text-sm font-semibold text-ink"
        >
          {t.install.install}
        </button>
      )}
      {platform === "ios" && (
        <ol className="mt-3 space-y-1 text-sm text-white/80">
          <li>{t.install.iosStep1}</li>
          <li>{t.install.iosStep2}</li>
        </ol>
      )}
    </div>
  );
}

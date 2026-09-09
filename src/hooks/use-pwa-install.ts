import { useState, useEffect, useCallback } from "react";

/**
 * Hook that captures the browser's `beforeinstallprompt` event and exposes
 * a method to trigger the native install dialog on demand.
 *
 * Also detects Safari/iOS where `beforeinstallprompt` is not supported,
 * so the UI can show manual "Add to Home Screen" instructions instead.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function getIsSafariIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iOS Safari: includes "iPhone" or "iPad" (or iPod) but NOT "CriOS" (Chrome) or "FxiOS" (Firefox)
  const isIos = /iPhone|iPad|iPod/.test(ua) && !(ua.includes("CriOS") || ua.includes("FxiOS"));
  // Also detect iPadOS 13+ which reports as Mac
  const isIpadOs = ua.includes("Macintosh") && "ontouchend" in document;
  return isIos || isIpadOs;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSafariIos, setIsSafariIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone or fullscreen mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true)
    ) {
      setIsInstalled(true);
      return;
    }

    // Check if previously dismissed (per session)
    if (sessionStorage.getItem("pwa_install_dismissed") === "1") {
      setDismissed(true);
    }

    // Detect Safari on iOS/iPadOS
    setIsSafariIos(getIsSafariIos());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem("pwa_install_dismissed", "1");
  }, []);

  return {
    /** True when Chrome/Edge native install prompt is available */
    canInstall: !!deferredPrompt && !isInstalled && !dismissed,
    /** True when on Safari iOS — show manual instructions instead */
    showSafariGuide: isSafariIos && !isInstalled && !dismissed,
    isInstalled,
    triggerInstall,
    dismiss,
  };
}

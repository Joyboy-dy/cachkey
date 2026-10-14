import { useSyncExternalStore } from "react";

/**
 * Light / dark theme. By default the app follows the device (`system`); a manual choice
 * (`light` or `dark`) is stored in a cookie only once the user toggles the theme, and is
 * readable before paint (no flash). The `dark` class on <html> switches the tokens in
 * styles.css.
 */
type ThemePreference = "light" | "dark" | "system";

const COOKIE = "cachkey-theme";
const ONE_YEAR = 60 * 60 * 24 * 365;
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Inline script run in <head> before the first paint. Kept tiny and dependency-free;
 * it must stay in sync with `applyTheme` below.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${COOKIE}=(light|dark)/);var p=m?m[1]:"system";var d=p==="dark"||(p==="system"&&matchMedia("${DARK_QUERY}").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";if(p==="system"){matchMedia("${DARK_QUERY}").addEventListener("change",function(q){if(!/(?:^|; )${COOKIE}=(light|dark)/.test(document.cookie)){e.classList.toggle("dark",q.matches);e.style.colorScheme=q.matches?"dark":"light";}});}}catch(_){}})();`;

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function isDarkApplied(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Saves an explicit choice and applies it with a short cross-fade when supported. */
function setTheme(preference: Exclude<ThemePreference, "system">) {
  document.cookie = `${COOKIE}=${preference}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  const dark = preference === "dark";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // View Transitions: the browser snapshots both states and blends them on the compositor,
  // so the whole page fades in one smooth step without animating every colour property.
  // A hidden page has no frame to animate: apply immediately instead of waiting.
  const visible = document.visibilityState === "visible";
  if (!reducedMotion && visible && typeof document.startViewTransition === "function") {
    document.documentElement.dataset.themeTransition = "";
    const transition = document.startViewTransition(() => applyTheme(dark));
    void transition.finished.finally(() => {
      delete document.documentElement.dataset.themeTransition;
    });
  } else {
    applyTheme(dark);
  }
}

/** Switches between light and dark, starting from the theme currently displayed. */
export function toggleTheme() {
  setTheme(isDarkApplied() ? "light" : "dark");
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Whether the dark theme is displayed; `false` during SSR and the first client render. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, isDarkApplied, () => false);
}

import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

/** Cookie written by `SidebarProvider` (components/ui/sidebar.tsx) when the menu is toggled. */
const SIDEBAR_COOKIE_NAME = "sidebar_state";

/** Reads the persisted sidebar state on the server so the first render matches it. */
export const getSidebarOpen = createServerFn({ method: "GET" }).handler(
  () => getCookie(SIDEBAR_COOKIE_NAME) !== "false",
);

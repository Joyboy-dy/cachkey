import { createFileRoute, redirect } from "@tanstack/react-router";

/** Former temporary landing page, kept so existing links land on the dashboard. */
export const Route = createFileRoute("/_authenticated/welcome")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
});

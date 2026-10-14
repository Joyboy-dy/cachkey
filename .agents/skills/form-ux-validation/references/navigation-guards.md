# Unsaved-change navigation guards

Choose guards from the navigation surfaces the application actually uses.

- Browser unload/refresh/close: platform `beforeunload` can warn in supported circumstances, but browsers control the message and behavior.
- Client-side router transitions: use the router/framework's supported interception/blocking mechanism when available; do not assume `beforeunload` catches them.
- Modal/drawer/dialog dismissal: intercept the component's close path when dirty.
- Native/mobile shells: use the platform's navigation lifecycle.

Only enable a guard while meaningful changes are dirty. Remove listeners when no longer needed. Avoid trapping users in a loop: after confirmed discard or successful save, allow the intended navigation exactly once.

A custom confirmation UI must remain keyboard accessible and clearly distinguish “stay” from “discard and leave.”

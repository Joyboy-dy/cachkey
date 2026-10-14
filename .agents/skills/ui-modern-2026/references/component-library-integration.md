# Component-library integration

Before replacing scripted behavior with a native/platform feature, determine what the existing component provides: focus trapping/restoration, escape/outside interactions, portal/layering, ARIA wiring, collision/positioning, controlled state, animation, and browser workarounds.

Use platform primitives directly when they satisfy the required contract or when the project's library already wraps them. Do not bypass the library merely because a newer primitive exists.

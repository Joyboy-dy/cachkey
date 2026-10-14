# Modern CSS capability guide

Use modern CSS to remove complexity, not to maximize feature count.

- **Component-responsive layout:** container queries when layout depends on component width rather than viewport alone.
- **Relational styling:** `:has()` when parent/sibling state can be expressed declaratively and support policy allows it.
- **Two-dimensional alignment:** grid/subgrid where shared tracks matter.
- **Direction-aware UI:** logical properties for writing-mode/direction resilience.
- **Progressive capability:** `@supports` for enhancements with a viable baseline.
- **Color:** newer functions/spaces when the project can represent them consistently; preserve existing token architecture unless migrating deliberately.

Always verify support against the project's current browser target before relying on a feature for essential behavior.

# Frontend architecture and ownership

Keep one authoritative owner for each piece of mutable state. Local interaction state belongs near the interaction. Shared server data should follow the project's established fetching/cache layer. Cross-feature state deserves a shared store only when multiple distant owners genuinely coordinate through it.

Component extraction is justified by responsibility, reuse, independent testing, rendering/runtime boundaries, or complexity reduction. Folder structure should reflect the existing repository, not a universal feature/component/services template.

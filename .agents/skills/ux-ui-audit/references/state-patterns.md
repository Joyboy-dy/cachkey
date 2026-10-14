# State coverage

For interactive components and screens, sample the states that can materially change layout, semantics, focus, or task completion: loading, empty, partial data, errors, retry, disabled, selected, validation, success, offline/stale if supported, dialogs opened/closed, and long/overflow content.

A defect that appears only under an edge state is still important when that state causes data loss, traps focus, hides actions, or blocks recovery.

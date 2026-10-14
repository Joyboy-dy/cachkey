# Form accessibility checklist

- Every input has an accessible name from a label or equivalent semantic mechanism.
- Help and error text is associated with the relevant control.
- Invalid state is programmatically exposed where the platform/framework supports it.
- Requiredness in UI matches actual validation.
- Error summary/focus behavior helps keyboard and screen-reader users find failed fields on submit.
- Placeholder text is not the only label.
- Controls are reachable and operable by keyboard.
- Focus indicators remain visible.
- Disabled vs read-only semantics match the intended interaction and submission behavior.
- Dynamic/async status is announced when needed without excessive interruption.
- Color is not the only error/success cue.

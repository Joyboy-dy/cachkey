# Design-system integration

1. Find the existing primitive and its supported variants.
2. Prefer semantic tokens over raw values.
3. If several consumers need a missing variant, add it where the primitive is owned and document/test it.
4. If a style is truly one-off composition, keep it local rather than bloating a global variant API.
5. Preserve accessibility behavior while styling wrappers/triggers/content.
6. Avoid forking third-party/component-library primitives unless the project already owns a wrapper layer or the task requires deeper change.

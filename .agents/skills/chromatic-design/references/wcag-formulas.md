# WCAG 2.x contrast reference

Use this reference for opaque sRGB foreground/background contrast calculations. For transparency, first composite colors against the actual underlying background.

## Relative luminance

For each normalized sRGB channel `c` in 0..1:

```text
c_linear = c / 12.92                                  if c <= 0.04045
c_linear = ((c + 0.055) / 1.055) ^ 2.4               otherwise
```

Then:

```text
L = 0.2126 * R_linear + 0.7152 * G_linear + 0.0722 * B_linear
```

## Contrast ratio

```text
(L_lighter + 0.05) / (L_darker + 0.05)
```

Do not round a value upward to make a threshold pass.

## Common WCAG 2.2 AA thresholds

- Normal text: at least **4.5:1** under Success Criterion 1.4.3, subject to the criterion's exceptions.
- Large-scale text: at least **3:1** under Success Criterion 1.4.3.
- Visual information required to identify active UI components/states and meaningful graphical objects: at least **3:1** against adjacent colors under Success Criterion 1.4.11, subject to its exceptions.

Always check the exact success criterion and context rather than reducing an audit to these numbers alone. Color must also not be the only means of conveying information where applicable.

The bundled `scripts/color_tools.py contrast` command implements the opaque sRGB ratio calculation. It intentionally rejects translucent hex input because compositing requires the real background.

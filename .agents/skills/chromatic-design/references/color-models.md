# Color models for interface systems

Choose a color representation from project constraints, not fashion.

## sRGB hex/RGB

Useful when compatibility, interoperability with existing assets, or simple tooling matters. WCAG 2.x contrast calculations operate from rendered sRGB relative luminance, so hex/RGB pairs are straightforward to verify.

## HSL

Convenient for authoring hue/saturation/lightness relationships, but equal numeric lightness does not mean equal perceived lightness across hues. Do not infer accessibility from HSL `L` alone.

## OKLCH

Useful for new token systems because its lightness/chroma/hue controls are more perceptually meaningful than HSL for many palette operations. It can make systematic ramps and theme pairing easier. It is still not a substitute for computing the actual rendered contrast of a foreground/background pair.

When introducing OKLCH into an existing project, verify browser/toolchain support, gamut mapping, token tooling, and third-party consumers. Preserve the current syntax if migration has no clear benefit.

## Practical rule

- Existing mature system: preserve its representation unless migration is requested.
- New system with suitable browser/tooling support: OKLCH is a strong default for authoring.
- Export/interchange: provide the formats required by downstream tools.
- Accessibility: validate rendered color pairs rather than using color-space coordinates as a proxy.

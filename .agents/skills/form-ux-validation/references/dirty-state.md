# Dirty state

Dirty state answers: “Would leaving now discard a meaningful user change?”

Prefer the form library's native dirty tracking when it correctly compares current values with the saved baseline. If custom comparison is needed, normalize values first so cosmetic differences (for example trimmed whitespace) do not produce false positives unless they are semantically meaningful.

After authoritative save success, reset/update the baseline. After failure, keep the previous baseline and current input.

Watch for programmatic field population, async initial data, dependent fields, file inputs, and values removed when conditional sections disappear.

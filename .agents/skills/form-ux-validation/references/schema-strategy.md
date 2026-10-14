# Validation and schema strategy

Use this reference when a form has validation in more than one layer.

## Source of truth

The authoritative boundary is the one that protects persisted or privileged state. Client validation is an experience optimization, not a security boundary.

If the stack supports sharing one schema safely, share or generate from a common contract. If server/client runtimes or concerns differ, keep separate schemas but test the overlapping contract explicitly.

## Compare these dimensions

- field presence and naming;
- required vs optional/nullability;
- string normalization and length;
- numeric coercion/ranges;
- enum/union values;
- nested arrays/objects;
- cross-field rules;
- date/time serialization;
- file constraints;
- unknown/additional field behavior.

Schema libraries are implementation choices. Preserve the project's existing one unless migration is requested or there is evidence it cannot meet the contract.

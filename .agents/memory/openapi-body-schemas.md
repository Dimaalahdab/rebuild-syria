---
name: OpenAPI body schema naming
description: Generated body naming and date coercion at the API/database boundary.
---
Use named component schemas referenced by request bodies instead of inline object schemas.

**Why:** In this workspace's Orval configuration, an inline request body can generate a TypeScript body alias with the same exported name as its Zod operation-body validator. The combined schema barrel then fails with duplicate exports.

**How to apply:** Define a distinctly named input component, reference it from the operation, and run codegen. Keep operation validator names and reusable input type names distinct.

Normalize validated date-time fields to ISO strings before comparing or binding them to SQLite. Domain workflow tests must pass inputs through the generated request validator, just like the HTTP route.

**Why:** The server's generated validators coerce JSON date-time strings into JavaScript Date objects. Raw-JSON domain tests miss this transformation; SQLite rejects a Date binding even though TypeScript accepts the generated domain input type.

**How to apply:** Test parsed contract inputs, not just handwritten JSON fixtures, and convert dates at the storage boundary rather than changing the generated validators.

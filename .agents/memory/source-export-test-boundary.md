---
name: Source-exporting workspace test boundary
description: Why standalone API test builds cannot assume workspace or root-hoisted runtime dependencies
---

Treat workspace packages as source dependencies, not precompiled Node modules.
Standalone backend test builds must resolve dependencies from their owning
packages rather than depending on root hoisting.

**Why:** The generated validation workspace exports TypeScript with extensionless
internal imports. Externalizing every package left Node unable to resolve those
imports or their transitive validator dependency. Bundling CommonJS dependencies
into ESM also requires Node's real `require` for built-ins.

**How to apply:** Use the API's test runner for isolated checks. New test builds
should bundle JavaScript/source workspace dependencies, retain native SQLite as
an external dependency, and provide the Node CommonJS bridge, as production does.

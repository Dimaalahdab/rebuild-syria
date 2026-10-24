---
name: Gemma output budgeting
description: Avoiding empty text with the direct Google GenAI Gemma 4 API
---

Use minimal thinking and an adequate output token budget for short Gemma 4
connection checks and structured image output.

**Why:** A real request to the available Gemma 4 model with a 64-token budget
returned no text. Minimal thinking with a 1024-token budget returned the requested
Arabic answer successfully.

**How to apply:** Keep the direct server-side Google SDK configuration explicit.
Model availability alone is not a successful generation test.

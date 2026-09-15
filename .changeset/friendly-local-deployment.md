---
"@openuidev/devtools": patch
---

Offer a dismissible deployment popup after a local renderer response settles without detected UI errors, plus a persistent command-copy banner inside Inspect. Both are internal, development/loopback-only controls that share clipboard feedback and link to the existing deployment documentation. The popup is shown once per browser origin. No network analytics are added.

Keep the Inspect deployment control to a compact command row and align the Autofix card with the panel's 12px content inset.

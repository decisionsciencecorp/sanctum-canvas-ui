---
"@openuidev/devtools": patch
---

Offer a dismissible deployment popup after a local renderer response settles without detected UI errors, plus a persistent command-copy banner inside Inspect. Both are development/loopback-only, share clipboard feedback and link to the existing deployment documentation. The popup is shown once per browser origin. Disable both with `deployHint={false}`. No network analytics are added.

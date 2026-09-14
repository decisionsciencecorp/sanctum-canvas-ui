---
"@openuidev/lang-core": minor
---

Add dashboard support to the Cloud artifact helper, including local data-tool
dispatch and the bounded sandbox script execute-loop.

Limit the Cloud public API to `artifactTool`, `createDashboardTools`, and the
`ArtifactToolOptions`, `CreateDashboardToolsOptions`, `DashboardToolDef`, and
`DashboardTools` types. The previously exported library-version constants and
artifact kind, option, and wire types are now internal. Use `libraryVersion` to
override a library pin, `ArtifactToolOptions["artifacts"]` for artifact configuration,
and `ReturnType<typeof artifactTool>` for the generated wire entry.

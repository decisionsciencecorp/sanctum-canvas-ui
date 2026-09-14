# Dashboard artifact tool port

1. Compare the dashboard-specific `c1-server` artifact configuration in genui-sdk PR #98 with OpenUI's existing `@openuidev/lang-core/cloud` helper.
2. Port the dashboard data-plane helper: local tool dispatch, validated run results, and the bounded sandbox script execute-loop.
3. Wire the helper's `generationTools` output into the serializable Cloud artifact configuration, then document the customer route boundary.
4. Add a lang-core patch changeset and run the package's checks.
5. Simplify artifact configuration to accept only the `createDashboardTools()` helper; remove the raw generation-tool array input and preserve support for typed route context.
6. Group the Cloud artifact and dashboard implementation under `src/cloud/`, preserving the public Cloud subpath and built entry filenames.

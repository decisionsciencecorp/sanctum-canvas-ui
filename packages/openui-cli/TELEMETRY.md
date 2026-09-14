# Deployment adoption telemetry

Use these events to measure discovery, CLI completion and repeat deployment. They do not measure whether a hosted app answers prompts successfully.

## Event contract

Deployment events emitted after argument parsing carry `deploy_telemetry_version: 2`. Existing event names remain compatible.

| Event                                        | Meaning                                                                       | Key properties                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `cli_invoked` with `command: deploy`         | A parsed deploy invocation, including one that later fails project validation | `cli_run_id`, CLI version, agent/CI context                                                |
| `cli_deploy_hint_printed`                    | The post-create message was printed, not necessarily read                     | `source`, `position`, `message_version`, `experiment_id`, `variant`, `dev_server_starting` |
| `deploy_command_copied` (website)            | Clipboard write succeeded for a block containing a deploy command             | `source`, `package_manager`                                                                |
| `cli_deploy_started`                         | Project validation passed                                                     | `target`, `prod`, `no_wait`, `yes`, `skip_env`, `verbose`                                  |
| `cli_deploy_stage_started`                   | An operation began                                                            | `stage`                                                                                    |
| `cli_deploy_stage_completed`                 | An operation ended or was skipped                                             | `stage`, `outcome`, `duration_ms`, bounded failure or skip properties                      |
| `cli_deploy_succeeded`                       | The Vercel CLI exited successfully; legacy event                              | `completion_status`, `no_wait`, `confirmation_source`, duration and configuration counts   |
| `cli_deploy_submitted`                       | Successful CLI exit with `--no-wait`; readiness remains unknown               | Same properties as CLI success                                                             |
| `cli_deploy_ready`                           | Successful completion in Vercel's normal waiting mode                         | Same properties as CLI success                                                             |
| `cli_deploy_failed` / `cli_deploy_cancelled` | Terminal failure/cancellation                                                 | Bounded `failure_stage`, `error_class`, `error_code` and process metadata                  |

The submitted and ready events are mutually exclusive for an invocation. Do not add either to the legacy success count: they describe the same successful invocation.

Readiness uses Vercel's CLI waiting-mode contract, recorded as `confirmation_source: vercel_cli_exit`. It is not a separate HTTP health check or a hosted-response check. No background polling is added for `--no-wait`.

Forwarded help/version flags can exit successfully without deploying. These have `completion_status: unverified` and produce neither submitted nor ready events.

Historical `cli_deploy_succeeded` events without `no_wait` cannot be reliably separated into submitted and ready deployments. Do not treat a missing property as `false`.

`prod` retains its legacy meaning: whether `--prod` was supplied. It is not a provider-confirmed deployment environment, especially with forwarded `--target` flags.

## Setup stages

Stages are `validate_project`, `environment_load`, `cli_prepare`, `login_check`, `login`, `link`, `env_sync` and `deploy`.

Every started stage emits a completed event on normal return, failure or caught cancellation. Skipped stages emit only a completed event with `outcome: skipped` and `duration_ms: 0`. Abrupt process termination or offline delivery can leave stages unmatched.

Completion outcomes are `succeeded`, `failed`, `cancelled` and `skipped`. A stage failure also produces a terminal CLI failure; count terminal failures once per `cli_run_id`.

`login_required` records whether login was needed before the attempt. `link_required` records whether linking was needed. The legacy `logged_in` success property still describes the final state. Unknown preflight state is absent, not false.

Environment sync is best-effort. A completed operation can have `env_sync_outcome: partial`, `save_failed` or `unavailable` while deployment continues with locally attached values. Other outcomes are `saved`, `already_configured`, `declined`, `not_linked`, `skip_env` and `no_local_keys`. Use this property rather than stage completion to measure successful persistence.

## Discovery sources

Website copy events categorize the page as `getting-started`, `agent-quickstart`, `cli-reference`, `homepage` or `docs`. The copied text is inspected locally and never included in the event. Existing create-copy events retain their name and properties.

Deploy commands remain unchanged, with no attribution flags or embedded identity. Website copy sources measure interest by surface, not the origin of an individual CLI run. A shared PostHog project alone does not connect anonymous browser and CLI identities. Use the exposed CLI experiment cohort for experimental conversion analysis.

## Experiment attribution

No experiment is enabled by this change. Without a configured flag, the existing “Share a preview” heading remains the baseline.

To run the optional copy experiment, configure the PostHog multivariate flag `cli-deploy-hint-v1` with `control` and `share-app` variants. The latter changes the heading to “Ready to share your app?”. The command and behavior are identical in both arms.

The CLI evaluates the flag only at the post-create hint surface, with a 750 ms budget. False, unknown, failed or timed-out evaluations use baseline copy and do not enroll a new installation. Evaluation is skipped entirely when telemetry is disabled.

The first exposed experimental assignment is saved with its experiment ID in the existing CLI telemetry state. Subsequent active evaluations reuse that assignment, even if allocation weights change. Disabling the flag restores baseline copy. Use a new flag key when designing a different experiment; assignments from older keys are ignored.

Exposure is recorded after printing. `$feature_flag_called` reports the actual rendered experimental variant, not merely a remote evaluation. Follow-up events include `$feature/cli-deploy-hint-v1` and:

- `last_deploy_hint_experiment_id`
- `last_deploy_hint_variant`
- `last_deploy_hint_message_version`
- `last_deploy_hint_printed_at`

These properties survive separate CLI invocations through the telemetry config. They describe the last hint printed on that installation, not the current project's origin. Deploy never reassigns the experiment or makes a feature-flag request.

Use the first experimental exposure to assign a cohort. Compare control and treatment conversion within a fixed window, for example seven days. Exclude baseline/unenrolled exposures. Track outcomes by the existing stable CLI identity, not `cli_run_id`, which changes between create and deploy.

Read-only config storage, deleted state, separate machines, shared installations and telemetry opt-out limit attribution. OAuth aliasing can link CLI usage to an account, but there is no project identifier or guarantee of distinct people.

## Dashboard recipes

1. **Discovery:** deploy command copies by website source, and printed CLI hints by message version. These are different events, not a single person funnel.
2. **Adoption:** first `cli_create_succeeded` to `cli_deploy_started` to `cli_deploy_ready` within seven days, using stable identity. This is user/installation-level conversion, not same-project conversion.
3. **Reliability:** deploy `cli_invoked` to validated start to terminal outcome, joined on `cli_run_id`. Include validation failures. Inspect stage completion outcomes, login requirements, env-sync warnings and duration separately.
4. **Repeat usage:** distinct identities with `cli_deploy_ready` in a later week. Count no-wait submitters separately until readiness can be observed.
5. **Experiment:** first printed experimental exposure to ready within seven days, by the original exposed variant. Keep create completion, errors and cancellation as guardrails.

Separate CI and declared/detected agent cohorts where useful. Agent labels are best-effort, not authentication. Use completed conversion windows and a baseline before setting uplift targets.

## Privacy and delivery

The existing `--no-telemetry`, `DO_NOT_TRACK` and `OPENUI_TELEMETRY_DISABLED` opt-outs disable capture, flag requests and new telemetry-state writes. No generated-app telemetry is added.

New events contain bounded categories, versions, timestamps, booleans and counts. They do not contain API keys, environment values, project paths, deployment URLs, copied code, raw logs or prompt contents. Existing OAuth identity behavior is unchanged.

Delivery remains best-effort. SDK errors do not fail the developer's command. Before trusting a production dashboard, verify event arrival, identity aliasing, duplicate counts and cancellation coverage in PostHog; source inspection cannot establish live ingestion health.

References: [Vercel no-wait behavior](https://vercel.com/docs/cli/deploy#no-wait), [PostHog Node SDK](https://posthog.com/docs/libraries/node), [PostHog funnels](https://posthog.com/docs/product-analytics/funnels).

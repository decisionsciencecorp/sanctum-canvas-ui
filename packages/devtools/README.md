# @openuidev/devtools

Development-only UI widget for OpenUI apps. Renders a floating button that opens **OpenUI Inspect**, listing the events captured by [`@openuidev/observability`](../observability).

## Usage

If your app uses `@openuidev/react-lang`, the widget shows up automatically.

You can also mount it yourself. All props are forwarded into that widget:

```tsx
import { OpenUIDevtools } from "@openuidev/devtools";

function App() {
  return (
    <>
      {/* your app */}
      <OpenUIDevtools theme="dark" position="bottom-left" maxEvents={100} />
    </>
  );
}
```

| Prop                                                                         | Default   | Notes                                                              |
| ---------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| `version`                                                                    | `@latest` | Pin CDN tag: `"0"` (major), `"0.1"` (minor), or `"0.1.0"` (exact). |
| `theme`, `position`, `maxEvents`, `errorsOnly`, `autoOpenOnError`, `enabled` | see below | Forwarded into the CDN widget as-is                                |

A manually mounted instance always wins over the auto-mount — only one instance ever renders.

Publishing a new version of this package updates the CDN file on jsDelivr automatically (no separate CDN setup). The browser build is `dist/devtools.browser.js` inside the published tarball.

The widget renders nothing in production builds (`NODE_ENV === "production"`) unless `enabled` is passed explicitly.

### Local deployment hint

After a non-empty OpenUI renderer stream settles with no detected UI errors, a development-only popup offers the deploy command and [deployment documentation](https://www.openui.com/docs/api-reference/cli#deploy). It never runs a command, steals focus or opens Inspect. It is limited to localhost/loopback and stays out of production even when Inspect is explicitly enabled.

The popup is shown once per browser origin (host + port) using the local `openui:deploy-hint:v1` storage key. Dismissal persists across reloads. This is not exact project identity: projects reusing a port share the choice; changing ports creates a separate origin. If storage is blocked, the popup stays hidden.

Inspect also includes a compact deployment banner at the top of its scrollable event list. It displays `npx @openuidev/cli@latest deploy` with a copy button, even before a response or after the popup is dismissed. Its close button remembers dismissal separately using `openui:deploy-banner-dismissed:v1` in local storage. If storage is blocked, the banner can still be closed for the current mount. Both surfaces show clipboard success/failure feedback and allow manual selection of the command. The banner has the same development/loopback restriction. Deployment controls are internal widget behavior, not a separate public option.

No network analytics are added. The renderer event is a local eligibility signal, not proof of a useful business outcome or a hosted-response event. The guide link uses the existing coarse devtools referral tags. In older auto-mounted wrappers, the auto-mount's development-only gate supplies the build-mode guarantee; manually mounted wrappers need the updated host package for this hint.

### CSP

`script-src` must allow `cdn.jsdelivr.net` for the fetch to succeed. If it's blocked, the widget silently fails to appear — the rest of the app is unaffected.

In development, `createLibrary()` registers the live library with the widget. A stream event's **Debug** button opens **OpenUI Debug** in its own tray — an editor against that library (host CSS included), with Render / Validation / Tree / JSON / Stream panels and simulated stream playback.

Debug renders through the host's own `Renderer`. Its previews stay off the event bus so a Stream replay does not append cards to Inspect.

## Props

| Prop              | Default          | Description                                                              |
| ----------------- | ---------------- | ------------------------------------------------------------------------ |
| `enabled`         | dev-only         | Force the widget on/off.                                                 |
| `position`        | `"bottom-right"` | Corner for the toggle button: `top-left`/`top-right`/`bottom-*`.         |
| `maxEvents`       | `50`             | How many events to keep; oldest are dropped first.                       |
| `errorsOnly`      | `true`           | Capture only error/warning events, or all.                               |
| `autoOpenOnError` | `true`           | Initial state of the "auto-open on error" setting.                       |
| `theme`           | `"light"`        | Initial widget chrome theme: `"light"` or `"dark"` (Settings overrides). |
| `version`         | `@latest`        | CDN pin: `"0"` / `"0.1"` / `"0.1.0"`. Omit for `@latest`.                |

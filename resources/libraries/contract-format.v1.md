# Sanctum component contract format v1.0.0

**One file feeds PHP and browser JavaScript.** No dual Zod/PHP schemas.

## Library document

```json
{
  "contractFormatVersion": "1.0.0",
  "id": "sanctum-openui-dashboard",
  "variant": "dashboard",
  "root": "Stack",
  "upstreamCommit": "ee54f66",
  "componentGroups": [],
  "components": {
    "ComponentName": { "...": "see component object" }
  }
}
```

## Component object (required fields)

| Field | Type | Rule |
|-------|------|------|
| `name` | string | Must match object key |
| `version` | string | Semver of contract surface |
| `propertyOrder` | string[] | **Explicit** positional arg order. Required. Non-empty for components with props. |
| `properties` | object | Map prop → `{ type, required?, default?, enum?, description?, items?, $ref? }` |
| `required` | string[] | Required prop names (subset of propertyOrder) |
| `reactiveProps` | string[] | Props that accept `$variable` two-way binding (Sanctum H1) |
| `allowedChildren` | string[] \| null | Allowed child component names; `null` = leaf; `["*"]` = any registered (avoid) |
| `renderer` | string | Browser module path under `public/assets/js/components/` |
| `securityCapabilities` | string[] | Subset of: `none`, `links`, `images`, `actions`, `tools`, `markdown` |
| `prompt` | object | `{ description, group?, notes?[] }` |

## Forbidden

- Relying on JSON object key order instead of `propertyOrder`
- Omitting `reactiveProps` (use `[]` if none)
- A renderer without a contract, or a contract without a renderer (CI check from A1)

## Examples

See `resources/libraries/examples/`.

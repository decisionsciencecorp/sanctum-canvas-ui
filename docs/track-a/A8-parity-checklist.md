# A8 — Doc #1380 → registry parity checklist

**Source:** [Doc #1380](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1380) component inventory  
**Registry:** `src/Browser/components/**/register*.js` + `registerFoundation.js`  
**Libraries:** chat + dashboard share renderers; active contract decides membership (Doc #1380 §3).  
**Date:** 2026-09-18 · **A8.2 CLOSED** (task [#4170](https://tasks.decisionsciencecorp.com/admin/view.php?id=4170))

## Legend

| Status | Meaning |
|--------|---------|
| **present** | Named type registered in a `register*` map (chat and/or dashboard host can mount). |
| **present (module)** | Behavior shipped as a shared module (not a PascalCase registry entry). |
| **data-contract** | Item/data-only contract; folded into parent chart props/normalize. |
| **missing** | Doc #1380 name has no renderer registration yet. |

## Chat vs dashboard (composition)

| Name | Dashboard | Chat | Notes |
|------|-----------|------|-------|
| `Stack` | **present** (root) | contract: not root | Renderer exists; chat library must not use Stack as root. |
| `Modal` | **present** | contract: not in pinned chat | Renderer exists; chat library omits Modal. |
| `Card` sources strip | optional | **present** (`CardSources` / `Sources`) | Chat locked vertical Card + sources. |
| `SectionBlock` / `FollowUp*` | n/a | **present** | Chat-only containers/actions. |

## Inventory

### Content

| Component | Registry | Notes |
|-----------|----------|-------|
| `Card` | present | JS `register*` map |
| `CardHeader` | present | JS `register*` map |
| `TextContent` | present | JS `register*` map |
| `MarkDownRenderer` | present (module) | Safe markdown in `src/Browser/security/markdown.js` — not a registry type |
| `Callout` | present | JS `register*` map |
| `TextCallout` | present | JS `register*` map |
| `Image` | present | JS `register*` map |
| `ImageBlock` | present | JS `register*` map |
| `ImageGallery` | present | JS `register*` map |
| `CodeBlock` | present | JS `register*` map |
| `InlineHeader` | present | JS `register*` map |

### Tables

| Component | Registry | Notes |
|-----------|----------|-------|
| `Table` | present | JS `register*` map |
| `Col` | present | JS `register*` map |
| `EditableTable` | present | JS `register*` map |

### Charts (2D)

| Component | Registry | Notes |
|-----------|----------|-------|
| `BarChart` | present | JS `register*` map |
| `LineChart` | present | JS `register*` map |
| `AreaChart` | present | JS `register*` map |
| `RadarChart` | present | JS `register*` map |
| `HorizontalBarChart` | present | JS `register*` map |
| `Series` | data-contract | Consumed by chart normalizeSeries — not a visual register |

### Charts (1D)

| Component | Registry | Notes |
|-----------|----------|-------|
| `PieChart` | present | JS `register*` map |
| `RadialChart` | present | JS `register*` map |
| `SingleStackedBarChart` | present | JS `register*` map |
| `Slice` | data-contract | Consumed by normalizeSlices — not a visual register |

### Scatter

| Component | Registry | Notes |
|-----------|----------|-------|
| `ScatterChart` | present | JS `register*` map |
| `ScatterSeries` | data-contract | ScatterChart series props — not a visual register |
| `Point` | data-contract | ScatterChart point props — not a visual register |

### Forms

| Component | Registry | Notes |
|-----------|----------|-------|
| `Form` | present | JS `register*` map |
| `FormControl` | present | JS `register*` map |
| `Label` | present | JS `register*` map |
| `Input` | present | JS `register*` map |
| `TextArea` | present | JS `register*` map |
| `Select` | present | JS `register*` map |
| `SelectItem` | present | JS `register*` map |
| `DatePicker` | present | JS `register*` map |
| `Slider` | present | JS `register*` map |
| `CheckBoxGroup` | present | JS `register*` map |
| `CheckBoxItem` | present | JS `register*` map |
| `RadioGroup` | present | JS `register*` map |
| `RadioItem` | present | JS `register*` map |
| `SwitchGroup` | present | JS `register*` map |
| `SwitchItem` | present | JS `register*` map |
| `Chips` | present | JS `register*` map |
| `ChipItem` | present | JS `register*` map |
| `OptionCards` | present | JS `register*` map |
| `OptionCard` | present | JS `register*` map |

### Buttons

| Component | Registry | Notes |
|-----------|----------|-------|
| `Button` | present | JS `register*` map |
| `Buttons` | present | JS `register*` map |
| `IconButton` | present | JS `register*` map |

### Layout

| Component | Registry | Notes |
|-----------|----------|-------|
| `Stack` | present | JS `register*` map |
| `Tabs` | present | JS `register*` map |
| `TabItem` | present | JS `register*` map |
| `Accordion` | present | JS `register*` map |
| `AccordionItem` | present | JS `register*` map |
| `Steps` | present | JS `register*` map |
| `StepsItem` | present | JS `register*` map |
| `Carousel` | present | JS `register*` map |
| `Separator` | present | JS `register*` map |
| `Modal` | present | JS `register*` map |

### Lists / tags

| Component | Registry | Notes |
|-----------|----------|-------|
| `TagBlock` | present | JS `register*` map |
| `Tag` | present | JS `register*` map |
| `Icon` | present | JS `register*` map |
| `EntityList` | present | JS `register*` map |
| `ListBlock` | present | JS `register*` map |
| `ListItem` | present | JS `register*` map |

### Inline card items

| Component | Registry | Notes |
|-----------|----------|-------|
| `Text` | present | JS `register*` map |
| `BoldText` | present | JS `register*` map |
| `IconText` | present | JS `register*` map |
| `ImageText` | present | JS `register*` map |
| `ImageTextLarge` | present | JS `register*` map |
| `MetricIndicatorInline` | present | JS `register*` map |
| `MetricIndicatorWithStrikethrough` | present | JS `register*` map |

### Card blocks

| Component | Registry | Notes |
|-----------|----------|-------|
| `SnippetCardBlock` | present | JS `register*` map |
| `SnippetCardItem` | present | JS `register*` map |
| `OverviewCardBlock` | present | JS `register*` map |
| `OverviewCardItem` | present | JS `register*` map |
| `ContextCardBlock` | present | JS `register*` map |
| `ContextCardItem` | present | JS `register*` map |
| `CompositeCardBlock` | present | JS `register*` map |
| `CompositeCardItem` | present | JS `register*` map |
| `VisualCardBlock` | present | JS `register*` map |
| `VisualCardItem` | present | JS `register*` map |

### Chat-only

| Component | Registry | Notes |
|-----------|----------|-------|
| `SectionBlock` | present | JS `register*` map |
| `SectionItem` | present | JS `register*` map |
| `FollowUpBlock` | present | JS `register*` map |
| `FollowUpItem` | present | JS `register*` map |

## Totals

| Status | Count |
|--------|------:|
| present | 81 |
| present (module) | 1 |
| data-contract | 4 |
| missing | 0 |
| **Doc #1380 names checked** | **86** |

## Cross-check — `register*` vs libraries (A8.2)

| Check | Result |
|-------|--------|
| Every Doc #1380 visual name in a `register*` map | **Yes** (81 present), including **`Icon`** via `CONTENT_COMPONENTS` / `registerContent` |
| `MarkDownRenderer` | present (module) — `security/markdown.js`, not a PascalCase registry type |
| `Series` / `Slice` / `ScatterSeries` / `Point` | data-contract only — consumed by chart normalize (not silent placeholders) |
| Silent / static placeholders for Doc #1380 names | **None** — form `placeholder=` attrs and Stack partial skeleton are intentional UX, not missing components |
| `resources/libraries/{chat,dashboard}/library.v1.json` | Intentionally slim (H21) — few prompt-facing roots; **renderer registry is the parity surface** for Doc #1380 |

### Slim library keys (prompt/schema, not full inventory)

| Library | Components in `library.v1.json` |
|---------|----------------------------------|
| chat | `Card`, `Stack`, `TextContent`, `Button`, `Input`, `BarChart` |
| dashboard | `Stack`, `TextContent`, `Button`, `Input`, `BarChart` |

Registry capability exceeds these manifests by design (H21). Expanding manifests is Track B / later library work — not an A8.2 missing-component failure.

## Extra registry names (not in Doc #1380 §2–3 list)

| Name | Role |
|------|------|
| `MetricIndicator` | Sanctum/extra registration beyond §2 list |
| `CardContent` | Sanctum/extra registration beyond §2 list |
| `CardSources` | Sanctum/extra registration beyond §2 list |
| `CitationRef` | Sanctum/extra registration beyond §2 list |
| `ToolActivity` | Sanctum/extra registration beyond §2 list |
| `RunStatus` | Sanctum/extra registration beyond §2 list |
| `Submit` | Sanctum/extra registration beyond §2 list |
| `Description` | Sanctum/extra registration beyond §2 list |
| `Reset` | Sanctum/extra registration beyond §2 list |

---

## A8.2 acceptance

| Gate | Result |
|------|--------|
| Doc #1380 names checked | **86** (81 present + 1 module + 4 data-contract) |
| missing | **0** |
| Icon | **present** |
| No silent placeholders | **confirmed** |

**Status:** **GREEN** — A8.2 closed.

*Generated from live `register*` imports — re-run when registrations change.*

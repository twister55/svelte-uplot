# svelte-uplot

A thin [uPlot](https://github.com/leeoniya/uPlot) wrapper for **Svelte 5** (runes).
uPlot is chosen for speed — the wrapper's job is to add nothing on top: it only
binds uPlot's lifecycle to Svelte's reactivity.

- **Declarative component + attachment** — two equal ways to use it
- **Correct update semantics** — the wrapper decides between recreating the chart
  (uPlot cannot be reconfigured in place) and a cheap `setData()` call
- **Autosize by default** — built-in ResizeObserver-based resizing
- **Cursor sync** — share a cursor across charts with a single `syncKey` prop

Peer dependencies: `svelte >= 5.29` (attachments) and `uplot >= 1.6.25` — nothing
else. uPlot plugins compose through the standard `options.plugins`; the wrapper
doesn't need to know about them.

## Install

```sh
npm i svelte-uplot uplot
```

Import uPlot's stylesheet once (e.g. in your root layout):

```js
import 'uplot/dist/uPlot.min.css';
```

## Component

```svelte
<script lang="ts">
	import { UPlot } from 'svelte-uplot';
	import type { AlignedData, Options } from 'uplot';

	let { options, data }: { options: Options; data: AlignedData } = $props();
</script>

<UPlot
	style="height: 300px"
	{options}
	{data}
	syncKey="dashboard"
	onCreate={(u) => console.log(u)}
/>
```

### Update semantics

| Change                    | What happens                       |
| ------------------------- | ---------------------------------- |
| `data` (new reference)    | `chart.setData(data, resetScales)` |
| `options` (new reference) | `destroy()` + `new uPlot(...)`     |
| `syncKey` / `autosize`    | recreate                           |

uPlot options are not reactive — changing a scale's `distr`, timezone, axes or
colors requires a new instance. So the contract is by reference: **replace the
`options` object to reconfigure** (a `$derived` works naturally), replace `data`
to update in place. Mutating a kept `options` reference is not observed. This
also covers theming: derive `options` from your theme and a theme switch
recreates the chart with new colors.

`resetScales={false}` preserves the current zoom/pan across data updates.

### Props

- `options: uPlot.Options` — passed through as is, no per-option props
- `data: uPlot.AlignedData`
- `resetScales?: boolean` — forwarded to `setData()` (default `true`)
- `autosize?: boolean` — follow the container size (default `true`)
- `syncKey?: string` — share cursor between charts with the same key
- `onCreate?/onDestroy?: (chart: uPlot) => void`
- any other attributes go to the container `<div>` (which must have a height —
  the chart fills it)

### Autosize

On by default: a `ResizeObserver` on the container keeps the chart sized to it,
so `options.width/height` only serve as a fallback while the container measures
0 (`display: none`, or not laid out yet). Resize events are throttled to 100ms
and applied in a `requestAnimationFrame`, so a drag across a splitter costs a
handful of `setSize()` calls rather than one per frame. A hidden page gets no
animation frames, so the resize lands — measured afresh — when it is shown again.

The element being followed is the component's **own** `<div>`, so that is where
the height belongs (`style` and `class` go through to it):

```svelte
<UPlot style="height: 18rem" {options} {data} />
```

Two things follow from that:

- A **scoped** class does not reach it. Svelte compiles `.chart` in a parent's
  `<style>` to `.chart.svelte-xxxx`, and a class handed to a component is not
  given the scope hash — so the rule silently misses. Use inline `style`, a
  global class (`:global(.chart)`, Tailwind, a stylesheet) or a CSS variable.
- Wrapping the component in a sized `<div>` is not enough on its own: the chart's
  own `<div>` is auto-height inside that wrapper. It still works — the chart just
  keeps the height from `options` — but to actually fill the wrapper, pass
  `style="height: 100%"`.

A container whose height comes from its content is fine: the chart keeps the
height from `options` and only follows the width.

Pass `autosize={false}` to size the chart from `options.width/height` and drive
resizing yourself.

### Cursor sync

`syncKey` fills in `options.cursor.sync` with `setSeries: true`. The rest of
`cursor.sync` (`filters`, `match`, `scales`, …) is yours to set — only `key`
stays the prop's, so the chart always joins the bus the prop names. Unsubscribing
is uPlot's own job on `destroy()`.

## Attachment

The component is built on top of a Svelte attachment (5.29+), which you can use
directly on any element:

```svelte
<script lang="ts">
	import { uplot } from 'svelte-uplot';
</script>

<div style="height: 300px" {@attach uplot(() => ({ options, data }))}></div>
```

The config object accepts the same fields as the component props
(`options`, `data`, `resetScales`, `autosize`, `syncKey`, `onCreate`,
`onDestroy`).

## Scope

svelte-uplot binds uPlot's lifecycle to Svelte's reactivity — nothing more. The
package decides between recreating the chart and calling `setData()`, keeps the
chart sized to its container, and wires up cursor sync.

Out of scope: plugins, utilities, styling, per-option props. uPlot `options` go
through untouched, and plugins — your own or from any third-party plugin
collection — compose via uPlot's standard `options.plugins`. The wrapper
neither knows nor needs to know about them.

The entire public API is `UPlot` (component) and `uplot` (attachment), plus
their types. Autosize and cursor sync are props (`autosize`, `syncKey`) —
implementation details of the lifecycle, not exported utilities.

## Development

```sh
pnpm dev        # demo site
pnpm test:unit  # vitest browser mode (Chromium)
pnpm build      # svelte-package + publint
```

## License

MIT

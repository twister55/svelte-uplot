# svelte-uplot

### The fastest charts on the web, bound to Svelte 5's reactivity — and nothing else.

[uPlot](https://github.com/leeoniya/uPlot) draws an interactive 150,000-point chart
from a cold start in ~90ms, in ~45 KB min.
`svelte-uplot` is the ~3 KB layer that makes it feel like a Svelte component:
declarative, reactive, autosizing, SSR-safe — with **zero** abstraction over uPlot's own API.

[![CI](https://github.com/twister55/svelte-uplot/actions/workflows/ci.yml/badge.svg)](https://github.com/twister55/svelte-uplot/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/svelte-uplot?logo=npm&color=cb3837)](https://www.npmjs.com/package/svelte-uplot)
[![gzip](https://img.shields.io/badge/runtime-3.1_kB_gzip-brightgreen)](#why-this-one)
[![Svelte 5](https://img.shields.io/badge/Svelte-5%20runes-ff3e00?logo=svelte&logoColor=white)](https://svelte.dev)
[![uPlot](https://img.shields.io/badge/uPlot-%E2%89%A5%201.6.25-4b8bbe)](https://github.com/leeoniya/uPlot)
[![TypeScript](https://img.shields.io/badge/types-included-3178c6?logo=typescript&logoColor=white)](#typescript)
[![SSR safe](https://img.shields.io/badge/SSR-safe-success)](#ssr--sveltekit)
[![tests](https://img.shields.io/badge/tests-38%20passing-success)](#development)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[Install](#install) · [Quick start](#quick-start) · [Update semantics](#update-semantics) · [Props](#props) · [Autosize](#autosize) · [Cursor sync](#cursor-sync) · [Attachment](#attachment) · [Scope](#scope)

---

## Why this one

Most chart wrappers spend their bundle re-inventing the library they wrap: per-option
props, a config DSL, a plugin registry, a theme layer. Every one of those is a wall
between you and uPlot the day you need something it didn't anticipate.

This one has no walls. `options` goes to uPlot untouched.

|                                  |                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🪶 **~3 KB gzip**                | The whole runtime. No dependencies of its own — uPlot and Svelte are peers.                                               |
| ⚡ **Zero overhead**             | No wrapping, no normalizing, no diffing your options. One `new uPlot()` and one `setData()`, exactly when they're needed. |
| 🔁 **Correct by reference**      | New `options` → recreate (uPlot can't be reconfigured in place). New `data` → cheap `setData()`. No guessing.             |
| 📐 **Autosize built in**         | A throttled `ResizeObserver` keeps the chart filling its container — splitters, sidebars, window resizes, all free.       |
| 🔗 **Cursor sync**               | Share a crosshair across a whole dashboard with one `syncKey="…"` prop.                                                   |
| 🖥️ **SSR-safe**                  | Import it anywhere in SvelteKit. No `browser` guards, no `onMount` dynamic imports.                                       |
| 🧩 **Component _or_ attachment** | Two equal entry points. Use `<UPlot />`, or attach a chart to any `<div>` you already own.                                |
| 🔌 **Plugins just work**         | Any uPlot plugin, yours or third-party, composes through `options.plugins`. The wrapper doesn't know they exist.          |
| 🧪 **38 tests**                  | Real browser tests (Chromium) for lifecycle, resize and sync, plus Node tests pinning SSR safety.                         |

**Non-goals, on purpose:** no per-option props, no bundled plugins, no styling
layer, no chart-type helpers. Read [Scope](#scope) before opening a feature
request — a "no" there is a design decision, not a backlog item.

## Install

```sh
npm i svelte-uplot uplot
```

Import uPlot's stylesheet once (e.g. in your root layout):

```js
import 'uplot/dist/uPlot.min.css';
```

Peer dependencies: `svelte >= 5.29` (attachments) and `uplot >= 1.6.25`
(`destroy()` leaves the sync bus on its own from that version). Nothing else.

## Quick start

```svelte
<script lang="ts">
	import { UPlot } from 'svelte-uplot';
	import type { AlignedData, Options } from 'uplot';

	const options: Options = {
		width: 800,
		height: 300,
		series: [{}, { label: 'CPU', stroke: '#ff3e00', width: 2 }]
	};

	let data: AlignedData = $state([
		[1, 2, 3, 4, 5],
		[42, 51, 47, 63, 58]
	]);
</script>

<UPlot style="height: 300px" {options} {data} />
```

That's the whole thing. Push a new `data` array and the chart updates in place;
push a new `options` object and it reconfigures. Everything else is uPlot.

A dashboard of charts sharing one crosshair:

```svelte
<UPlot style="height: 220px" options={cpuOptions} data={cpu} syncKey="host-1" />
<UPlot style="height: 220px" options={memOptions} data={mem} syncKey="host-1" />
<UPlot style="height: 220px" options={netOptions} data={net} syncKey="host-1" />
```

Streaming data without losing the user's zoom:

```svelte
<UPlot {options} data={live} resetScales={false} />
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

```svelte
<script lang="ts">
	// a new object each time `theme` changes → chart recreated with new colors
	const options = $derived({ ...base, axes: axesFor(theme.current) });
</script>

<UPlot {options} {data} />
```

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

`onCreate` hands you the raw `uPlot` instance — the escape hatch for anything
imperative (`u.setScale()`, `u.addSeries()`, custom event wiring). `onDestroy`
is always called with the instance that callback was created alongside, so a
recreate never mixes the outgoing chart up with incoming props.

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

Reach for the attachment when the `<div>` isn't yours to give up — inside another
component's slot, on an element that already carries actions and bindings, or
when you want the chart to live on a node you position yourself. It is the same
code path the component uses, not a lesser one.

## TypeScript

Types ship with the package and come straight from uPlot: `options` is
`uPlot.Options`, `data` is `uPlot.AlignedData`, callbacks get a real `uPlot`.
There is no parallel type universe to learn, and no `any` in the way of
autocomplete on uPlot's own config.

```ts
import type { UPlotConfig } from 'svelte-uplot';
```

## SSR / SvelteKit

uPlot is browser-only (canvas, ResizeObserver), but importing it is SSR-safe.
The component server-renders to its bare container `<div>`; the chart is created
strictly inside effects and attachments, which never run on the server. No
`browser` checks or dynamic imports needed in your code.

This is pinned down by tests that render the component in Node with no DOM at
all — so it stays true.

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
pnpm test:unit  # vitest browser mode (Chromium) + node SSR tests
pnpm build      # svelte-package + publint
```

Issues and PRs welcome — read [Scope](#scope) first, it answers most feature
requests before they're written.

## License

MIT © [Vadim Yelisseyev](https://github.com/twister55)
</content>

# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 — 2026-07-30

First release. Binds uPlot's lifecycle to Svelte 5's reactivity — nothing on top.

### Added

- `UPlot` component and the `uplot` attachment it is built on — two equal ways to
  mount a chart. The whole public API, plus the `UPlotConfig` type.
- Update semantics by reference: a new `options` object destroys the chart and
  creates a new one (uPlot cannot be reconfigured in place), a new `data` array is
  a `setData()` call. Mutating a kept `options` reference is deliberately not
  observed. `resetScales={false}` preserves zoom/pan across data updates.
- Autosize, on by default: a throttled `ResizeObserver` keeps the chart sized to
  its container's content box, converging on the height uPlot's own chrome (legend,
  padding) takes. `options.width/height` remain the fallback for a container that
  measures 0. Off with `autosize={false}`.
- Cursor sync between charts via a single `syncKey` prop, which fills in
  `options.cursor.sync` with `setSeries: true` and leaves the rest to the caller.
- SSR safety: importing the package needs no DOM, and the component renders to its
  bare container `<div>` on the server — no `browser` guards or dynamic imports
  needed downstream.

### Notes

- Peer dependencies are `svelte >= 5.29` (attachments) and `uplot >= 1.6.25`
  (`destroy()` leaves the sync bus on its own from that version).
- Published from GitHub Actions with npm provenance, so the tarball on npm is
  traceable to the commit and workflow it was built from. Every release repeats
  the full CI run — lint, typecheck, unit tests in Chromium, `svelte-package` and
  `publint` — against the exact tree being published.

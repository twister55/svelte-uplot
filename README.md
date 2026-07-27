# svelte-uplot

A thin [uPlot](https://github.com/leeoniya/uPlot) wrapper for **Svelte 5** (runes).
uPlot is chosen for speed — the wrapper's job is to add nothing on top: it only
binds uPlot's lifecycle to Svelte's reactivity.

## Development

```sh
pnpm dev        # demo site
pnpm test:unit  # vitest browser mode (Chromium) + node SSR tests
pnpm build      # svelte-package + publint
```

## License

MIT

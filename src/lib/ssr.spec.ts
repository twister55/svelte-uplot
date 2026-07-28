// Runs in the node project, where no DOM exists at all: anything that reaches for
// a browser API while the package is imported or the component is rendered throws
// here. That is the whole guarantee — a SvelteKit app needs neither `browser`
// checks nor a dynamic import around this package.
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { DATA, OPTIONS } from '../test-utils.js';

describe('SSR safety', () => {
	it('imports the package entry without a DOM', async () => {
		expect(globalThis.document).toBeUndefined();

		const mod = await import('./index.js');

		expect(mod.UPlot).toBeDefined();
		expect(mod.uplot).toBeTypeOf('function');
	});

	it('renders the component to markup', async () => {
		const { UPlot } = await import('./index.js');

		const { body, head } = render(UPlot, {
			props: { options: OPTIONS, data: DATA, class: 'chart' }
		});

		// the container is server-rendered and hydrated as is; uPlot itself only
		// shows up once the attachment runs in the browser
		expect(body).toContain('class="chart"');
		expect(body).not.toContain('<canvas');
		expect(head).toBe('');
	});
});

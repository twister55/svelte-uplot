import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import uPlot from 'uplot';
// the geometry here is measured off the real DOM, so uPlot's own stylesheet
// (which positions the canvas and the axes) has to be in the page
import 'uplot/dist/uPlot.min.css';
import UPlot from './UPlot.svelte';
import { autosize } from './autosize.js';
import { DATA, laidOut, options } from '../test-utils.js';

/** the container <UPlot> renders the chart into */
function chartEl(container: HTMLElement) {
	return container.querySelector<HTMLDivElement>('[data-testid="chart"]')!;
}

/** uPlot's own legend — the part of the overhead that rewraps with the width */
function legendHeight(u: uPlot) {
	return u.root.querySelector<HTMLElement>('.u-legend')!.offsetHeight;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const mounted: Array<{ u?: uPlot; el: HTMLElement }> = [];

function element(style: string) {
	const el = document.createElement('div');
	el.style.cssText = style;
	document.body.appendChild(el);
	mounted.push({ el });
	return el;
}

/** a bare chart, for the cases that need the plugin configured directly */
function plot(el: HTMLElement, plugins: uPlot.Plugin[]) {
	const u = new uPlot(options({ plugins }), DATA, el);
	mounted[mounted.findIndex((m) => m.el === el)].u = u;
	return u;
}

afterEach(() => {
	for (const { u, el } of mounted) {
		u?.destroy();
		el.remove();
	}
	mounted.length = 0;
});

describe('autosize', () => {
	it('sizes the chart to its container, not to options.width/height', async () => {
		const charts: uPlot[] = [];
		render(UPlot, {
			options: options({ width: 400, height: 200 }),
			data: DATA,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		expect(charts[0].width).toBe(320);
		expect(charts[0].height).toBe(160);
	});

	it('falls back to options.width/height for a zero-sized container', async () => {
		const charts: uPlot[] = [];
		render(UPlot, {
			options: options({ width: 400, height: 200 }),
			data: DATA,
			style: 'width: 0; height: 0',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		expect(charts[0].width).toBe(400);
		expect(charts[0].height).toBe(200);
	});

	// uPlot's root is taller than the plotting area it was asked for — the legend
	// sits below it — so a container whose height comes from its content reads back
	// more than was just set. Feeding that in would climb one legend per tick.
	it('settles instead of growing inside an auto-height container', async () => {
		const charts: uPlot[] = [];
		render(UPlot, {
			options: options({ legend: { show: true }, width: 400, height: 200 }),
			data: DATA,
			style: 'width: 320px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		await laidOut(charts[0]);
		const initial = charts[0].height;

		// six throttle windows' worth of chances to climb
		await sleep(600);

		expect(charts[0].height).toBe(initial);
	});

	it('settles after a width change inside an auto-height container', async () => {
		const charts: uPlot[] = [];
		const { container } = render(UPlot, {
			options: options({ legend: { show: true }, width: 400, height: 200 }),
			data: DATA,
			style: 'width: 320px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});
		await laidOut(charts[0]);

		chartEl(container).style.width = '480px';
		await expect.poll(() => charts[0].width, { timeout: 2000 }).toBe(480);

		// the legend may rewrap and shift the height once; what must not happen is
		// that it keeps moving
		const settled = charts[0].height;
		await sleep(400);

		expect(charts[0].height).toBe(settled);
		expect(charts[0].width).toBe(480);
	});

	it('leaves room for the legend inside a fixed-height container', async () => {
		const charts: uPlot[] = [];
		render(UPlot, {
			options: options({ legend: { show: true }, width: 400, height: 200 }),
			data: DATA,
			style: 'width: 320px; height: 240px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});
		await laidOut(charts[0]);

		// the whole chart, legend included, has to fit the height it was given
		await expect.poll(() => charts[0].root.offsetHeight, { timeout: 2000 }).toBe(240);
		expect(charts[0].height).toBeLessThan(240);
	});

	// The overhead a measurement subtracts is read from the layout *before* its
	// setSize, and the width being applied can change it: uPlot's legend rewraps to
	// more or fewer rows. The element's own box does not move when that happens, so
	// no further observation is coming — only the re-measure after a setSize keeps
	// these two from sticking at the stale reading.
	const wrapping = () =>
		options({
			legend: { show: true },
			width: 400,
			height: 240,
			// long enough to need more than one legend row in a narrow chart
			series: [
				{},
				{ label: 'a fairly long series label', stroke: 'red' },
				{ label: 'another fairly long label', stroke: 'blue' }
			]
		});

	it('gives up plot height when the legend rewraps to another row', async () => {
		const charts: uPlot[] = [];
		const { container } = render(UPlot, {
			options: wrapping(),
			data: DATA,
			style: 'width: 400px; height: 240px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});
		await laidOut(charts[0]);
		await expect.poll(() => charts[0].root.offsetHeight, { timeout: 2000 }).toBe(240);
		const oneRow = charts[0].height;
		const oneRowLegend = legendHeight(charts[0]);

		chartEl(container).style.width = '200px';
		await expect.poll(() => charts[0].width, { timeout: 2000 }).toBe(200);

		// The legend has rewrapped by now — the width is what it wraps to, and the
		// convergence passes that follow only move the height. How many rows it takes
		// at 200px is a font metric, and a platform whose glyphs are a little wider
		// needs more of them, so what the plot owes the legend is measured, not assumed.
		const grew = legendHeight(charts[0]) - oneRowLegend;
		expect(grew).toBeGreaterThan(0);

		// The plot gives up exactly that much, instead of keeping the height it was
		// sized to before the rewrap. Clamped at zero: a legend taller than the box
		// leaves the plotting area nothing, and the root then outgrows the element —
		// the degenerate case the next test starts from.
		await expect.poll(() => charts[0].height, { timeout: 2000 }).toBe(Math.max(0, oneRow - grew));
	});

	it('takes the plot height back once the legend can unwrap again', async () => {
		const charts: uPlot[] = [];
		const { container } = render(UPlot, {
			options: wrapping(),
			data: DATA,
			// so narrow that the legend alone wants more than the container is tall:
			// the plotting area is squeezed to (nearly) nothing
			style: 'width: 120px; height: 240px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});
		await laidOut(charts[0]);
		await expect.poll(() => charts[0].height, { timeout: 2000 }).toBeLessThan(120);

		chartEl(container).style.width = '600px';
		await expect.poll(() => charts[0].width, { timeout: 2000 }).toBe(600);

		// one legend row again, so the plot is visible and the chart fits exactly
		await expect.poll(() => charts[0].root.offsetHeight, { timeout: 2000 }).toBe(240);
		expect(charts[0].height).toBeGreaterThan(120);
	});

	it('sizes the chart to the container’s content box, not its padding box', async () => {
		const charts: uPlot[] = [];
		render(UPlot, {
			options: options({ width: 400, height: 200 }),
			data: DATA,
			style: 'width: 320px; height: 160px; padding: 10px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		expect(charts[0].width).toBe(320);
		expect(charts[0].height).toBe(160);
	});

	it('follows the container when it is resized', async () => {
		const charts: uPlot[] = [];
		const { container } = render(UPlot, {
			options: options(),
			data: DATA,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		const el = chartEl(container);
		el.style.width = '500px';
		el.style.height = '250px';

		// ResizeObserver -> 100ms throttle -> requestAnimationFrame
		await expect.poll(() => charts[0].width, { timeout: 2000 }).toBe(500);
		expect(charts[0].height).toBe(250);
	});

	// The throttle window is injected rather than taken from the default 100ms: the
	// burst has to stay inside one window for the assertion to mean anything, and a
	// wall-clock guess about how long a loop of style writes takes is exactly the
	// kind of thing that fails on a loaded machine.
	it('collapses a burst of resizes into one setSize', async () => {
		const THROTTLE = 500;
		const el = element('width: 320px; height: 160px');
		const u = plot(el, [autosize(el, THROTTLE)]);
		await laidOut(u);

		const setSize = vi.spyOn(u, 'setSize');

		for (let w = 330; w <= 400; w += 10) {
			el.style.width = `${w}px`;
			await sleep(5);
		}

		// still inside the window: at most the leading edge got through, never the
		// eight individual changes
		expect(setSize.mock.calls.length).toBeLessThanOrEqual(1);

		// ...and the last measurement is not lost, it lands on the trailing edge
		await expect.poll(() => u.width, { timeout: 4 * THROTTLE }).toBe(400);
		expect(setSize.mock.calls.length).toBeLessThanOrEqual(2);
	});

	it('ignores container resizes when autosize is off', async () => {
		const charts: uPlot[] = [];
		const { container } = render(UPlot, {
			options: options({ width: 400, height: 200 }),
			data: DATA,
			autosize: false,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		expect(charts[0].width).toBe(400);

		chartEl(container).style.width = '500px';
		await sleep(300);

		expect(charts[0].width).toBe(400);
	});

	// only `autosize` changes here — `options` keeps its identity, so nothing else
	// can be forcing the rebuild
	it('recreates the chart when autosize is switched on', async () => {
		const charts: uPlot[] = [];
		const { rerender } = render(UPlot, {
			options: options({ width: 400, height: 200 }),
			data: DATA,
			autosize: false,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		expect(charts[0].width).toBe(400);

		await rerender({ autosize: true });

		expect(charts).toHaveLength(2);
		expect(charts[1].width).toBe(320);
	});

	it('stops following the container when autosize is switched off', async () => {
		const charts: uPlot[] = [];
		const { container, rerender } = render(UPlot, {
			options: options({ width: 400, height: 200 }),
			data: DATA,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		expect(charts[0].width).toBe(320);

		await rerender({ autosize: false });

		expect(charts).toHaveLength(2);
		expect(charts[1].width).toBe(400);

		chartEl(container).style.width = '500px';
		await sleep(300);

		expect(charts[1].width).toBe(400);
	});

	it('re-reads the container size when the chart is recreated', async () => {
		const charts: uPlot[] = [];
		const { container, rerender } = render(UPlot, {
			options: options(),
			data: DATA,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		chartEl(container).style.width = '480px';
		await rerender({ options: options({ height: 999 }) });

		expect(charts).toHaveLength(2);
		expect(charts[1].width).toBe(480);
	});

	it('disconnects the ResizeObserver when the chart goes away', async () => {
		const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect');
		const charts: uPlot[] = [];
		const { container, unmount } = render(UPlot, {
			options: options(),
			data: DATA,
			style: 'width: 320px; height: 160px',
			'data-testid': 'chart',
			onCreate: (u) => charts.push(u)
		});

		const el = chartEl(container);
		disconnect.mockClear();
		await unmount();

		expect(disconnect).toHaveBeenCalled();

		// a resize after teardown must not reach the destroyed chart
		const setSize = vi.spyOn(charts[0], 'setSize');
		el.style.width = '500px';
		await sleep(300);
		expect(setSize).not.toHaveBeenCalled();

		disconnect.mockRestore();
	});
});

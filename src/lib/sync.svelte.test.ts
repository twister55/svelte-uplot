import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import UPlot from './UPlot.svelte';
import { DATA, hover, laidOut, options, syncKey } from '../test-utils.js';

function renderChart(props: Record<string, unknown>, charts: uPlot[]) {
	return render(UPlot, {
		options: options(),
		data: DATA,
		// fixed size: these tests are about the cursor, not about layout
		autosize: false,
		onCreate: (u: uPlot) => charts.push(u),
		...props
	});
}

describe('cursor sync', () => {
	it('subscribes charts sharing a key to one bus', async () => {
		const key = syncKey('bus');
		const charts: uPlot[] = [];

		renderChart({ syncKey: key }, charts);
		renderChart({ syncKey: key }, charts);

		expect(uPlot.sync(key).plots).toEqual(charts);
	});

	it('moves the cursor on every chart on the bus', async () => {
		const key = syncKey('cursor');
		const charts: uPlot[] = [];

		renderChart({ syncKey: key }, charts);
		renderChart({ syncKey: key }, charts);
		await laidOut(...charts);

		expect(charts[1].cursor.idx).toBeNull();

		hover(charts[0], 1 / 3);

		expect(charts[0].cursor.idx).toBe(1);
		expect(charts[1].cursor.idx).toBe(1);
	});

	it('keeps charts on different keys independent', async () => {
		const charts: uPlot[] = [];

		renderChart({ syncKey: syncKey('a') }, charts);
		renderChart({ syncKey: syncKey('b') }, charts);
		await laidOut(...charts);

		hover(charts[0], 1 / 3);

		expect(charts[0].cursor.idx).toBe(1);
		expect(charts[1].cursor.idx).toBeNull();
	});

	// the unsub is uPlot's own, inside destroy() — this pins that we can keep
	// relying on it instead of unsubscribing from a key of our own
	it('leaves no chart on the bus after unmount', async () => {
		const key = syncKey('teardown');
		const charts: uPlot[] = [];

		const { unmount } = renderChart({ syncKey: key }, charts);
		expect(uPlot.sync(key).plots).toHaveLength(1);

		await unmount();

		expect(uPlot.sync(key).plots).toHaveLength(0);
	});

	// both rerenders below pass syncKey alone: `options` keeps its identity, so a
	// changed key is the only thing that can be forcing the rebuild
	it('recreates the chart and switches buses when syncKey changes', async () => {
		const before = syncKey('before');
		const after = syncKey('after');
		const charts: uPlot[] = [];

		const { rerender } = renderChart({ syncKey: before }, charts);
		expect(uPlot.sync(before).plots).toHaveLength(1);

		await rerender({ syncKey: after });

		expect(charts).toHaveLength(2);
		expect(uPlot.sync(before).plots).toHaveLength(0);
		expect(uPlot.sync(after).plots).toEqual([charts[1]]);
	});

	it('drops the chart off the bus when syncKey is removed', async () => {
		const key = syncKey('removed');
		const charts: uPlot[] = [];

		const { rerender } = renderChart({ syncKey: key }, charts);
		await rerender({ syncKey: undefined });

		expect(charts).toHaveLength(2);
		expect(uPlot.sync(key).plots).toHaveLength(0);
		expect(charts[1].cursor.sync?.key).toBeNull();
	});

	it('defaults setSeries to true but lets options.cursor.sync override it', async () => {
		const charts: uPlot[] = [];

		const key = syncKey('override');

		renderChart({ syncKey: syncKey('default') }, charts);
		renderChart(
			{
				syncKey: key,
				// uPlot's Sync type makes `key` required, so it has to be repeated here
				// even though the attachment fills it in from the syncKey prop
				options: options({ cursor: { sync: { key, setSeries: false } } })
			},
			charts
		);

		expect(charts[0].cursor.sync?.setSeries).toBe(true);
		expect(charts[1].cursor.sync?.setSeries).toBe(false);
		expect(charts[1].cursor.sync?.key).toBe(key);
	});

	it('lets the syncKey prop win over a key in options.cursor.sync', async () => {
		const prop = syncKey('prop');
		const inOptions = syncKey('in-options');
		const charts: uPlot[] = [];

		const { unmount } = renderChart(
			{ syncKey: prop, options: options({ cursor: { sync: { key: inOptions } } }) },
			charts
		);

		expect(charts[0].cursor.sync?.key).toBe(prop);
		expect(uPlot.sync(prop).plots).toEqual(charts);
		// the other key must never be touched — uPlot's bus registry is global and
		// nothing ever evicts from it
		expect(uPlot.sync(inOptions).plots).toHaveLength(0);

		await unmount();

		expect(uPlot.sync(prop).plots).toHaveLength(0);
	});

	it('keeps the rest of options.cursor while filling in sync', async () => {
		const charts: uPlot[] = [];

		renderChart(
			{
				syncKey: syncKey('cursor-kept'),
				options: options({ cursor: { drag: { x: false, y: true }, lock: true } })
			},
			charts
		);

		expect(charts[0].cursor.drag).toMatchObject({ x: false, y: true });
		expect(charts[0].cursor.lock).toBe(true);
		expect(charts[0].cursor.sync?.setSeries).toBe(true);
	});

	it('does not mutate the caller’s options object', async () => {
		const charts: uPlot[] = [];
		const opts = options();

		renderChart({ syncKey: syncKey('immutable'), options: opts }, charts);

		expect(opts.cursor).toBeUndefined();
	});
});

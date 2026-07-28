import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type uPlot from 'uplot';
import UPlot from './UPlot.svelte';
import { DATA, options } from '../test-utils.js';

describe('UPlot.svelte', () => {
	it('creates a chart in the container', async () => {
		const charts: uPlot[] = [];
		const { container } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u)
		});

		expect(charts).toHaveLength(1);
		expect(container.querySelector('canvas')).not.toBeNull();
		expect(charts[0].width).toBe(400);
	});

	it('updates data via setData without recreating', async () => {
		const charts: uPlot[] = [];
		const { rerender } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u)
		});

		const next: uPlot.AlignedData = [
			[0, 60, 120, 180],
			[5, 6, 7, 8],
			[9, 10, 11, 12]
		];
		await rerender({ data: next });

		expect(charts).toHaveLength(1);
		expect(charts[0].data).toBe(next);
	});

	it('leaves the x scale fitted to the new data by default', async () => {
		const charts: uPlot[] = [];
		const { rerender } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u)
		});

		await rerender({
			data: [
				[1000, 2000],
				[1, 2],
				[3, 4]
			] as uPlot.AlignedData
		});

		expect(charts[0].scales.x.min).toBe(1000);
		expect(charts[0].scales.x.max).toBe(2000);
	});

	it('preserves the x scale across data updates with resetScales={false}', async () => {
		const charts: uPlot[] = [];
		const { rerender } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			resetScales: false,
			onCreate: (u) => charts.push(u)
		});

		await rerender({
			data: [
				[1000, 2000],
				[1, 2],
				[3, 4]
			] as uPlot.AlignedData
		});

		expect(charts[0].scales.x.min).toBe(0);
		expect(charts[0].scales.x.max).toBe(180);
	});

	it('recreates the chart when options change', async () => {
		const charts: uPlot[] = [];
		const destroyed: uPlot[] = [];
		const { rerender } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u),
			onDestroy: (u) => destroyed.push(u)
		});

		await rerender({ options: options({ width: 300 }) });

		expect(charts).toHaveLength(2);
		expect(destroyed).toEqual([charts[0]]);
		expect(charts[1].width).toBe(300);
	});

	it('hands a recreated chart to the onDestroy it was created with', async () => {
		const charts: uPlot[] = [];
		const beforeRerender: uPlot[] = [];
		const afterRerender: uPlot[] = [];
		const { rerender } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u),
			onDestroy: (u) => beforeRerender.push(u)
		});

		await rerender({
			options: options({ width: 300 }),
			onDestroy: (u: uPlot) => afterRerender.push(u)
		});

		expect(charts).toHaveLength(2);
		expect(beforeRerender).toEqual([charts[0]]);
		expect(afterRerender).toEqual([]);
	});

	it('keeps the chart when a kept options reference is mutated', async () => {
		const charts: uPlot[] = [];
		const opts = options();
		const { rerender } = render(UPlot, {
			options: opts,
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u)
		});

		opts.width = 300;
		await rerender({ options: opts });

		expect(charts).toHaveLength(1);
		expect(charts[0].width).toBe(400);
	});

	it('destroys the chart on unmount', async () => {
		const charts: uPlot[] = [];
		const destroyed: uPlot[] = [];
		const { container, unmount } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			onCreate: (u) => charts.push(u),
			onDestroy: (u) => destroyed.push(u)
		});

		await unmount();

		expect(destroyed).toEqual([charts[0]]);
		expect(container.querySelector('canvas')).toBeNull();
	});

	it('forwards unknown attributes to the container element', async () => {
		const { container } = render(UPlot, {
			options: options(),
			data: DATA,
			autosize: false,
			class: 'chart',
			'data-testid': 'plot'
		});

		const el = container.querySelector<HTMLDivElement>('[data-testid="plot"]')!;
		expect(el.classList.contains('chart')).toBe(true);
		expect(el.querySelector('.uplot')).not.toBeNull();
	});
});

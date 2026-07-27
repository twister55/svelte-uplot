// Shared fixtures for the test projects. Lives outside src/lib so that
// svelte-package never picks it up.
import type uPlot from 'uplot';

export const OPTIONS: uPlot.Options = {
	width: 400,
	height: 200,
	series: [{}, { label: 'A', stroke: 'red' }, { label: 'B', stroke: 'blue' }],
	legend: { show: false }
};

export const DATA: uPlot.AlignedData = [
	[0, 60, 120, 180],
	[10, 20, 30, 40],
	[1, 2, 3, 4]
];

/** a fresh options object (and fresh series), so callers can rely on identity */
export function options(overrides: Partial<uPlot.Options> = {}): uPlot.Options {
	return { ...OPTIONS, series: OPTIONS.series.map((s) => ({ ...s })), ...overrides };
}

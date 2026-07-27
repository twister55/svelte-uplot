// Shared fixtures for the test projects. Lives outside src/lib so that
// svelte-package never picks it up.
import type uPlot from 'uplot';

export const OPTIONS: uPlot.Options = {
	width: 400,
	height: 200,
	series: [{}, { label: 'A', stroke: 'red' }, { label: 'B', stroke: 'blue' }],
	legend: { show: false }
};

/** x values are 0/60/120/180, so `frac` 1/3 lands exactly on idx 1 */
export const DATA: uPlot.AlignedData = [
	[0, 60, 120, 180],
	[10, 20, 30, 40],
	[1, 2, 3, 4]
];

/** a fresh options object (and fresh series), so callers can rely on identity */
export function options(overrides: Partial<uPlot.Options> = {}): uPlot.Options {
	return { ...OPTIONS, series: OPTIONS.series.map((s) => ({ ...s })), ...overrides };
}

function raf() {
	return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * uPlot writes its DOM geometry on the frame after construction — until then
 * `u.over` still measures 0x0 and every cursor coordinate collapses to idx 0.
 * Await this before hovering or measuring.
 */
export async function laidOut(...charts: uPlot[]) {
	for (let i = 0; i < 30 && charts.some((u) => u.over.getBoundingClientRect().width === 0); i++) {
		await raf();
	}
}

/**
 * Dispatch a real mousemove `frac` across the plotting area. Coordinates are
 * rounded because MouseEventInit truncates clientX/clientY to integers, and
 * assertions compare against the exact values read back off the event.
 */
export function hover(u: uPlot, frac: number) {
	const rect = u.over.getBoundingClientRect();
	const clientX = Math.round(rect.left + rect.width * frac);
	const clientY = Math.round(rect.top + rect.height / 2);
	u.over.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
	return { clientX, clientY, rect };
}

/** unique per call, so sync buses (which uPlot never evicts) can't leak between tests */
let n = 0;
export function syncKey(name: string) {
	return `${name}-${n++}`;
}

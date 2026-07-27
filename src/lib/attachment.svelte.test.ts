// The component delegates everything here, so the update semantics are covered
// through <UPlot>. These tests only pin down the standalone contract: the
// attachment works on any element and cleans up after itself.
import { afterEach, describe, expect, it } from 'vitest';
import type uPlot from 'uplot';
import { uplot } from './attachment.svelte.js';
import { DATA, options } from '../test-utils.js';
import { attach } from '../test-utils.svelte.js';

let host: HTMLDivElement | undefined;

function element() {
	host = document.createElement('div');
	document.body.appendChild(host);
	return host;
}

afterEach(() => {
	host?.remove();
	host = undefined;
});

describe('uplot attachment', () => {
	it('creates a chart on a bare element', () => {
		const charts: uPlot[] = [];
		const node = element();

		const detach = attach(
			node,
			uplot(() => ({ options: options(), data: DATA, onCreate: (u) => charts.push(u) }))
		);

		expect(charts).toHaveLength(1);
		expect(node.querySelector('canvas')).not.toBeNull();

		detach();
	});

	it('destroys the chart on teardown', () => {
		const charts: uPlot[] = [];
		const destroyed: uPlot[] = [];
		const node = element();

		const detach = attach(
			node,
			uplot(() => ({
				options: options(),
				data: DATA,
				onCreate: (u) => charts.push(u),
				onDestroy: (u) => destroyed.push(u)
			}))
		);

		detach();

		expect(destroyed).toEqual([charts[0]]);
		expect(node.querySelector('canvas')).toBeNull();
	});
});

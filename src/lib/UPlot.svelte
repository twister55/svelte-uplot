<script lang="ts">
	import type uPlot from 'uplot';
	import type { HTMLAttributes } from 'svelte/elements';
	import { uplot } from './attachment.svelte.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/**
		 * uPlot options, passed through as is. Replacing the object recreates
		 * the chart; changing `data` alone is a setData() call.
		 */
		options: uPlot.Options;
		data: uPlot.AlignedData;
		/** false preserves zoom/pan across data updates (uPlot default: true) */
		resetScales?: boolean;
		onCreate?: (chart: uPlot) => void;
		onDestroy?: (chart: uPlot) => void;
	}

	let { options, data, resetScales = true, onCreate, onDestroy, ...rest }: Props = $props();
</script>

<div {...rest} {@attach uplot(() => ({ options, data, resetScales, onCreate, onDestroy }))}></div>

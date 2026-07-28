<script lang="ts">
	import type { AlignedData, Options } from 'uplot';
	import 'uplot/dist/uPlot.min.css';
	import { UPlot, uplot } from '$lib/index.js';

	const POINTS = 300;

	function makeData(): AlignedData {
		const now = Math.floor(Date.now() / 1000);
		const xs = Array.from({ length: POINTS }, (_, i) => now - (POINTS - i) * 60);
		let a = 50;
		let b = 120;
		const as = xs.map(() => (a += Math.random() * 10 - 5));
		const bs = xs.map(() => (b += Math.random() * 14 - 7));
		return [xs, as, bs];
	}

	let data = $state.raw(makeData());
	let showBands = $state(false);

	// replacing `options` recreates the chart; replacing `data` is just setData()
	const options: Options = $derived({
		width: 600,
		height: 280,
		series: [
			{},
			{ label: 'CPU', stroke: '#e6493c', width: 2, fill: showBands ? '#e6493c22' : undefined },
			{ label: 'RAM', stroke: '#3c82e6', width: 2, fill: showBands ? '#3c82e622' : undefined }
		],
		cursor: { drag: { x: true, y: false } },
		legend: { show: false }
	});
</script>

<main>
	<h1>svelte-uplot demo</h1>

	<p>
		<button onclick={() => (data = makeData())}>New data (setData)</button>
		<button onclick={() => (showBands = !showBands)}>Toggle fill (recreate)</button>
	</p>

	<h2>Two charts, shared cursor (<code>syncKey</code>)</h2>

	<!-- the height goes on the chart's own element: that is what autosize measures -->
	<UPlot class="chart" {options} {data} syncKey="demo" />

	<!-- the same thing without the component -->
	<div class="chart" {@attach uplot(() => ({ options, data, syncKey: 'demo' }))}></div>

	<p><small>Resize the window: both charts follow their container.</small></p>
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		font-family: system-ui, sans-serif;
	}

	/* :global, because a scoped class never reaches a child component's element —
	   `.chart` would compile to `.chart.svelte-xxx` and match only the <div> below */
	:global(.chart) {
		height: 280px;
		margin-bottom: 1rem;
	}
</style>

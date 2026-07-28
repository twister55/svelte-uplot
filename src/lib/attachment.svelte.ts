import uPlot from 'uplot';
import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { autosize, contentBox } from './autosize.js';

export interface UPlotConfig {
	/**
	 * uPlot options, passed through as is. uPlot cannot be reconfigured in
	 * place, so replacing this object (a new reference) destroys the chart and
	 * creates a new one. Mutations of a kept reference are not observed.
	 */
	options: uPlot.Options;
	data: uPlot.AlignedData;
	/**
	 * Forwarded to uPlot's setData() on data updates. uPlot's default (true)
	 * re-fits the x scale to the new data; pass false to preserve zoom/pan.
	 */
	resetScales?: boolean;
	/**
	 * Follow the container size with a ResizeObserver (default true). When on,
	 * options.width/height are only used as a fallback for a zero-sized container.
	 */
	autosize?: boolean;
	/** Share cursor with other charts using the same key (uPlot.sync). */
	syncKey?: string;
	onCreate?: (chart: uPlot) => void;
	onDestroy?: (chart: uPlot) => void;
}

/**
 * Attachment that binds a uPlot instance to the element:
 *
 * ```svelte
 * <div {@attach uplot(() => ({ options, data }))}></div>
 * ```
 *
 * Decides between recreating the chart and updating it in place: a change of
 * `options` (by reference), `syncKey` or `autosize` recreates, a change of
 * `data` alone is a setData() call.
 */
export function uplot(config: () => UPlotConfig): Attachment<HTMLElement> {
	return (target) => {
		let chart: uPlot | undefined;
		let usedOptions: uPlot.Options | undefined;
		let usedSyncKey: string | undefined;
		let usedAutosize: boolean | undefined;
		// captured at creation, so a recreate hands the outgoing chart to the
		// callback that owned it and not to whatever the new props carry
		let usedOnDestroy: UPlotConfig['onDestroy'];

		function destroy() {
			if (!chart) return;
			// leaving the sync bus is uPlot's own job in destroy() (since 1.6.25,
			// our peer floor) — unsubscribing here from a key of our own would only
			// risk hitting the wrong bus
			usedOnDestroy?.(chart);
			chart.destroy();
			chart = undefined;
			usedOnDestroy = undefined;
		}

		function create(cfg: UPlotConfig) {
			let opts = cfg.options;

			if (cfg.autosize ?? true) {
				// the container is measured now and followed from here on; the caller's
				// width/height stay the fallback for a container that measures 0. The
				// legend cannot be measured before the chart exists, so leaving room for
				// it is the plugin's first observation, a frame later.
				const box = contentBox(target);

				opts = {
					...opts,
					plugins: [...(opts.plugins ?? []), autosize(target)],
					width: box.width || opts.width,
					height: box.height || opts.height
				};
			}

			if (cfg.syncKey) {
				opts = {
					...opts,
					cursor: {
						...opts.cursor,
						// `key` last: the prop decides which bus this chart joins, or it
						// would silently diverge from what the rest of the config assumes.
						// Everything else in `cursor.sync` stays the caller's to override.
						sync: { setSeries: true, ...opts.cursor?.sync, key: cfg.syncKey }
					}
				};
			}

			chart = new uPlot(opts, cfg.data, target);
			usedOnDestroy = cfg.onDestroy;
			cfg.onCreate?.(chart);
		}

		$effect(() => {
			const cfg = config();

			untrack(() => {
				const fit = cfg.autosize ?? true;

				if (
					!chart ||
					cfg.options !== usedOptions ||
					cfg.syncKey !== usedSyncKey ||
					fit !== usedAutosize
				) {
					destroy();
					create(cfg);
				} else if (chart.data !== cfg.data) {
					chart.setData(cfg.data, cfg.resetScales ?? true);
				}

				usedOptions = cfg.options;
				usedSyncKey = cfg.syncKey;
				usedAutosize = fit;
			});
		});

		return destroy;
	};
}

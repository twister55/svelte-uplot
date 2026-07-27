import uPlot from 'uplot';
import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';

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
 * `options` (by reference) or `syncKey` recreates, a change of `data` alone is
 * a setData() call.
 */
export function uplot(config: () => UPlotConfig): Attachment<HTMLElement> {
	return (target) => {
		let chart: uPlot | undefined;
		let usedOptions: uPlot.Options | undefined;
		let usedSyncKey: string | undefined;
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
				if (!chart || cfg.options !== usedOptions || cfg.syncKey !== usedSyncKey) {
					destroy();
					create(cfg);
				} else if (chart.data !== cfg.data) {
					chart.setData(cfg.data, cfg.resetScales ?? true);
				}

				usedOptions = cfg.options;
				usedSyncKey = cfg.syncKey;
			});
		});

		return destroy;
	};
}

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
 * `options` (by reference) recreates, a change of `data` alone is a setData()
 * call.
 */
export function uplot(config: () => UPlotConfig): Attachment<HTMLElement> {
	return (target) => {
		let chart: uPlot | undefined;
		let usedOptions: uPlot.Options | undefined;
		// captured at creation, so a recreate hands the outgoing chart to the
		// callback that owned it and not to whatever the new props carry
		let usedOnDestroy: UPlotConfig['onDestroy'];

		function destroy() {
			if (!chart) return;
			usedOnDestroy?.(chart);
			chart.destroy();
			chart = undefined;
			usedOnDestroy = undefined;
		}

		function create(cfg: UPlotConfig) {
			chart = new uPlot(cfg.options, cfg.data, target);
			usedOnDestroy = cfg.onDestroy;
			cfg.onCreate?.(chart);
		}

		$effect(() => {
			const cfg = config();

			untrack(() => {
				if (!chart || cfg.options !== usedOptions) {
					destroy();
					create(cfg);
				} else if (chart.data !== cfg.data) {
					chart.setData(cfg.data, cfg.resetScales ?? true);
				}

				usedOptions = cfg.options;
			});
		});

		return destroy;
	};
}

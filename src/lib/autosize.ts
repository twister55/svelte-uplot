import type uPlot from 'uplot';

const DEFAULT_THROTTLE_MS = 100;
/** re-measures allowed after a setSize before giving up on convergence */
const CYCLE_LIMIT = 3;

/**
 * The element's content box — the space the chart actually gets.
 * `clientWidth`/`clientHeight` include padding, which would size the chart to
 * the padding box and overflow the element by exactly that padding.
 */
export function contentBox(element: HTMLElement) {
	const style = getComputedStyle(element);
	const horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
	const vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

	return {
		width: Math.max(0, element.clientWidth - horizontal),
		height: Math.max(0, element.clientHeight - vertical)
	};
}

/**
 * uPlot plugin that keeps the chart sized to `element` via ResizeObserver.
 * Resize events are throttled; the actual setSize runs in requestAnimationFrame.
 */
export function autosize(element: HTMLElement, throttleMs = DEFAULT_THROTTLE_MS): uPlot.Plugin {
	let observer: ResizeObserver | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let frame: number | undefined;

	return {
		hooks: {
			init(u) {
				/** the content box the last setSize was based on */
				let applied = contentBox(element);

				const apply = (converging = false) => {
					const box = contentBox(element);

					// a converge pass exists only to settle the overhead. If the element
					// itself has moved on since (a drag in progress), that update belongs to
					// the throttle, or the convergence would hand it a bypass.
					if (converging && (box.width !== applied.width || box.height !== applied.height))
						return false;

					/**
					 * What the root carries on top of the plotting area — the legend sits
					 * below it, and any border or padding of uPlot's own root counts too.
					 *
					 * Subtracting it is what makes this terminate: an element whose height
					 * comes from its content reports the *root* height back to us, so
					 * feeding that in as the plot height would add one legend per tick and
					 * climb forever. Asking for `box - overhead` instead means the element
					 * reports back exactly what we asked for. It also stops the chart from
					 * overflowing an element that does have a fixed height.
					 */
					const overhead = u.root.offsetHeight - u.height;

					// a zero measurement (display: none, not laid out yet) is no
					// information — keep the size the chart already has
					const width = box.width || u.width;
					const height = box.height ? Math.max(0, box.height - overhead) : u.height;

					applied = box;

					if (width === u.width && height === u.height) return false;

					u.setSize({ width, height });
					return true;
				};

				const measure = (cycle = 0) => {
					// a frame can still be pending if rAF is starved (a hidden page), and
					// only the newest measurement is worth anything
					if (frame !== undefined) cancelAnimationFrame(frame);

					frame = requestAnimationFrame(() => {
						frame = undefined;

						// `overhead` above belongs to the layout *before* the setSize, and the
						// new width can change it — a legend rewraps to more or fewer rows.
						// The element's own box does not move when that happens, so no further
						// observation is coming and the stale reading would stick. Re-measure
						// until the size stops moving, like uPlot's own convergeSize().
						if (apply(cycle > 0) && cycle < CYCLE_LIMIT) measure(cycle + 1);
					});
				};

				let last = 0;
				const throttled = () => {
					const wait = last + throttleMs - Date.now();
					if (wait <= 0) {
						last = Date.now();
						measure();
					} else if (timer === undefined) {
						timer = setTimeout(() => {
							timer = undefined;
							last = Date.now();
							measure();
						}, wait);
					}
				};

				observer = new ResizeObserver(throttled);
				observer.observe(element);
			},
			destroy() {
				observer?.disconnect();
				observer = undefined;
				if (timer !== undefined) {
					clearTimeout(timer);
				}
				if (frame !== undefined) {
					cancelAnimationFrame(frame);
				}
			}
		}
	};
}

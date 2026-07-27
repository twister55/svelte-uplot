// Runes-aware test helpers. A separate module from test-utils.ts because only
// `*.svelte.ts` files are compiled by the Svelte plugin, and $effect.root is a
// rune. Lives outside src/lib so that svelte-package never picks it up.
import { flushSync } from 'svelte';
import type { Attachment } from 'svelte/attachments';

/**
 * Run an attachment against an element the way `{@attach ...}` does — inside an
 * effect root, effects flushed synchronously. The returned teardown disposes
 * the root, which runs the attachment's own cleanup.
 */
export function attach(node: HTMLElement, attachment: Attachment<HTMLElement>) {
	const dispose = $effect.root(() => attachment(node));
	flushSync();

	return () => {
		dispose();
		flushSync();
	};
}

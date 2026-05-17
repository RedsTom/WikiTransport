<script lang="ts">
	import { Marked } from 'marked';

	let { content = '' }: { content: string } = $props();

	function isIcon(text: string): boolean {
		return /^[a-z][a-z0-9_]*[a-z0-9]$/.test(text);
	}

	const ICON_CLS = 'material-symbols-outlined align-middle text-base leading-none';

	function renderMarkdown(value: string) {
		const md = new Marked({
			gfm: true,
			breaks: false,
			async: false
		});

		md.use({
			renderer: {
				codespan({ text }: { text: string }) {
					if (isIcon(text)) {
						return `<span class="${ICON_CLS}">${text}</span>`;
					}
					return `<kbd class="inline-flex min-w-[1.5em] items-center justify-center rounded border border-outline/20 bg-surface-variant/30 px-1.5 py-[1px] font-mono text-[11px] font-medium text-on-surface-variant shadow-sm">${text}</kbd>`;
				}
			}
		});

		return md.parse(value) as string;
	}

	let html = $derived(renderMarkdown(content));

	let processedHtml = $derived(
		html
			.replace(
				/<guide-btn\s+icon="([a-z_]+)"\s*>([\s\S]*?)<\/guide-btn>/g,
				(_match: string, icon: string, label: string) =>
					`<span class="guide-btn"><span class="${ICON_CLS}">${icon}</span> ${label.trim()}</span>`
			)
			.replace(
				/<strong>([^<]+)<\/strong>\s*\(<span class="material-symbols-outlined[^"]*">([a-z_]+)<\/span>\)/g,
				(_match: string, label: string, icon: string) =>
					`<span class="guide-btn"><span class="${ICON_CLS}">${icon}</span> ${label}</span>`
			)
	);
</script>

<div class="guide-content prose prose-sm max-w-none">
	{@html processedHtml}
</div>

<style>
	:global(.guide-content.prose) {
		--tw-prose-body: var(--color-on-surface-variant);
		--tw-prose-headings: var(--color-on-surface);
		--tw-prose-links: var(--color-primary);
		--tw-prose-bold: var(--color-on-surface);
		--tw-prose-code: var(--color-on-surface);
		--tw-prose-quotes: var(--color-on-surface-variant);
		--tw-prose-quote-borders: var(--color-primary);
		--tw-prose-hr: var(--color-outline);
		--tw-prose-th-borders: var(--color-outline);
		--tw-prose-td-borders: var(--color-outline);
		max-width: none;
	}
</style>

<script lang="ts">
	let { raw = '' }: { raw: string } = $props();

	let text = $derived(raw.replace(/`/g, ''));

	let isIcon = $derived(/^[a-z][a-z0-9_]*[a-z0-9]$/.test(text));
</script>

{#if isIcon}
	<span class="material-symbols-outlined align-middle text-base leading-none">{text}</span>
{:else}
	<kbd
		class="inline-flex min-w-[1.5em] items-center justify-center rounded border border-outline/20 bg-surface-variant/30 px-1.5 py-[1px] font-mono text-[11px] font-medium text-on-surface-variant shadow-sm"
	>
		{text}
	</kbd>
{/if}

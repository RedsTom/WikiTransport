<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';

	let {
		onstartdraganchor = () => {}
	}: {
		onstartdraganchor: (e: MouseEvent, id: number) => void;
	} = $props();
</script>

{#each editorState.anchorPoints as ap (ap.id)}
	{@const isHiddenAnchor =
		!editorState.isGlobalView && editorState.effectiveHiddenLineIds.has(ap.lineId)}
	{#if !isHiddenAnchor}
		{@const isSelected = editorState.selectedAnchorIds.includes(ap.id!)}
		{@const isHovered = editorState.hoveredAnchorId === ap.id}
		<polygon
			points="-5,0 0,-5 5,0 0,5"
			fill={isSelected || isHovered ? 'currentColor' : 'currentColor'}
			stroke={isSelected ? 'black' : isHovered ? 'var(--color-primary)' : 'none'}
			stroke-width={isSelected ? 3 : isHovered ? 2 : 0}
			class="{isSelected || isHovered ? 'text-primary' : 'text-primary/40'} cursor-pointer"
			transform="translate({ap.schematicX}, {ap.schematicY})"
			role="button"
			tabindex="-1"
			data-anchor-id={ap.id}
			onmousedown={(e) => onstartdraganchor(e, ap.id!)}
		/>
	{/if}
{/each}

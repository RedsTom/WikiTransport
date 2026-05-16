<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import { LINE_WIDTH } from '$lib/constants/schematic';
</script>

{#each editorState.lines as line (line.id)}
	{@const isHidden = editorState.effectiveHiddenLineIds.has(line.id!)}
	{#if !isHidden}
		<!-- Rendu des lignes à refaire -->
	{/if}
{/each}

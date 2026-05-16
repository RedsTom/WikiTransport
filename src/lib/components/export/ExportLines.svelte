<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import { LINE_WIDTH } from '$lib/constants/schematic';

	let {
		data,
		isGlobal
	}: {
		data: ExportData;
		isGlobal: boolean;
	} = $props();

</script>

{#each data.lines as line (line.id)}
	{@const hiddenLineIds = new Set(data.hiddenLineIds)}
	{@const isHidden = !line.id || hiddenLineIds.has(line.id)}
	{#if !isHidden}
		<!-- Lignes à refaire -->
	{/if}
{/each}

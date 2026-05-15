<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { TransitTypeService } from '$lib/services/TransitTypeService';

	import { Button } from '$lib/components/ui';

	async function handleAddType() {
		if (editorState.project?.id) {
			const newTypeId = await TransitTypeService.createType(editorState.project.id, m.new_type());
			await editorState.loadTransitTypes();
			editorState.selectedTransitTypeId = newTypeId;
			editorState.selectedLineId = null;
			editorState.selectedStationId = null;
		}
	}

	function selectType(id: number) {
		editorState.selectedTransitTypeId = id;
		editorState.selectedLineId = null;
		editorState.selectedStationId = null;
		editorState.rightTab = 'type';
	}
</script>

<div class="mb-2 flex justify-end">
	<Button variant="filled" onclick={handleAddType}>
		<span class="material-symbols-outlined">add</span>
		{m.new_type()}
	</Button>
</div>

{#each editorState.transitTypes as type (type.id)}
	<div
		class="mb-1 flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors {editorState.selectedTransitTypeId ===
		type.id
			? 'bg-secondary-container text-on-secondary-container'
			: 'hover:bg-surface-variant'}"
		onclick={() => selectType(type.id!)}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && selectType(type.id!)}
	>
		{#if type.icon}
			<span class="material-symbols-outlined text-base text-on-surface-variant">{type.icon}</span>
		{/if}
		<span class="flex-1 truncate text-sm font-medium">{type.name}</span>
	</div>
{/each}

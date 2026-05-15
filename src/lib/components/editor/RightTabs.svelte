<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { Tooltip, IconButton } from '$lib/components/ui';

	function toggle(tab: 'general' | 'type' | 'line' | 'station') {
		if (tab === 'type' && !editorState.selectedTransitTypeId) return;
		if (tab === 'line' && !editorState.selectedLineId) return;
		if (tab === 'station' && !editorState.selectedStationId && !editorState.selectedAnchorId) return;
		editorState.rightTab = editorState.rightTab === tab ? null : tab;
	}

	let hasType = $derived(!!editorState.selectedTransitTypeId);
	let hasLine = $derived(!!editorState.selectedLineId);
	let hasStation = $derived(!!editorState.selectedStationId || !!editorState.selectedAnchorId);
</script>

<aside class="flex w-12 shrink-0 flex-col items-center gap-2 border-l border-outline/20 bg-surface pt-2">
	<Tooltip text={m.general()}>
		<IconButton
			onclick={() => toggle('general')}
			class={editorState.rightTab === 'general' ? '!bg-secondary-container !text-on-secondary-container' : ''}
		>
			<span class="material-symbols-outlined">settings</span>
		</IconButton>
	</Tooltip>
	<Tooltip text={m.type_heading()}>
		<IconButton
			disabled={!hasType}
			onclick={() => toggle('type')}
			class={editorState.rightTab === 'type' ? '!bg-secondary-container !text-on-secondary-container' : ''}
		>
			<span class="material-symbols-outlined">palette</span>
		</IconButton>
	</Tooltip>
	<Tooltip text={m.line()}>
		<IconButton
			disabled={!hasLine}
			onclick={() => toggle('line')}
			class={editorState.rightTab === 'line' ? '!bg-secondary-container !text-on-secondary-container' : ''}
		>
			<span class="material-symbols-outlined">route</span>
		</IconButton>
	</Tooltip>
	<Tooltip text={m.station()}>
		<IconButton
			disabled={!hasStation}
			onclick={() => toggle('station')}
			class={editorState.rightTab === 'station' ? '!bg-secondary-container !text-on-secondary-container' : ''}
		>
			<span class="material-symbols-outlined">location_on</span>
		</IconButton>
	</Tooltip>
</aside>

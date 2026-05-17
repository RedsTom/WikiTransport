<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { Tooltip, IconButton } from '$lib/components/ui';

	function toggle(tab: 'overview' | 'types' | 'stations' | 'tunnels' | 'guide') {
		editorState.leftTab = editorState.leftTab === tab ? null : tab;
	}
</script>

<aside
	class="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-outline/20 bg-surface pt-2"
>
	<Tooltip text={m.overview()}>
		<IconButton
			onclick={() => toggle('overview')}
			class={editorState.leftTab === 'overview'
				? '!bg-secondary-container !text-on-secondary-container'
				: ''}
		>
			<span class="material-symbols-outlined">map</span>
		</IconButton>
	</Tooltip>
	<Tooltip text={m.line_types()}>
		<IconButton
			onclick={() => toggle('types')}
			class={editorState.leftTab === 'types'
				? '!bg-secondary-container !text-on-secondary-container'
				: ''}
		>
			<span class="material-symbols-outlined">category</span>
		</IconButton>
	</Tooltip>
	<Tooltip text={m.stations()}>
		<IconButton
			onclick={() => toggle('stations')}
			class={editorState.leftTab === 'stations'
				? '!bg-secondary-container !text-on-secondary-container'
				: ''}
		>
			<span class="material-symbols-outlined">location_on</span>
		</IconButton>
	</Tooltip>
	<Tooltip text={m.tunnels()}>
		<IconButton
			onclick={() => toggle('tunnels')}
			class={editorState.leftTab === 'tunnels'
				? '!bg-secondary-container !text-on-secondary-container'
				: ''}
		>
			<span class="material-symbols-outlined">linear_scale</span>
		</IconButton>
	</Tooltip>
	<div class="mt-auto flex flex-col items-center gap-2 pb-2">
		<Tooltip text={m.guide()}>
			<IconButton
				onclick={() => toggle('guide')}
				class={editorState.leftTab === 'guide'
					? '!bg-secondary-container !text-on-secondary-container'
					: ''}
			>
				<span class="material-symbols-outlined">help</span>
			</IconButton>
		</Tooltip>
	</div>
</aside>

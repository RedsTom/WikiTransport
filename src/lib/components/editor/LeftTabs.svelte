<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { Tooltip, IconButton } from '$lib/components/ui';

	function toggle(tab: 'lines' | 'types' | 'stations') {
		editorState.leftTab = editorState.leftTab === tab ? null : tab;
	}
</script>

<aside
	class="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-outline/20 bg-surface pt-2"
>
	<Tooltip text={m.lines()}>
		<IconButton
			onclick={() => toggle('lines')}
			class={editorState.leftTab === 'lines'
				? '!bg-secondary-container !text-on-secondary-container'
				: ''}
		>
			<span class="material-symbols-outlined">account_tree</span>
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
</aside>

<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import OverviewTab from './OverviewTab.svelte';
	import TypesTab from './TypesTab.svelte';
	import StationsTab from './StationsTab.svelte';
	import TunnelsTab from './TunnelsTab.svelte';
</script>

<aside class="flex w-80 shrink-0 flex-col overflow-hidden border-r border-outline/20 bg-surface">
	<div class="flex h-14 shrink-0 items-center justify-between border-b border-outline/20 px-3">
		<h2 class="text-sm font-bold">
			{#if editorState.leftTab === 'overview'}
				{m.overview()}
			{:else if editorState.leftTab === 'types'}
				{m.line_types()}
			{:else if editorState.leftTab === 'stations'}
				{m.stations()}
			{:else if editorState.leftTab === 'tunnels'}
				{m.tunnels()}
			{/if}
		</h2>
		<button class="m3-icon-button" onclick={() => (editorState.leftTab = null)}>
			<span class="material-symbols-outlined">chevron_left</span>
		</button>
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#if editorState.leftTab === 'overview'}
			<OverviewTab />
		{:else if editorState.leftTab === 'types'}
			<TypesTab />
		{:else if editorState.leftTab === 'stations'}
			<StationsTab />
		{:else if editorState.leftTab === 'tunnels'}
			<TunnelsTab />
		{/if}
	</div>
</aside>

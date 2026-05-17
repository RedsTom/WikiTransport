<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import OverviewTab from './OverviewTab.svelte';
	import TypesTab from './TypesTab.svelte';
	import StationsTab from './StationsTab.svelte';
	import TunnelsTab from './TunnelsTab.svelte';
	import GuidePanel from './GuidePanel.svelte';

	let { width = $bindable(320) }: { width: number } = $props();
</script>

<aside
	class="flex shrink-0 flex-col overflow-hidden border-r border-outline/20 bg-surface"
	style="width: {width}px"
>
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
			{:else if editorState.leftTab === 'guide'}
				{m.guide()}
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
		{:else if editorState.leftTab === 'guide'}
			<GuidePanel />
		{/if}
	</div>
</aside>

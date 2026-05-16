<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { EditorService } from '$lib/services/EditorService';
	import { ViewService } from '$lib/services/ViewService';
	import { Dialog, Button, TextField, ContextMenu } from '$lib/components/ui';
	import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
	import { useContextMenu } from '$lib/utils/useContextMenu.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let {
		projectId,
		onSwitchView = () => {}
	}: {
		projectId: number;
		onSwitchView: (viewId: number | null) => void;
	} = $props();

	let viewDialogOpen = $state(false);
	let newViewName = $state('');

	let viewContextMenu = useContextMenu();
	let viewContextMenuViewId = $state<number>(0);
	let viewDeleteId = $state<number | null>(null);
	let viewDeleteOpen = $state(false);
	let viewRenameId = $state<number | null>(null);
	let viewRenameName = $state('');
	let viewRenameOpen = $state(false);

	async function handleCreateView() {
		if (!newViewName.trim()) return;
		const viewId = await EditorService.createView(editorState, newViewName.trim());
		newViewName = '';
		viewDialogOpen = false;
		goto(resolve(`/project/${projectId}/${viewId}`), { replaceState: true });
	}

	async function handleRenameView() {
		if (viewRenameId === null || !viewRenameName.trim()) return;
		await ViewService.update(viewRenameId, { name: viewRenameName.trim() });
		await editorState.loadViews();
		viewRenameId = null;
	}

	async function handleDeleteView() {
		if (viewDeleteId === null) return;
		const wasActive = viewDeleteId === editorState.activeViewId;
		await EditorService.deleteView(editorState, viewDeleteId);
		viewDeleteId = null;
		viewDeleteOpen = false;
		if (wasActive) {
			goto(resolve(`/project/${projectId}/global`), { replaceState: true });
		}
	}
</script>

<div class="ml-6 flex items-center gap-0.5">
	<button
		class="rounded-md px-3 py-1 text-xs font-bold transition-colors {editorState.activeViewId ===
		null
			? 'bg-primary/20 text-primary'
			: 'text-on-surface-variant hover:text-on-surface'}"
		onclick={() => onSwitchView(null)}
	>
		{m.global_view()}
	</button>
	{#each editorState.views as view (view.id)}
		<button
			class="rounded-md px-3 py-1 text-xs font-bold transition-colors {editorState.activeViewId ===
			view.id
				? 'bg-primary/20 text-primary'
				: 'text-on-surface-variant hover:text-on-surface'}"
			onclick={() => onSwitchView(view.id!)}
			oncontextmenu={(e) => {
				viewContextMenuViewId = view.id!;
				viewContextMenu.show(e, [
					{
						label: m.rename_view(),
						icon: 'edit',
						action: () => {
							viewRenameName = view.name;
							viewRenameId = viewContextMenuViewId;
							viewRenameOpen = true;
						}
					},
					{
						label: m.delete_view_confirm(),
						icon: 'delete',
						action: () => {
							viewDeleteId = viewContextMenuViewId;
							viewDeleteOpen = true;
						}
					}
				] as ContextMenuItem[]);
			}}
		>
			{view.name}
		</button>
	{/each}
	<button
		class="ml-1 rounded-md px-2 py-1 text-xs font-bold text-on-surface-variant transition-colors hover:text-on-surface"
		onclick={() => {
			newViewName = '';
			viewDialogOpen = true;
		}}
	>
		+ {m.new_view()}
	</button>
</div>

{#if viewContextMenu.open}
	<ContextMenu
		open={viewContextMenu.open}
		x={viewContextMenu.x}
		y={viewContextMenu.y}
		items={viewContextMenu.items}
		onclose={() => viewContextMenu.close()}
	/>
{/if}

<Dialog bind:open={viewRenameOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">edit</span>
	{/snippet}
	{#snippet title()}{m.rename_view_title({
			name: editorState.views.find((v) => v.id === viewRenameId)?.name ?? ''
		})}{/snippet}
	<TextField
		label={m.view_name()}
		bind:value={viewRenameName}
		onkeydown={(e: KeyboardEvent) => {
			if (e.key === 'Enter') handleRenameView();
		}}
	/>
	{#snippet actions()}
		<Button
			variant="text"
			onclick={() => {
				viewRenameOpen = false;
				viewRenameId = null;
			}}>{m.cancel()}</Button
		>
		<Button variant="filled" autofocus onclick={handleRenameView}>{m.rename()}</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={viewDeleteOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">delete</span>
	{/snippet}
	{#snippet title()}{m.delete()}{/snippet}
	<p>{m.delete_view_confirm()}</p>
	{#snippet actions()}
		<Button
			variant="text"
			onclick={() => {
				viewDeleteOpen = false;
				viewDeleteId = null;
			}}>{m.cancel()}</Button
		>
		<Button variant="filled" autofocus onclick={handleDeleteView}>{m.delete()}</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={viewDialogOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">add</span>
	{/snippet}
	{#snippet title()}{m.new_view()}{/snippet}
	<TextField
		label={m.view_name()}
		bind:value={newViewName}
		onkeydown={(e: KeyboardEvent) => {
			if (e.key === 'Enter') handleCreateView();
		}}
	/>
	{#snippet actions()}
		<Button variant="text" onclick={() => (viewDialogOpen = false)}>{m.cancel()}</Button>
		<Button variant="filled" autofocus onclick={handleCreateView}>{m.create()}</Button>
	{/snippet}
</Dialog>

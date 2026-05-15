<script lang="ts">
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { editorState } from '$lib/store/editor.svelte';
	import { goto } from '$app/navigation';
	import { StationService } from '$lib/services/StationService';
	import { LineService } from '$lib/services/LineService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { ViewService } from '$lib/services/ViewService';
	import { EditorService } from '$lib/services/EditorService';
	import LeftPanel from '$lib/components/editor/LeftPanel.svelte';
	import RightPanel from '$lib/components/editor/RightPanel.svelte';
	import LeftTabs from '$lib/components/editor/LeftTabs.svelte';
	import RightTabs from '$lib/components/editor/RightTabs.svelte';
	import ToolBar from '$lib/components/editor/ToolBar.svelte';
	import PlanView from '$lib/components/schematic/PlanView.svelte';

	import {
		CircularProgress,
		Dialog,
		Button,
		IconButton,
		TextField,
		ContextMenu
	} from '$lib/components/ui';

	let projectId = $derived(Number(page.params.id));
	let viewParam = $derived(page.params.view ?? 'global');
	let isGlobal = $derived(viewParam === 'global');
	let isLoading = $state(true);
	let viewDialogOpen = $state(false);
	let newViewName = $state('');

	let viewContextMenu = $state<{ x: number; y: number; viewId: number } | null>(null);
	let viewDeleteId = $state<number | null>(null);
	let viewDeleteOpen = $state(false);
	let viewRenameId = $state<number | null>(null);
	let viewRenameName = $state('');
	let viewRenameOpen = $state(false);

	function handleTogglePlacement() {
		if (editorState.placementMode === 'station') {
			editorState.placementMode = null;
		} else {
			editorState.placementMode = 'station';
		}
	}

	function handleToggleAnchor() {
		if (editorState.placementMode === 'anchor') {
			editorState.placementMode = null;
		} else {
			editorState.placementMode = 'anchor';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.matches('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'Escape') {
			if (editorState.placementMode) {
				editorState.placementMode = null;
				editorState.pendingLineInsert = null;
			} else if (editorState.selectedAnchorId) {
				editorState.selectedAnchorId = null;
			} else if (editorState.selectedStationId) {
				editorState.selectedStationId = null;
			} else if (editorState.selectedLineId) {
				editorState.selectedLineId = null;
			}
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (editorState.selectedStationId) {
				e.preventDefault();
				editorState.stationToDelete = editorState.selectedStationId;
				editorState.deleteStationOpen = true;
			} else if (editorState.selectedAnchorId) {
				e.preventDefault();
				editorState.anchorToDelete = editorState.selectedAnchorId;
				editorState.deleteAnchorOpen = true;
			}
		}
		if (e.key === 'a' || e.key === 'A') {
			e.preventDefault();
			handleToggleAnchor();
		}
		if (e.key === 'd' || e.key === 'D') {
			e.preventDefault();
			editorState.selectedLineId = null;
			editorState.selectedStationId = null;
			editorState.selectedAnchorId = null;
			editorState.selectedTransitTypeId = null;
		}
		if (e.key === 'Tab') {
			const rps = editorState.routePoints
				.filter((rp) => rp.lineId === editorState.selectedLineId)
				.sort((a, b) => a.order - b.order);
			if (rps.length > 0) {
				e.preventDefault();
				let nextIndex = 0;
				if (editorState.selectedStationId !== null) {
					const cur = rps.findIndex((rp) => rp.stationId === editorState.selectedStationId);
					if (cur !== -1) {
						nextIndex = e.shiftKey ? (cur - 1 + rps.length) % rps.length : (cur + 1) % rps.length;
					}
				}
				editorState.selectedStationId = rps[nextIndex].stationId;
				editorState.rightTab = 'station';
			}
		}
	}

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

	async function switchView(viewId: number | null) {
		editorState.isSwitchingView = true;
		const oldKey = editorState.activeViewId === null ? 'global' : String(editorState.activeViewId);
		editorState.viewBoxRecords[oldKey] = { ...editorState.currentViewBox };
		await EditorService.switchToView(editorState, viewId);
		const path = viewId === null ? 'global' : String(viewId);
		goto(resolve(`/project/${projectId}/${path}`), { replaceState: true });
		editorState.isSwitchingView = false;
	}

	onMount(async () => {
		const project = await ProjectService.getProject(projectId);
		if (!project) {
			goto(resolve('/projects'));
			return;
		}
		editorState.project = project;
		await EditorService.reloadAll(editorState);

		if (!isGlobal) {
			const viewId = Number(viewParam);
			if (!isNaN(viewId)) {
				const view = editorState.views.find((v) => v.id === viewId);
				if (view) {
					await EditorService.switchToView(editorState, viewId);
				}
			}
		}

		isLoading = false;
	});
</script>

<svelte:head>
	<title>{m.app_title()} - {editorState.project?.name ?? ''}</title>
</svelte:head>

{#if isLoading}
	<div class="flex h-screen w-full items-center justify-center">
		<CircularProgress indeterminate />
	</div>
{:else}
	<div class="flex h-screen w-full flex-col overflow-hidden">
		<!-- Top Bar -->
		<header
			class="flex h-14 shrink-0 items-center justify-between border-b border-outline/20 bg-surface-variant px-4"
		>
			<div class="flex items-center gap-4">
				<IconButton onclick={() => goto(resolve('/projects'))}>
					<span class="material-symbols-outlined">arrow_back</span>
				</IconButton>
				<h1 class="text-base font-medium">{editorState.project?.name}</h1>

				<!-- View Tabs -->
				<div class="ml-6 flex items-center gap-0.5">
					<button
						class="rounded-md px-3 py-1 text-xs font-bold transition-colors {editorState.activeViewId ===
						null
							? 'bg-primary/20 text-primary'
							: 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => switchView(null)}
					>
						{m.global_view()}
					</button>
					{#each editorState.views as view (view.id)}
						<button
							class="rounded-md px-3 py-1 text-xs font-bold transition-colors {editorState.activeViewId ===
							view.id
								? 'bg-primary/20 text-primary'
								: 'text-on-surface-variant hover:text-on-surface'}"
							onclick={() => switchView(view.id!)}
							oncontextmenu={(e) => {
								e.preventDefault();
								viewContextMenu = { x: e.clientX, y: e.clientY, viewId: view.id! };
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
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="tonal"
					onclick={() =>
						goto(
							resolve(
								`/project/${projectId}/${editorState.activeViewId === null ? 'global' : editorState.activeViewId}/export`
							)
						)}
				>
					<span class="material-symbols-outlined">download</span>
					{m.export()}
				</Button>
				{#each locales as locale (locale)}
					<a
						href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
						data-sveltekit-reload
						class="text-sm font-bold uppercase transition-colors hover:text-primary {page.url.pathname.includes(
							`/${locale}`
						) ||
						(locale === 'en' && !page.url.pathname.includes('/fr'))
							? 'text-primary'
							: 'text-on-surface-variant opacity-70'}"
					>
						{locale}
					</a>
				{/each}
			</div>
		</header>

		<!-- Main Workspace -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex flex-1 overflow-hidden" tabindex="-1" onkeydown={handleKeydown}>
			<LeftTabs />
			{#if editorState.leftTab !== null}
				<LeftPanel />
			{/if}

			<main
				class="relative flex flex-1 items-center justify-center overflow-hidden bg-surface-variant text-on-surface-variant"
			>
				<PlanView />

				{#if editorState.placementMode === 'station'}
					<div
						class="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-black/10 pt-8"
					>
						<div
							class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-lg"
						>
							<span class="material-symbols-outlined align-middle text-sm">add_location</span>
							{m.click_to_place_station()}
							<kbd class="rounded bg-white/20 px-1.5 py-0.5 text-xs">Esc</kbd>
							{m.esc_to_cancel()}
						</div>
					</div>
				{:else if editorState.placementMode === 'anchor'}
					<div
						class="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-black/10 pt-8"
					>
						<div
							class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-lg"
						>
							<span class="material-symbols-outlined align-middle text-sm">anchor</span>
							{m.click_on_line_to_place_anchor()}
							<kbd class="rounded bg-white/20 px-1.5 py-0.5 text-xs">Esc</kbd>
							{m.esc_to_cancel()}
						</div>
					</div>
				{/if}

				<ToolBar onaddstation={handleTogglePlacement} onaddanchor={handleToggleAnchor} />
			</main>

			{#if editorState.rightTab !== null}
				<RightPanel />
			{/if}
			<RightTabs />
		</div>
	</div>

	<!-- Delete station confirmation -->
	<Dialog bind:open={editorState.deleteStationOpen}>
		{#snippet icon()}
			<span class="material-symbols-outlined">delete</span>
		{/snippet}
		{#snippet title()}{m.delete_station()}{/snippet}
		<p>{m.delete_station_confirm()}</p>
		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					editorState.deleteStationOpen = false;
					editorState.stationToDelete = null;
				}}>{m.cancel()}</Button
			>
			<Button
				variant="filled"
				autofocus
				onclick={async () => {
					if (editorState.stationToDelete !== null) {
						await StationService.deleteStation(editorState.stationToDelete);
						await EditorService.reloadAll(editorState);
						editorState.stationToDelete = null;
						editorState.deleteStationOpen = false;
					}
				}}>{m.delete()}</Button
			>
		{/snippet}
	</Dialog>

	<!-- Delete line confirmation -->
	<Dialog bind:open={editorState.deleteLineOpen}>
		{#snippet icon()}
			<span class="material-symbols-outlined">delete</span>
		{/snippet}
		{#snippet title()}{m.delete_line()}{/snippet}
		<p>{m.delete_line_confirm()}</p>
		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					editorState.deleteLineOpen = false;
					editorState.lineToDelete = null;
				}}>{m.cancel()}</Button
			>
			<Button
				variant="filled"
				autofocus
				onclick={async () => {
					if (editorState.lineToDelete !== null) {
						await LineService.deleteLine(editorState.lineToDelete);
						await EditorService.reloadAll(editorState);
						editorState.lineToDelete = null;
						editorState.deleteLineOpen = false;
					}
				}}>{m.delete()}</Button
			>
		{/snippet}
	</Dialog>

	<!-- Delete anchor confirmation -->
	<Dialog bind:open={editorState.deleteAnchorOpen}>
		{#snippet icon()}
			<span class="material-symbols-outlined">delete</span>
		{/snippet}
		{#snippet title()}{m.delete_anchor()}{/snippet}
		<p>{m.delete_anchor_confirm()}</p>
		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					editorState.deleteAnchorOpen = false;
					editorState.anchorToDelete = null;
				}}>{m.cancel()}</Button
			>
			<Button
				variant="filled"
				autofocus
				onclick={async () => {
					if (editorState.anchorToDelete !== null) {
						await AnchorPointService.delete(editorState.anchorToDelete);
						await EditorService.reloadAll(editorState);
						editorState.anchorToDelete = null;
						editorState.deleteAnchorOpen = false;
					}
				}}>{m.delete()}</Button
			>
		{/snippet}
	</Dialog>

	<!-- View context menu -->
	{#if viewContextMenu}
		<ContextMenu
			x={viewContextMenu.x}
			y={viewContextMenu.y}
			items={[
				{
					label: m.rename_view(),
					icon: 'edit',
					action: () => {
						const v = editorState.views.find((v) => v.id === viewContextMenu!.viewId);
						if (v) {
							viewRenameName = v.name;
							viewRenameId = v.id!;
							viewRenameOpen = true;
						}
					}
				},
				{
					label: m.delete_view_confirm(),
					icon: 'delete',
					action: () => {
						viewDeleteId = viewContextMenu!.viewId;
						viewDeleteOpen = true;
					}
				}
			]}
			onclose={() => (viewContextMenu = null)}
		/>
	{/if}

	<!-- Rename view dialog -->
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

	<!-- Delete view confirmation -->
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

	<!-- New View dialog -->
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
{/if}

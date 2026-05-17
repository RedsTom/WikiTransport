<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { locales } from '$lib/paraglide/runtime';
	import { setLocale, useLocale } from '$lib/locale.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { editorState } from '$lib/store/editor.svelte';
	import { goto } from '$app/navigation';
	import { StationService } from '$lib/services/StationService';
	import { LineService } from '$lib/services/LineService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { EditorService } from '$lib/services/EditorService';
	import LeftPanel from '$lib/components/editor/LeftPanel.svelte';
	import RightPanel from '$lib/components/editor/RightPanel.svelte';
	import LeftTabs from '$lib/components/editor/LeftTabs.svelte';
	import RightTabs from '$lib/components/editor/RightTabs.svelte';
	import ToolBar from '$lib/components/editor/ToolBar.svelte';
	import PlanView from '$lib/components/schematic/PlanView.svelte';
	import ViewManager from '$lib/components/editor/ViewManager.svelte';

	import { CircularProgress, Dialog, Button, IconButton } from '$lib/components/ui';

	let projectId = $derived(Number(page.params.id));
	let viewParam = $derived(page.params.view ?? 'global');
	let isGlobal = $derived(viewParam === 'global');
	let isLoading = $state(true);

	let leftPanelWidth = $state(320);
	let rightPanelWidth = $state(320);
	let resizing = $state<'left' | 'right' | null>(null);

	function startResize(side: 'left' | 'right') {
		return (e: MouseEvent) => {
			e.preventDefault();
			resizing = side;
		};
	}

	function handleResizeMouseMove(e: MouseEvent) {
		if (!resizing) return;
		if (resizing === 'left') {
			const newWidth = Math.max(200, Math.min(600, e.clientX - 44));
			leftPanelWidth = newWidth;
		} else {
			const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX - 44));
			rightPanelWidth = newWidth;
		}
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function handleResizeMouseUp() {
		if (!resizing) return;
		resizing = null;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}

	$effect(() => {
		if (resizing) {
			window.addEventListener('mousemove', handleResizeMouseMove);
			window.addEventListener('mouseup', handleResizeMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleResizeMouseMove);
				window.removeEventListener('mouseup', handleResizeMouseUp);
			};
		}
	});

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

	async function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.matches('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'Escape') {
			if (editorState.placementMode) {
				editorState.placementMode = null;
				editorState.pendingLineInsert = null;
			} else if (editorState.isMultiSelecting || editorState.selectedAnchorId) {
				editorState.clearSelection();
			} else if (editorState.selectedStationId) {
				editorState.clearSelection();
			} else if (editorState.selectedLineId) {
				editorState.selectedLineId = null;
			}
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (editorState.isMultiSelecting) {
				e.preventDefault();
				const stationIds = [...editorState.selectedStationIds];
				const anchorIds = [...editorState.selectedAnchorIds];
				editorState.clearSelection();
				for (const sid of stationIds) {
					await StationService.deleteStation(sid);
				}
				for (const aid of anchorIds) {
					await AnchorPointService.delete(aid);
				}
				await EditorService.reloadAll(editorState);
			} else if (editorState.selectedStationId) {
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
			editorState.clearSelection();
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
				editorState.setSelection(rps[nextIndex].stationId);
				editorState.rightTab = 'station';
			}
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
		<header
			class="flex h-14 shrink-0 items-center justify-between border-b border-outline/20 bg-surface px-4"
		>
			<div class="flex items-center gap-4">
				<IconButton onclick={() => goto(resolve('/projects'))}>
					<span class="material-symbols-outlined">arrow_back</span>
				</IconButton>
				<h1 class="text-base font-medium">{editorState.project?.name}</h1>
				<ViewManager {projectId} onSwitchView={switchView} />
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
				{#each locales as l (l)}
					<button
						onclick={() => setLocale(l)}
						class="text-sm font-bold uppercase transition-colors hover:text-primary {useLocale() ===
						l
							? 'text-primary'
							: 'text-on-surface-variant opacity-70'}"
					>
						{l}
					</button>
				{/each}
			</div>
		</header>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex flex-1 overflow-hidden" tabindex="-1" onkeydown={handleKeydown}>
			<LeftTabs />
			{#if editorState.leftTab !== null}
				<LeftPanel bind:width={leftPanelWidth} />
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-primary active:bg-primary"
					onmousedown={startResize('left')}
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize left panel"
					tabindex="-1"
				></div>
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
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-primary active:bg-primary"
					onmousedown={startResize('right')}
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize right panel"
					tabindex="-1"
				></div>
				<RightPanel bind:width={rightPanelWidth} />
			{/if}
			<RightTabs />
		</div>
	</div>

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
{/if}

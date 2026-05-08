<script lang="ts">
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { onMount } from 'svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { editorState } from '$lib/store/editor.svelte';
	import { goto } from '$app/navigation';
	import { StationService } from '$lib/services/StationService';
	import { LineService } from '$lib/services/LineService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import LeftPanel from '$lib/components/editor/LeftPanel.svelte';
	import RightPanel from '$lib/components/editor/RightPanel.svelte';
	import ToolBar from '$lib/components/editor/ToolBar.svelte';
	import PlanView from '$lib/components/schematic/PlanView.svelte';

	import { CircularProgress, IconButton, Dialog, Button, TextField } from '$lib/components/ui';

	let projectId = $derived(Number(page.params.id));
	let isLoading = $state(true);
	let viewDialogOpen = $state(false);
	let newViewName = $state('');

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
			editorState.anchorLineClicked = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement).tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		if (e.key === 'Escape') {
			if (editorState.placementMode) {
				editorState.placementMode = null;
				editorState.anchorLineClicked = false;
			} else if (editorState.selectedStationId) {
				editorState.selectedStationId = null;
			} else if (editorState.selectedAnchorId) {
				editorState.selectedAnchorId = null;
			} else if (editorState.selectedLineId) {
				editorState.selectedLineId = null;
			} else {
				editorState.selectedTransitTypeId = null;
			}
		}
		if (e.key === 's' || e.key === 'S') {
			e.preventDefault();
			handleTogglePlacement();
		}
		if (e.key === 'a' || e.key === 'A') {
			e.preventDefault();
			handleToggleAnchor();
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
			} else if (editorState.selectedLineId) {
				e.preventDefault();
				editorState.lineToDelete = editorState.selectedLineId;
				editorState.deleteLineOpen = true;
			}
		}
		if (e.key === 'd' || e.key === 'D') {
			e.preventDefault();
			editorState.selectedLineId = null;
			editorState.selectedStationId = null;
			editorState.selectedAnchorId = null;
			editorState.selectedTransitTypeId = null;
		}
	}

	async function handleCreateView() {
		if (!newViewName.trim()) return;
		await editorState.createView(newViewName.trim());
		newViewName = '';
		viewDialogOpen = false;
	}

	onMount(async () => {
		const project = await ProjectService.getProject(projectId);
		if (!project) {
			goto('/');
			return;
		}
		editorState.project = project;
		await editorState.reloadAll();
		isLoading = false;
	});
</script>

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
				<IconButton onclick={() => goto('/')}>
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
						onclick={() => editorState.switchToView(null)}
					>
						Global
					</button>
					{#each editorState.views as view (view.id)}
						<button
							class="group flex items-center gap-1 rounded-md px-3 py-1 text-xs font-bold transition-colors {editorState.activeViewId ===
							view.id
								? 'bg-primary/20 text-primary'
								: 'text-on-surface-variant hover:text-on-surface'}"
							onclick={() => editorState.switchToView(view.id!)}
						>
							{view.name}
							{#if editorState.views.length > 1}
								<span
									role="button"
									tabindex="0"
									class="material-symbols-outlined ml-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-60"
									onclick={(e) => {
										e.stopPropagation();
										editorState.deleteView(view.id!);
									}}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.stopPropagation();
											editorState.deleteView(view.id!);
										}
									}}
								>
									close
								</span>
							{/if}
						</button>
					{/each}
					<button
						class="ml-1 rounded-md px-2 py-1 text-xs font-bold text-on-surface-variant transition-colors hover:text-on-surface"
						onclick={() => {
							newViewName = '';
							viewDialogOpen = true;
						}}
					>
						+ New View
					</button>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#each locales as locale (locale)}
					<a
						href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
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
			<LeftPanel />

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
							Click on the plan to place a station —
							<kbd class="rounded bg-white/20 px-1.5 py-0.5 text-xs">Esc</kbd> to cancel
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
							{#if editorState.anchorLineClicked}
								Click on the map to place the anchor point —
							{:else}
								Click on a line to select it, then click to place the anchor —
							{/if}
							<kbd class="rounded bg-white/20 px-1.5 py-0.5 text-xs">Esc</kbd> to cancel
						</div>
					</div>
				{/if}

				<ToolBar
					onaddstation={handleTogglePlacement}
					onaddanchor={handleToggleAnchor}
				/>
			</main>

			<RightPanel />
		</div>
	</div>

	<!-- Delete station confirmation -->
	<Dialog bind:open={editorState.deleteStationOpen}>
		{#snippet title()}Delete station{/snippet}
		<p>Delete this station?</p>
		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					editorState.deleteStationOpen = false;
					editorState.stationToDelete = null;
				}}>Cancel</Button
			>
			<Button
				variant="filled"
				onclick={async () => {
					if (editorState.stationToDelete !== null) {
						await StationService.deleteStation(editorState.stationToDelete);
						await editorState.reloadAll();
						editorState.stationToDelete = null;
						editorState.deleteStationOpen = false;
					}
				}}>Delete</Button
			>
		{/snippet}
	</Dialog>

	<!-- Delete line confirmation -->
	<Dialog bind:open={editorState.deleteLineOpen}>
		{#snippet title()}Delete line{/snippet}
		<p>Delete this line?</p>
		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					editorState.deleteLineOpen = false;
					editorState.lineToDelete = null;
				}}>Cancel</Button
			>
			<Button
				variant="filled"
				onclick={async () => {
					if (editorState.lineToDelete !== null) {
						await LineService.deleteLine(editorState.lineToDelete);
						await editorState.reloadAll();
						editorState.lineToDelete = null;
						editorState.deleteLineOpen = false;
					}
				}}>Delete</Button
			>
		{/snippet}
	</Dialog>

	<!-- Delete anchor confirmation -->
	<Dialog bind:open={editorState.deleteAnchorOpen}>
		{#snippet title()}Delete anchor{/snippet}
		<p>Delete this anchor point?</p>
		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					editorState.deleteAnchorOpen = false;
					editorState.anchorToDelete = null;
				}}>Cancel</Button
			>
			<Button
				variant="filled"
				onclick={async () => {
					if (editorState.anchorToDelete !== null) {
						await AnchorPointService.delete(editorState.anchorToDelete);
						await editorState.reloadAll();
						editorState.anchorToDelete = null;
						editorState.deleteAnchorOpen = false;
					}
				}}>Delete</Button
			>
		{/snippet}
	</Dialog>

	<!-- New View dialog -->
	<Dialog bind:open={viewDialogOpen}>
		{#snippet title()}New View{/snippet}
		<TextField
			label="View name"
			bind:value={newViewName}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter') handleCreateView();
			}}
		/>
		{#snippet actions()}
			<Button variant="text" onclick={() => (viewDialogOpen = false)}>Cancel</Button>
			<Button variant="filled" onclick={handleCreateView}>Create</Button>
		{/snippet}
	</Dialog>
{/if}

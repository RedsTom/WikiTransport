<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { StationService } from '$lib/services/StationService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { ViewStationService } from '$lib/services/ViewStationService';

	import { Button, TextField, Slider, Dialog } from '$lib/components/ui';

	const DIR_ARROWS: Record<string, string> = {
		N: 'arrow_upward',
		NE: 'north_east',
		E: 'arrow_forward',
		SE: 'south_east',
		S: 'arrow_downward',
		SW: 'south_west',
		W: 'arrow_back',
		NW: 'north_west'
	};

	const ANCHOR_ICONS: Record<string, string> = {
		N: 'vertical_align_top',
		NE: 'north_east',
		E: 'chevron_right',
		SE: 'south_east',
		S: 'vertical_align_bottom',
		SW: 'south_west',
		W: 'chevron_left',
		NW: 'north_west'
	};

	let stationName = $state('');
	let stationSubtitle = $state('');
	let labelDir = $state('E');
	let labelAnchor = $state('E');
	let subtitleAlign = $state('');
	let anchorDx = $state(14);
	let anchorDy = $state(14);
	let ratioLocked = $state(false);
	let lockedRatio = $state(1);
	let updatingFromLock = $state(false);

	let selectedStation = $derived(
		editorState.stations.find((s) => s.id === editorState.selectedStationId)
	);
	let selectedAnchor = $derived(
		editorState.anchorPoints.find((a) => a.id === editorState.selectedAnchorId)
	);
	let deleteConfirmOpen = $state(false);

	$effect(() => {
		if (selectedStation) {
			stationName = selectedStation.name;
			stationSubtitle = selectedStation.subtitle ?? '';
			labelDir = editorState.stationLabelDirection(selectedStation);
			labelAnchor = editorState.stationLabelAnchor(selectedStation);
			subtitleAlign = editorState.stationSubtitleAlign(selectedStation) ?? '';
			anchorDx = editorState.stationAnchorDx(selectedStation);
			anchorDy = editorState.stationAnchorDy(selectedStation);
		}
	});

	async function updateStation(name: string) {
		if (selectedStation?.id) {
			await StationService.updateStation(selectedStation.id, { name });
			await editorState.loadStations();
		}
	}

	async function updateSubtitle(subtitle: string) {
		if (selectedStation?.id) {
			await StationService.updateStation(selectedStation.id, { subtitle: subtitle || undefined });
			await editorState.loadStations();
		}
	}

	async function setLabelDirection(dir: string) {
		if (selectedStation?.id) {
			labelDir = dir;
			if (editorState.isGlobalView) {
				await StationService.updateStation(selectedStation.id, { labelDirection: dir });
				await editorState.loadStations();
			} else if (editorState.activeViewId !== null) {
				await ViewStationService.setLabelDirection(
					editorState.activeViewId,
					selectedStation.id,
					dir
				);
				const existing = editorState.viewStations.find(
					(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
				);
				if (existing) {
					existing.labelDirection = dir;
				}
			}
		}
	}

	async function setSubtitleAlign(align: string) {
		if (selectedStation?.id) {
			const value = align || undefined;
			subtitleAlign = align;
			if (editorState.isGlobalView) {
				await StationService.updateStation(selectedStation.id, { subtitleAlign: value });
				await editorState.loadStations();
			} else if (editorState.activeViewId !== null) {
				await ViewStationService.setSubtitleAlign(
					editorState.activeViewId,
					selectedStation.id,
					align
				);
				const existing = editorState.viewStations.find(
					(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
				);
				if (existing) {
					existing.subtitleAlign = align;
				}
			}
		}
	}

	async function setLabelAnchor(anchor: string) {
		if (selectedStation?.id) {
			labelAnchor = anchor;
			if (editorState.isGlobalView) {
				await StationService.updateStation(selectedStation.id, { labelAnchor: anchor });
				await editorState.loadStations();
			} else if (editorState.activeViewId !== null) {
				await ViewStationService.setLabelAnchor(
					editorState.activeViewId,
					selectedStation.id,
					anchor
				);
				const existing = editorState.viewStations.find(
					(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
				);
				if (existing) {
					existing.labelAnchor = anchor;
				}
			}
		}
	}

	function handleWheel(e: WheelEvent, axis: 'x' | 'y') {
		e.preventDefault();
		const step = 1;
		const delta = e.deltaY > 0 ? -step : step;
		if (axis === 'x') {
			const next = Math.max(2, Math.min(60, anchorDx + delta));
			anchorDx = next;
			setAnchorDx(next);
		} else {
			const next = Math.max(2, Math.min(60, anchorDy + delta));
			anchorDy = next;
			setAnchorDy(next);
		}
	}

	function toggleRatioLock() {
		if (!ratioLocked && anchorDx > 0 && anchorDy > 0) {
			lockedRatio = anchorDx / anchorDy;
		}
		ratioLocked = !ratioLocked;
	}

	async function setAnchorDx(d: number) {
		if (selectedStation?.id) {
			if (ratioLocked && !updatingFromLock) {
				updatingFromLock = true;
				anchorDy = Math.max(2, Math.min(60, Math.round(d / lockedRatio)));
				setAnchorDyRaw(anchorDy);
				updatingFromLock = false;
			}
			anchorDx = d;
			if (editorState.isGlobalView) {
				await StationService.updateStation(selectedStation.id, { anchorDx: d });
				await editorState.loadStations();
			} else if (editorState.activeViewId !== null) {
				await ViewStationService.setAnchorDx(editorState.activeViewId, selectedStation.id, d);
				const existing = editorState.viewStations.find(
					(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
				);
				if (existing) {
					existing.anchorDx = d;
				}
			}
		}
	}

	async function setAnchorDyRaw(d: number) {
		if (!selectedStation?.id) return;
		anchorDy = d;
		if (editorState.isGlobalView) {
			await StationService.updateStation(selectedStation.id, { anchorDy: d });
			await editorState.loadStations();
		} else if (editorState.activeViewId !== null) {
			await ViewStationService.setAnchorDy(editorState.activeViewId, selectedStation.id, d);
			const existing = editorState.viewStations.find(
				(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
			);
			if (existing) {
				existing.anchorDy = d;
			}
		}
	}

	async function setAnchorDy(d: number) {
		if (selectedStation?.id) {
			if (ratioLocked && !updatingFromLock) {
				updatingFromLock = true;
				anchorDx = Math.max(2, Math.min(60, Math.round(d * lockedRatio)));
				setAnchorDxRaw(anchorDx);
				updatingFromLock = false;
			}
			anchorDy = d;
			if (editorState.isGlobalView) {
				await StationService.updateStation(selectedStation.id, { anchorDy: d });
				await editorState.loadStations();
			} else if (editorState.activeViewId !== null) {
				await ViewStationService.setAnchorDy(editorState.activeViewId, selectedStation.id, d);
				const existing = editorState.viewStations.find(
					(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
				);
				if (existing) {
					existing.anchorDy = d;
				}
			}
		}
	}

	async function setAnchorDxRaw(d: number) {
		if (!selectedStation?.id) return;
		anchorDx = d;
		if (editorState.isGlobalView) {
			await StationService.updateStation(selectedStation.id, { anchorDx: d });
			await editorState.loadStations();
		} else if (editorState.activeViewId !== null) {
			await ViewStationService.setAnchorDx(editorState.activeViewId, selectedStation.id, d);
			const existing = editorState.viewStations.find(
				(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
			);
			if (existing) {
				existing.anchorDx = d;
			}
		}
	}

	async function handleDeleteStation() {
		if (selectedStation?.id) {
			await StationService.deleteStation(selectedStation.id);
			editorState.selectedStationId = null;
			await editorState.loadStations();
			await editorState.loadRoutePoints();
		}
	}

	async function handleDeleteAnchor() {
		if (selectedAnchor?.id) {
			await AnchorPointService.delete(selectedAnchor.id);
			editorState.selectedAnchorId = null;
			await editorState.loadAnchorPoints();
		}
	}

	let anchorLine = $derived(
		selectedAnchor ? editorState.lines.find((l) => l.id === selectedAnchor.lineId) : null
	);
</script>

{#if selectedStation}
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-bold tracking-wider text-primary uppercase">Station</h3>

		<TextField label="Name" bind:value={stationName} onchange={() => updateStation(stationName)} />
		<TextField
			label="Subtitle"
			bind:value={stationSubtitle}
			onchange={() => updateSubtitle(stationSubtitle)}
		/>

		{#if selectedStation?.subtitle}
			<span class="text-sm text-on-surface-variant">Subtitle alignment</span>
			<div class="flex gap-1">
				{#each [{ value: 'left', icon: 'format_align_left', label: 'Left' }, { value: 'center', icon: 'format_align_center', label: 'Center' }, { value: 'right', icon: 'format_align_right', label: 'Right' }] as opt}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {subtitleAlign ===
						opt.value
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => setSubtitleAlign(subtitleAlign === opt.value ? '' : opt.value)}
						title={opt.label}
					>
						<span class="material-symbols-outlined">{opt.icon}</span>
					</button>
				{/each}
			</div>
		{/if}

		<span class="text-sm text-on-surface-variant">Label direction</span>
		<div class="flex flex-col gap-1 self-center">
			<div class="flex gap-1">
				{#each ['NW', 'N', 'NE'] as dir}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {labelDir ===
						dir
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => setLabelDirection(dir)}
						title={dir}
					>
						<span class="material-symbols-outlined">{DIR_ARROWS[dir]}</span>
					</button>
				{/each}
			</div>
			<div class="flex gap-1">
				{#each ['W', '', 'E'] as dir}
					{#if dir}
						<button
							class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {labelDir ===
							dir
								? 'border-primary bg-primary-container text-primary'
								: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
							onclick={() => setLabelDirection(dir)}
							title={dir}
						>
							<span class="material-symbols-outlined">{DIR_ARROWS[dir]}</span>
						</button>
					{:else}
						<div class="aspect-square w-9"></div>
					{/if}
				{/each}
			</div>
			<div class="flex gap-1">
				{#each ['SW', 'S', 'SE'] as dir}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {labelDir ===
						dir
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => setLabelDirection(dir)}
						title={dir}
					>
						<span class="material-symbols-outlined">{DIR_ARROWS[dir]}</span>
					</button>
				{/each}
			</div>
		</div>

		<span class="text-sm text-on-surface-variant">Label positioning</span>
		<div class="flex flex-col gap-1 self-center">
			<div class="flex gap-1">
				{#each ['NW', 'N', 'NE'] as anchor}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {labelAnchor ===
						anchor
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => setLabelAnchor(anchor)}
						title={anchor}
					>
						<span class="material-symbols-outlined">{ANCHOR_ICONS[anchor]}</span>
					</button>
				{/each}
			</div>
			<div class="flex gap-1">
				{#each ['W', '', 'E'] as anchor}
					{#if anchor}
						<button
							class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {labelAnchor ===
							anchor
								? 'border-primary bg-primary-container text-primary'
								: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
							onclick={() => setLabelAnchor(anchor)}
							title={anchor}
						>
							<span class="material-symbols-outlined">{ANCHOR_ICONS[anchor]}</span>
						</button>
					{:else}
						<div class="aspect-square w-9"></div>
					{/if}
				{/each}
			</div>
			<div class="flex gap-1">
				{#each ['SW', 'S', 'SE'] as anchor}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {labelAnchor ===
						anchor
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => setLabelAnchor(anchor)}
						title={anchor}
					>
						<span class="material-symbols-outlined">{ANCHOR_ICONS[anchor]}</span>
					</button>
				{/each}
			</div>
		</div>

		<span class="text-sm text-on-surface-variant">Anchor distance</span>
		<div class="flex items-end gap-2">
			<div class="flex flex-1 flex-col gap-1">
				<span class="text-xs text-on-surface-variant">X: {anchorDx}px</span>
				<div class="flex items-center gap-2" onwheel={(e) => { e.preventDefault(); handleWheel(e, 'x'); }}>
					<Slider bind:value={anchorDx} min={2} max={60} step={1} onchange={() => setAnchorDx(anchorDx)} />
				</div>
			</div>
			<button
				class="mb-0.5 flex aspect-square w-8 items-center justify-center rounded-md border p-1 text-base transition-colors {ratioLocked
					? 'border-primary bg-primary-container text-primary'
					: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
				onclick={toggleRatioLock}
				title={ratioLocked ? 'Unlock ratio' : 'Lock ratio'}
			>
				<span class="material-symbols-outlined text-sm">{ratioLocked ? 'lock' : 'lock_open'}</span>
			</button>
			<div class="flex flex-1 flex-col gap-1">
				<span class="text-xs text-on-surface-variant">Y: {anchorDy}px</span>
				<div class="flex items-center gap-2" onwheel={(e) => { e.preventDefault(); handleWheel(e, 'y'); }}>
					<Slider bind:value={anchorDy} min={2} max={60} step={1} onchange={() => setAnchorDy(anchorDy)} />
				</div>
			</div>
		</div>

		<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
			<span class="material-symbols-outlined">delete</span>
			{m.delete()}
		</Button>

		<Dialog bind:open={deleteConfirmOpen}>
			{#snippet title()}{m.delete()}{/snippet}
			<p>{m.delete()} ?</p>
			{#snippet actions()}
				<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
				<Button
					variant="filled"
					onclick={async () => {
						await handleDeleteStation();
						deleteConfirmOpen = false;
					}}
				>
					{m.delete()}
				</Button>
			{/snippet}
		</Dialog>
	</div>
{:else if selectedAnchor}
	<div class="flex flex-col gap-4">
		<h3 class="flex items-center gap-2 text-sm font-bold tracking-wider text-primary uppercase">
			<span class="material-symbols-outlined text-base">anchor</span>Anchor
		</h3>

		<div class="flex flex-col gap-2">
			<span class="text-sm text-on-surface-variant">Position</span>
			<div class="flex items-center gap-2 text-sm">
				<span class="rounded bg-surface-variant px-2 py-1 font-mono"
					>X: {selectedAnchor.schematicX}</span
				>
				<span class="rounded bg-surface-variant px-2 py-1 font-mono"
					>Y: {selectedAnchor.schematicY}</span
				>
			</div>
		</div>

		{#if anchorLine}
			<div class="flex flex-col gap-2">
				<span class="text-sm text-on-surface-variant">Line</span>
				<div class="flex items-center gap-2 rounded bg-surface-variant p-2 text-sm">
					<div
						class="h-3 w-3 shrink-0 rounded-full"
						style="background-color: {anchorLine.color}"
					></div>
					{anchorLine.name}
				</div>
			</div>
		{/if}

		<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
			<span class="material-symbols-outlined">delete</span>
			Delete anchor
		</Button>

		<Dialog bind:open={deleteConfirmOpen}>
			{#snippet title()}Delete anchor{/snippet}
			<p>Delete this anchor point?</p>
			{#snippet actions()}
				<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
				<Button
					variant="filled"
					onclick={async () => {
						await handleDeleteAnchor();
						deleteConfirmOpen = false;
					}}
				>
					{m.delete()}
				</Button>
			{/snippet}
		</Dialog>
	</div>
{/if}

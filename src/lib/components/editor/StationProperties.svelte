<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { StationService } from '$lib/services/StationService';
	import { ViewStationService } from '$lib/services/ViewStationService';
	import { EditorService } from '$lib/services/EditorService';

	import { Button, TextField, Dialog, Tooltip, NumberInput } from '$lib/components/ui';
	import { DIR_ARROWS, ANCHOR_ICONS } from '$lib/constants/schematic';
	import DirectionGrid from './properties/DirectionGrid.svelte';
	import InterchangeBadgeControls from './properties/InterchangeBadgeControls.svelte';
	import type { InterchangeBadgeMode, InterchangeBadgeDirection, Line } from '$lib/types';

	let stationName = $state('');
	let stationSubtitle = $state('');
	let labelDir = $state('E');
	let labelAnchor = $state('E');
	let subtitleAlign = $state('');
	let anchorDx = $state(14);
	let anchorDy = $state(14);
	let interchangeBadgeMode = $state<InterchangeBadgeMode>('station');
	let interchangeBadgeDir = $state<InterchangeBadgeDirection>('S');
	let posX = $state(0);
	let posY = $state(0);
	let ratioLocked = $state(false);
	let lockedRatio = $state(1);
	let updatingFromLock = $state(false);
	let deleteConfirmOpen = $state(false);

	let selectedStation = $derived(
		editorState.stations.find((s) => s.id === editorState.selectedStationId)
	);
	let selectedAnchor = $derived(
		editorState.anchorPoints.find((a) => a.id === editorState.selectedAnchorId)
	);

	let servingLinesAtStation = $derived.by(() => {
		if (!selectedStation?.id) return [];
		const lineIds = [
			...new Set(
				editorState.routePoints
					.filter((rp) => rp.stationId === selectedStation!.id)
					.map((rp) => rp.lineId)
			)
		];
		return lineIds
			.map((id) => editorState.lines.find((l) => l.id === id))
			.filter(Boolean) as Line[];
	});

	let hiddenBadgeLineIds = $derived.by(() => {
		if (!selectedStation) return new Set<number>();
		return new Set(editorState.stationHiddenInterchangeLineIds(selectedStation));
	});

	let effectiveHiddenLines = $derived.by(() => {
		if (!selectedStation) return new Set<number>();
		return editorState.effectiveHiddenLineIds;
	});

	let hasInterchangeBadges = $derived.by(() => {
		if (!selectedStation || editorState.isGlobalView) return false;
		return servingLinesAtStation.some((line) => effectiveHiddenLines.has(line.id!));
	});

	$effect(() => {
		if (selectedStation) {
			stationName = selectedStation.name;
			stationSubtitle = selectedStation.subtitle ?? '';
			labelDir = editorState.stationLabelDirection(selectedStation);
			labelAnchor = editorState.stationLabelAnchor(selectedStation);
			subtitleAlign = editorState.stationSubtitleAlign(selectedStation) ?? '';
			anchorDx = editorState.stationAnchorDx(selectedStation);
			anchorDy = editorState.stationAnchorDy(selectedStation);
			interchangeBadgeMode = editorState.stationInterchangeBadgeMode(selectedStation);
			interchangeBadgeDir = editorState.stationInterchangeBadgeDirection(selectedStation);
			const p = editorState.stationPosition(selectedStation);
			posX = p.x;
			posY = p.y;
		}
	});

	async function setInterchangeBadgeMode(mode: InterchangeBadgeMode) {
		interchangeBadgeMode = mode;
		if (selectedStation?.id && editorState.activeViewId !== null) {
			await ViewStationService.setInterchangeBadgeMode(
				editorState.activeViewId,
				selectedStation.id,
				mode
			);
			const existing = editorState.viewStations.find(
				(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
			);
			if (existing) {
				existing.interchangeBadgeMode = mode;
			} else {
				const station = editorState.stations.find((s) => s.id === selectedStation.id);
				if (station) {
					editorState.viewStations = [
						...editorState.viewStations,
						{
							id: undefined,
							viewId: editorState.activeViewId,
							stationId: station.id!,
							schematicX: station.schematicX,
							schematicY: station.schematicY,
							interchangeBadgeMode: mode
						} as import('$lib/types').ViewStation
					];
				}
			}
		}
	}

	async function setInterchangeBadgeDirection(dir: InterchangeBadgeDirection) {
		interchangeBadgeDir = dir;
		if (selectedStation?.id && editorState.activeViewId !== null) {
			await ViewStationService.setInterchangeBadgeDirection(
				editorState.activeViewId,
				selectedStation.id,
				dir
			);
			const existing = editorState.viewStations.find(
				(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
			);
			if (existing) {
				existing.interchangeBadgeDirection = dir;
			} else {
				const station = editorState.stations.find((s) => s.id === selectedStation.id);
				if (station) {
					editorState.viewStations = [
						...editorState.viewStations,
						{
							id: undefined,
							viewId: editorState.activeViewId,
							stationId: station.id!,
							schematicX: station.schematicX,
							schematicY: station.schematicY,
							interchangeBadgeDirection: dir
						} as import('$lib/types').ViewStation
					];
				}
			}
		}
	}

	async function toggleInterchangeBadgeLine(lineId: number, hidden: boolean) {
		if (selectedStation?.id && editorState.activeViewId !== null) {
			await ViewStationService.toggleInterchangeLine(
				editorState.activeViewId,
				selectedStation.id,
				lineId,
				hidden
			);
			const existing = editorState.viewStations.find(
				(vs) => vs.viewId === editorState.activeViewId && vs.stationId === selectedStation.id
			);
			if (existing) {
				let ids = existing.hiddenInterchangeLineIds ?? [];
				if (hidden && !ids.includes(lineId)) {
					existing.hiddenInterchangeLineIds = [...ids, lineId];
				} else if (!hidden && ids.includes(lineId)) {
					existing.hiddenInterchangeLineIds = ids.filter((id) => id !== lineId);
				}
			}
		}
	}

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

	async function applyStationUpdate(
		partialStation: Partial<import('$lib/types').Station>,
		viewStationUpdateFn?: (viewId: number, stationId: number) => Promise<void>
	) {
		const station = editorState.stations.find((s) => s.id === editorState.selectedStationId);
		if (!station?.id) return;

		const cleanVs: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(partialStation)) {
			if (v !== undefined) cleanVs[k] = v;
		}

		if (editorState.isGlobalView) {
			await StationService.updateStation(station.id, partialStation);
			await editorState.loadStations();
		} else if (editorState.activeViewId !== null && viewStationUpdateFn) {
			await viewStationUpdateFn(editorState.activeViewId, station.id);
			const existing = editorState.viewStations.find(
				(vs) => vs.viewId === editorState.activeViewId && vs.stationId === station.id
			);
			if (existing) {
				Object.assign(existing, cleanVs);
			} else {
				editorState.viewStations = [
					...editorState.viewStations,
					{
						id: undefined,
						viewId: editorState.activeViewId,
						stationId: station.id,
						schematicX: station.schematicX,
						schematicY: station.schematicY,
						...cleanVs
					} as import('$lib/types').ViewStation
				];
			}
		}
	}

	async function setLabelDirection(dir: string) {
		labelDir = dir;
		await applyStationUpdate({ labelDirection: dir }, (vid, sid) =>
			ViewStationService.updateViewStation(vid, sid, { labelDirection: dir })
		);
	}

	async function setSubtitleAlign(align: string) {
		subtitleAlign = align;
		await applyStationUpdate({ subtitleAlign: align || undefined }, (vid, sid) =>
			ViewStationService.updateViewStation(vid, sid, { subtitleAlign: align || undefined })
		);
	}

	async function setLabelAnchor(anchor: string) {
		labelAnchor = anchor;
		await applyStationUpdate({ labelAnchor: anchor }, (vid, sid) =>
			ViewStationService.updateViewStation(vid, sid, { labelAnchor: anchor })
		);
	}

	async function setPosition(x: number, y: number) {
		posX = x;
		posY = y;
		await EditorService.updateViewStationPosition(editorState, selectedStation!.id!, x, y);
	}

	function toggleRatioLock() {
		if (!ratioLocked && anchorDx !== 0 && anchorDy !== 0) {
			lockedRatio = anchorDx / anchorDy;
		}
		ratioLocked = !ratioLocked;
	}

	async function setAnchorDx(d: number) {
		if (ratioLocked && !updatingFromLock) {
			updatingFromLock = true;
			anchorDy = Math.round(d / lockedRatio);
			await commitAnchorDy(anchorDy);
			updatingFromLock = false;
		}
		await commitAnchorDx(d);
	}

	async function setAnchorDy(d: number) {
		if (ratioLocked && !updatingFromLock) {
			updatingFromLock = true;
			anchorDx = Math.round(d * lockedRatio);
			await commitAnchorDx(anchorDx);
			updatingFromLock = false;
		}
		await commitAnchorDy(d);
	}

	async function commitAnchorDx(d: number) {
		anchorDx = d;
		await applyStationUpdate({ anchorDx: d }, (vid, sid) =>
			ViewStationService.updateViewStation(vid, sid, { anchorDx: d })
		);
	}

	async function commitAnchorDy(d: number) {
		anchorDy = d;
		await applyStationUpdate({ anchorDy: d }, (vid, sid) =>
			ViewStationService.updateViewStation(vid, sid, { anchorDy: d })
		);
	}

	async function handleDeleteStation() {
		await EditorService.deleteStation(editorState, selectedStation!.id!);
	}

	async function handleDeleteAnchor() {
		await EditorService.deleteAnchor(editorState, selectedAnchor!.id!);
	}

	let anchorLine = $derived(
		selectedAnchor ? editorState.lines.find((l) => l.id === selectedAnchor.lineId) : null
	);
</script>

{#if selectedStation}
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-bold tracking-wider text-primary uppercase">{m.station()}</h3>

		<div class="flex flex-col gap-3 rounded-lg bg-surface-variant/40 p-3">
			<TextField
				label={m.name()}
				bind:value={stationName}
				onchange={() => updateStation(stationName)}
				autofocus
			/>
			<TextField
				label={m.subtitle()}
				bind:value={stationSubtitle}
				onchange={() => updateSubtitle(stationSubtitle)}
			/>
		</div>

		<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
			<div class="flex items-center justify-between text-sm text-on-surface-variant">
				<span>{m.position()}</span>
				<Tooltip text={m.view_specific_property()}>
					<span class="material-symbols-outlined text-xs text-outline">tune</span>
				</Tooltip>
			</div>
			<div class="flex gap-2">
				<NumberInput
					label="X"
					bind:value={posX}
					onchange={() => setPosition(posX, posY)}
					class="flex-1"
				/>
				<NumberInput
					label="Y"
					bind:value={posY}
					onchange={() => setPosition(posX, posY)}
					class="flex-1"
				/>
			</div>
		</div>

		{#if selectedStation?.subtitle}
			<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
				<div class="flex items-center justify-between text-sm text-on-surface-variant">
					<span>{m.subtitle_alignment()}</span>
					<Tooltip text={m.view_specific_property()}>
						<span class="material-symbols-outlined text-xs text-outline">tune</span>
					</Tooltip>
				</div>
				<div class="flex w-full overflow-hidden rounded-md border border-outline/20">
					{#each [{ value: 'left', icon: 'format_align_left' }, { value: 'center', icon: 'format_align_center' }, { value: 'right', icon: 'format_align_right' }] as opt (opt.value)}
						<button
							class="flex flex-1 items-center justify-center border-r border-outline/20 py-1.5 text-base transition-colors last:border-r-0 {subtitleAlign ===
							opt.value
								? 'bg-primary-container text-primary'
								: 'text-on-surface-variant hover:bg-surface-variant'}"
							onclick={() => setSubtitleAlign(subtitleAlign === opt.value ? '' : opt.value)}
						>
							<span class="material-symbols-outlined">{opt.icon}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<DirectionGrid
			title={m.label_direction()}
			tooltip={m.view_specific_property()}
			selectedDir={labelDir}
			iconMap={DIR_ARROWS}
			onchange={setLabelDirection}
		/>

		<DirectionGrid
			title={m.label_positioning()}
			tooltip={m.view_specific_property()}
			selectedDir={labelAnchor}
			iconMap={ANCHOR_ICONS}
			onchange={setLabelAnchor}
		/>

		<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
			<div class="flex items-center justify-between text-sm text-on-surface-variant">
				<span>{m.label_distance()}</span>
				<Tooltip text={m.view_specific_property()}>
					<span class="material-symbols-outlined text-xs text-outline">tune</span>
				</Tooltip>
			</div>
			<div class="flex items-end gap-2">
				<NumberInput
					label={m.anchor_x({ dx: anchorDx })}
					bind:value={anchorDx}
					onchange={() => setAnchorDx(anchorDx)}
					class="flex-1"
				/>
				<button
					class="mb-0.5 flex aspect-square w-8 items-center justify-center rounded-md border p-1 text-base transition-colors {ratioLocked
						? 'border-primary bg-primary-container text-primary'
						: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
					onclick={toggleRatioLock}
					title={ratioLocked ? m.unlock_ratio() : m.lock_ratio()}
				>
					<span class="material-symbols-outlined text-sm">{ratioLocked ? 'lock' : 'lock_open'}</span
					>
				</button>
				<NumberInput
					label={m.anchor_y({ dy: anchorDy })}
					bind:value={anchorDy}
					onchange={() => setAnchorDy(anchorDy)}
					class="flex-1"
				/>
			</div>
		</div>

		{#if hasInterchangeBadges}
			<InterchangeBadgeControls
				mode={interchangeBadgeMode}
				direction={interchangeBadgeDir}
				servingLines={servingLinesAtStation}
				hiddenLineIds={effectiveHiddenLines}
				{hiddenBadgeLineIds}
				onchangeMode={setInterchangeBadgeMode}
				onchangeDirection={setInterchangeBadgeDirection}
				ontoggleLine={toggleInterchangeBadgeLine}
			/>
		{/if}

		<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
			<span class="material-symbols-outlined">delete</span>
			{m.delete()}
		</Button>

		<Dialog bind:open={deleteConfirmOpen}>
			{#snippet title()}{m.delete()}{/snippet}
			<p>{m.delete_station_confirm()}</p>
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
			<span class="material-symbols-outlined text-base">anchor</span>{m.anchor()}
		</h3>

		<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
			<span class="text-sm text-on-surface-variant">{m.position()}</span>
			<div class="flex items-center gap-2 text-sm">
				<span class="rounded bg-surface-variant px-2 py-1 font-mono"
					>{m.position_x({ x: selectedAnchor.schematicX })}</span
				>
				<span class="rounded bg-surface-variant px-2 py-1 font-mono"
					>{m.position_y({ y: selectedAnchor.schematicY })}</span
				>
			</div>
		</div>

		{#if anchorLine}
			<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
				<span class="text-sm text-on-surface-variant">{m.line()}</span>
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
			{m.delete_anchor()}
		</Button>

		<Dialog bind:open={deleteConfirmOpen}>
			{#snippet title()}{m.delete_anchor()}{/snippet}
			<p>{m.delete_anchor_confirm()}</p>
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

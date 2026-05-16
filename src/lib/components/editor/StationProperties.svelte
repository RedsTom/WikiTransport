<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { StationService } from '$lib/services/StationService';
	import { ViewStationService } from '$lib/services/ViewStationService';
	import { EditorService } from '$lib/services/EditorService';

	import { Button, TextField, Dialog, NumberInput } from '$lib/components/ui';
	import StationLabelControls from './properties/StationLabelControls.svelte';
	import InterchangeBadgeControls from './properties/InterchangeBadgeControls.svelte';
	import AnchorProperties from './properties/AnchorProperties.svelte';
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
	let deleteConfirmOpen = $state(false);

	let selectedStation = $derived(
		editorState.stations.find((s) => s.id === editorState.selectedStationId)
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
			try {
				await StationService.updateStation(selectedStation.id, { name });
				await editorState.loadStations();
			} catch (err) {
				console.error('updateStation failed', err);
			}
		}
	}

	async function updateSubtitle(subtitle: string) {
		if (selectedStation?.id) {
			try {
				await StationService.updateStation(selectedStation.id, { subtitle: subtitle || undefined });
				await editorState.loadStations();
			} catch (err) {
				console.error('updateSubtitle failed', err);
			}
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

		try {
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
		} catch (err) {
			console.error('applyStationUpdate failed', err);
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
		if (ratioLocked) {
			const newDy = Math.round(d / lockedRatio);
			anchorDy = newDy;
			await commitAnchorPair(d, newDy);
		} else {
			await commitAnchorDx(d);
		}
	}

	async function setAnchorDy(d: number) {
		if (ratioLocked) {
			const newDx = Math.round(d * lockedRatio);
			anchorDx = newDx;
			await commitAnchorPair(newDx, d);
		} else {
			await commitAnchorDy(d);
		}
	}

	async function commitAnchorPair(dx: number, dy: number) {
		await applyStationUpdate({ anchorDx: dx, anchorDy: dy }, (vid, sid) =>
			ViewStationService.updateViewStation(vid, sid, { anchorDx: dx, anchorDy: dy })
		);
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
</script>

{#if selectedStation}
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-bold tracking-wider text-primary uppercase">{m.station()}</h3>

		<div class="flex flex-col gap-3 rounded-lg bg-surface-variant/40 p-3">
			<TextField
				label={m.name()}
				bind:value={stationName}
				onchange={() => updateStation(stationName)}
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

		<StationLabelControls
			subtitle={stationSubtitle}
			{subtitleAlign}
			{labelDir}
			{labelAnchor}
			{anchorDx}
			{anchorDy}
			{ratioLocked}
			onsubtitlealign={setSubtitleAlign}
			onlabeldir={setLabelDirection}
			onlabelanchor={setLabelAnchor}
			onanchordx={setAnchorDx}
			onanchordy={setAnchorDy}
			ontoggleratio={toggleRatioLock}
		/>

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
			{#snippet icon()}
				<span class="material-symbols-outlined">delete</span>
			{/snippet}
			{#snippet title()}{m.delete()}{/snippet}
			<p>{m.delete_station_confirm()}</p>
			{#snippet actions()}
				<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
				<Button
					variant="filled"
					autofocus
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
{:else if editorState.selectedAnchorId !== null}
	<AnchorProperties />
{/if}

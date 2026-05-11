<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import type { IconShape } from '$lib/types';
	import type { RoutePoint } from '$lib/types';
	import {
		stationPos,
		stationLabelDir,
		stationLabelAnchor,
		stationAnchorDx,
		stationAnchorDy,
		getBadgeLayout,
		getInterchangeBadgeModeForStation,
		getInterchangeBadgeDirectionForStation,
		getHiddenInterchangeLineIdsForStation,
		getTransitType,
		BADGE_SIZE,
		BADGE_GAP
	} from '$lib/utils/svg-export';
	import { getLabelLayout } from '$lib/utils/schematic';
	import { getContrastColor } from '$lib/utils/color';
	import { DIR_CFG } from '$lib/constants/schematic';
	import { measureText } from '$lib/utils/textMeasure';

	let {
		data,
		isGlobal
	}: {
		data: ExportData;
		isGlobal: boolean;
	} = $props();
</script>

{#each data.stations as station (station.id)}
	{@const hiddenStations = new Set(data.hiddenStationIds)}
	{@const hiddenLines = new Set(data.hiddenLineIds)}
	{@const isHidden = hiddenStations.has(station.id!)}
	{@const pos = stationPos(station, data.viewStations, isGlobal)}

	{@const servingLineIds = data.routePoints
		.filter((rp: RoutePoint) => rp.stationId === station.id)
		.map((rp: RoutePoint) => rp.lineId)}
	{@const rawHiddenIds = (() => {
		const h: number[] = [];
		for (const lid of servingLineIds) {
			if (hiddenLines.has(lid)) h.push(lid);
		}
		return h;
	})()}

	{@const excludedInterchangeIds = getHiddenInterchangeLineIdsForStation(
		station.id!,
		data.viewStations,
		isGlobal
	)}
	{@const excludedSet = new Set(excludedInterchangeIds)}
	{@const hiddenIds = rawHiddenIds
		.filter((id: number) => !excludedSet.has(id))
		.sort((a: number, b: number) => {
			const la = data.lines.find((l) => l.id === a);
			const lb = data.lines.find((l) => l.id === b);
			if (!la || !lb) return a - b;
			if (la.transitTypeId !== lb.transitTypeId)
				return (la.transitTypeId ?? -1) - (lb.transitTypeId ?? -1);
			return (la.name ?? '').localeCompare(lb.name ?? '');
		})}

	{#if !isHidden && hiddenIds.length > 0}
		{@const badgeMode = getInterchangeBadgeModeForStation(station.id!, data.viewStations, isGlobal)}
		{@const badgeDirection = getInterchangeBadgeDirectionForStation(
			station.id!,
			data.viewStations,
			isGlobal
		)}
		{@const labelAnchor = stationLabelAnchor(station, data.viewStations, isGlobal)}
		{@const anchorDx = stationAnchorDx(station, data.viewStations, isGlobal)}
		{@const anchorDy = stationAnchorDy(station, data.viewStations, isGlobal)}
		{@const labelDir = stationLabelDir(station, data.viewStations, isGlobal)}

		{@const baseLayout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y)}
		{@const titleW = measureText(station.name, 12, true) || station.name.length * 12 * 0.58}
		{@const badgeDirCfg = DIR_CFG[labelDir] ?? DIR_CFG.E}

		{@const layout = getBadgeLayout(
			badgeMode,
			badgeDirection,
			pos.x,
			pos.y,
			labelDir,
			baseLayout,
			hiddenIds.length,
			titleW,
			badgeDirCfg.anchor
		)}

		{#each hiddenIds as lid, i (lid)}
			{@const line = data.lines.find((l) => l.id === lid)}
			{@const tt = line ? getTransitType(line, data) : undefined}
			{@const shape = (tt?.iconShape ?? 'square') as IconShape}
			{@const textColor = line ? getContrastColor(line.color) : '#000'}
			{@const cx = layout.horizontal
				? layout.startX + i * (BADGE_SIZE + BADGE_GAP) + BADGE_SIZE / 2
				: layout.startX + BADGE_SIZE / 2}
			{@const cy = layout.horizontal
				? layout.startY + BADGE_SIZE / 2
				: layout.startY + i * (BADGE_SIZE + BADGE_GAP) + BADGE_SIZE / 2}
			{@const half = BADGE_SIZE / 2}
			{@const isDiamond = shape === 'diamond'}
			{@const diamondHalf = isDiamond ? half / Math.SQRT2 : half}
			{@const diamondSize = diamondHalf * 2}
			{@const fontSize = isDiamond
				? Math.max(7, Math.min(10, BADGE_SIZE * 0.35))
				: Math.max(10, Math.min(13, BADGE_SIZE * 0.5))}
			{@const textDY = fontSize * 0.35}

			{#if line}
				<g>
					{#if shape === 'circle'}
						<circle {cx} {cy} r={half} fill={line.color} stroke="white" stroke-width="1.5" />
					{:else if shape === 'square'}
						<rect
							x={cx - half}
							y={cy - half}
							width={BADGE_SIZE}
							height={BADGE_SIZE}
							rx="2"
							fill={line.color}
							stroke="white"
							stroke-width="1.5"
						/>
					{:else if shape === 'diamond'}
						<rect
							x={cx - diamondHalf}
							y={cy - diamondHalf}
							width={diamondSize}
							height={diamondSize}
							rx="2"
							fill={line.color}
							stroke="white"
							stroke-width="1.5"
							transform="rotate(45, {cx}, {cy})"
						/>
					{:else}
						<rect
							x={cx - half}
							y={cy - half}
							width={BADGE_SIZE}
							height={BADGE_SIZE}
							rx={half}
							fill={line.color}
							stroke="white"
							stroke-width="1.5"
						/>
					{/if}
					<text
						x={cx}
						y={cy + textDY}
						text-anchor="middle"
						font-family="sans-serif"
						font-size={fontSize}
						font-weight="bold"
						fill={textColor}>{line.name}</text
					>
				</g>
			{/if}
		{/each}
	{/if}
{/each}

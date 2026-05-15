<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import { measureText } from '$lib/utils/textMeasure';
	import { getLabelLayout, partitionLineIdsByVisibility } from '$lib/utils/schematic';
	import {
		stationPos,
		stationLabelDir,
		stationLabelAnchor,
		stationAnchorDx,
		stationAnchorDy,
		stationSubAlign,
		getBadgeLayout,
		getInterchangeBadgeModeForStation,
		getInterchangeBadgeDirectionForStation,
		getHiddenInterchangeLineIdsForStation
	} from '$lib/utils/svg-export';
	import { POINT_RADIUS, DIR_CFG } from '$lib/constants/schematic';

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
	{@const isHidden = hiddenStations.has(station.id!)}
	{@const pos = stationPos(station, data.viewStations, isGlobal)}
	{@const { visibleLineIds, hiddenLineIds: rawHiddenIds } = partitionLineIdsByVisibility(
		data.routePoints,
		station.id!,
		new Set(data.hiddenLineIds)
	)}
	{@const isInterchange = visibleLineIds.length > 1}
	{@const hasHidden = rawHiddenIds.length > 0}
	{@const circleColor =
		visibleLineIds.length === 1 && !hasHidden
			? (data.lines.find((l) => l.id === visibleLineIds[0])?.color ?? 'white')
			: 'white'}
	{@const strokeColor = visibleLineIds.length === 1 && !hasHidden ? 'white' : '#666'}
	{@const strokeWidth = isInterchange || hasHidden ? 2.5 : 2}
	{@const radius = isInterchange || hasHidden ? POINT_RADIUS + 2 : POINT_RADIUS}
	{#if !isHidden}
		<circle
			cx={pos.x}
			cy={pos.y}
			r={radius}
			fill={circleColor}
			stroke={strokeColor}
			stroke-width={strokeWidth}
		/>

		{@const labelAnchor = stationLabelAnchor(station, data.viewStations, isGlobal)}
		{@const labelDir = stationLabelDir(station, data.viewStations, isGlobal)}
		{@const anchorDx = stationAnchorDx(station, data.viewStations, isGlobal)}
		{@const anchorDy = stationAnchorDy(station, data.viewStations, isGlobal)}
		{@const subAlign = stationSubAlign(station, data.viewStations, isGlobal)}

		{@const dCfg = DIR_CFG[labelDir] ?? DIR_CFG.E}
		{@const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y)}

		{@const excludedIds = getHiddenInterchangeLineIdsForStation(
			station.id!,
			data.viewStations,
			isGlobal
		)}
		{@const excludedSet = new Set(excludedIds)}
		{@const badgeCount = rawHiddenIds.filter((id: number) => !excludedSet.has(id)).length}

		{@const hasSubtitle = !!station.subtitle}
		{@const titleFontSize = hasSubtitle ? 11 : 12}
		{@const subFontSize = 9}

		{@const titleW =
			measureText(station.name, titleFontSize, true) || station.name.length * titleFontSize * 0.58}
		{@const subW = station.subtitle
			? measureText(station.subtitle, subFontSize) || station.subtitle.length * subFontSize * 0.58
			: 0}

		{@const badgeMode =
			badgeCount > 0
				? getInterchangeBadgeModeForStation(station.id!, data.viewStations, isGlobal)
				: 'station'}
		{@const badgeDirection =
			badgeCount > 0
				? getInterchangeBadgeDirectionForStation(station.id!, data.viewStations, isGlobal)
				: 'S'}
		{@const bl =
			badgeCount > 0
				? getBadgeLayout(
						badgeMode,
						badgeDirection,
						pos.x,
						pos.y,
						labelDir,
						layout,
						badgeCount,
						titleW,
						dCfg.anchor
					)
				: null}
		{@const centeringOffset = bl?.centeringOffset ?? 0}

		{@const titleX =
			dCfg.anchor === 'end'
				? layout.x - titleW
				: dCfg.anchor === 'middle'
					? layout.x - titleW / 2
					: layout.x}
		{@const adjustedTitleX = titleX + centeringOffset}
		{@const subX =
			subAlign === 'left'
				? titleX
				: subAlign === 'center'
					? titleX + (titleW - subW) / 2
					: subAlign === 'right'
						? titleX + titleW - subW
						: dCfg.anchor === 'end'
							? layout.x - subW
							: dCfg.anchor === 'middle'
								? layout.x - subW / 2
								: layout.x}
		{@const adjustedSubX = subX + centeringOffset}
		{@const rotation = dCfg.rotation
			? `rotate(${dCfg.rotation}, ${layout.x}, ${layout.y})`
			: undefined}

		<g transform={rotation ?? undefined}>
			<text
				x={adjustedTitleX}
				y={layout.y}
				font-size={titleFontSize}
				font-family="sans-serif"
				font-weight="bold"
				fill="#000"
				text-anchor="start">{station.name}</text
			>
			{#if hasSubtitle}
				<text
					x={adjustedSubX}
					y={layout.subtitleY}
					font-size={subFontSize}
					font-family="sans-serif"
					fill="#666"
					text-anchor="start">{station.subtitle}</text
				>
			{/if}
		</g>
	{/if}
{/each}

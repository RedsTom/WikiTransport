<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import { measureText } from '$lib/utils/textMeasure';
	import { getLabelLayout } from '$lib/utils/schematic';
	import { getBadgeLayout } from '$lib/utils/svg-export';
	import { POINT_RADIUS, DIR_CFG } from '$lib/constants/schematic';
	import type { IconShape } from '$lib/types';
	import SchematicBadges from './SchematicBadges.svelte';

	let {
		onstartdragstation = () => {}
	}: {
		onstartdragstation: (e: MouseEvent, id: number) => void;
	} = $props();

	function sortLineIds(lineIds: number[]): number[] {
		return [...lineIds].sort((a, b) => {
			const la = editorState.lineMap.get(a);
			const lb = editorState.lineMap.get(b);
			if (!la || !lb) return a - b;
			if (la.transitTypeId !== lb.transitTypeId)
				return (la.transitTypeId ?? -1) - (lb.transitTypeId ?? -1);
			return (la.name ?? '').localeCompare(lb.name ?? '');
		});
	}
</script>

{#each editorState.stations as station (station.id)}
	{@const isHidden =
		!editorState.isGlobalView && editorState.effectiveHiddenStationIds.has(station.id!)}
	{#if !isHidden}
		{@const pos = editorState.stationPosition(station)}
		{@const isSelected = editorState.selectedStationId === station.id}
		{@const labelDir = editorState.stationLabelDirection(station)}
		{@const labelAnchor = editorState.stationLabelAnchor(station)}
		{@const dCfg = DIR_CFG[labelDir] ?? DIR_CFG.E}
		{@const subAlign = editorState.stationSubtitleAlign(station)}
		{@const anchorDx = editorState.stationAnchorDx(station)}
		{@const anchorDy = editorState.stationAnchorDy(station)}
		<circle
			cx={pos.x}
			cy={pos.y}
			r={POINT_RADIUS}
			fill="white"
			stroke={isSelected ? 'black' : 'currentColor'}
			stroke-width={isSelected ? 4 : 2}
			class="cursor-pointer text-on-surface {isSelected ? '' : 'hover:stroke-primary'}"
			role="button"
			tabindex="-1"
			onmousedown={(e) => onstartdragstation(e, station.id!)}
			data-station-id={station.id}
		/>
		{@const hasSubtitle = !!station.subtitle}
		{@const servingLineIds = [
			...new Set((editorState.routePointsByStation.get(station.id!) ?? []).map((rp) => rp.lineId))
		].filter((id) => editorState.lineMap.has(id))}
		{@const hiddenLineIdsSet = editorState.effectiveHiddenLineIds}
		{@const hiddenInterchangeIds = editorState.stationHiddenInterchangeLineIds(station)}
		{@const hiddenInterchangeIdsSet = new Set(hiddenInterchangeIds)}
		{@const rawBadgeLineIds = servingLineIds.filter(
			(id) => hiddenLineIdsSet.has(id) && !hiddenInterchangeIdsSet.has(id)
		)}
		{@const interchangeBadgeLineIds = sortLineIds(rawBadgeLineIds)}
		{@const badgeMode = editorState.stationInterchangeBadgeMode(station)}
		{@const badgeDirection = editorState.stationInterchangeBadgeDirection(station)}
		{@const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y)}
		{@const titleFontSize = hasSubtitle ? 11 : 12}
		{@const subFontSize = 9}
		{@const titleW = measureText(station.name, titleFontSize, true)}
		{@const subW = hasSubtitle ? measureText(station.subtitle!, subFontSize) : 0}
		{@const badgeLayout = getBadgeLayout(
			badgeMode,
			badgeDirection,
			pos.x,
			pos.y,
			labelDir,
			layout,
			interchangeBadgeLineIds.length,
			titleW,
			dCfg.anchor
		)}
		{@const centeringOffset = badgeLayout.centeringOffset}
		{@const rawTitleX =
			dCfg.anchor === 'end'
				? layout.x - titleW
				: dCfg.anchor === 'middle'
					? layout.x - titleW / 2
					: layout.x}
		{@const rawSubX =
			subAlign === 'left'
				? rawTitleX
				: subAlign === 'center'
					? rawTitleX + (titleW - subW) / 2
					: subAlign === 'right'
						? rawTitleX + titleW - subW
						: dCfg.anchor === 'end'
							? layout.x - subW
							: dCfg.anchor === 'middle'
								? layout.x - subW / 2
								: layout.x}
		{@const titleX = rawTitleX + centeringOffset}
		{@const subX = rawSubX + centeringOffset}
		{@const tx = dCfg.rotation ? `rotate(${dCfg.rotation}, ${layout.x}, ${layout.y})` : undefined}
		<g transform={tx ? `${tx}` : undefined}>
			<text
				x={titleX}
				y={layout.y}
				font-size={titleFontSize}
				font-family="sans-serif"
				font-weight="bold"
				fill="currentColor"
				text-anchor="start"
				class="pointer-events-none text-on-surface"
			>
				{station.name}
			</text>
			{#if hasSubtitle}
				<text
					x={subX}
					y={layout.subtitleY}
					font-size={subFontSize}
					font-family="sans-serif"
					fill="currentColor"
					text-anchor="start"
					class="pointer-events-none text-on-surface-variant/70"
				>
					{station.subtitle}
				</text>
			{/if}
		</g>

		{#if interchangeBadgeLineIds.length > 0}
			{#each interchangeBadgeLineIds as lid, i (lid)}
				{@const line = editorState.lineMap.get(lid)}
				{@const tt = line ? editorState.transitTypeMap.get(line.transitTypeId!) : undefined}
				{@const shape = (tt?.iconShape ?? 'square') as IconShape}
				{@const cx = badgeLayout.horizontal
					? badgeLayout.startX + i * 23 + 10
					: badgeLayout.startX + 10}
				{@const cy = badgeLayout.horizontal
					? badgeLayout.startY + 10
					: badgeLayout.startY + i * 23 + 10}
				{#if line}
					<SchematicBadges {shape} {cx} {cy} color={line.color} label={line.name} />
				{/if}
			{/each}
		{/if}
	{/if}
{/each}

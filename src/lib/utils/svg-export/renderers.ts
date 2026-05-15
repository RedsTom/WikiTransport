import type {
	Station,
	Line,
	TransitType,
	ViewStation,
	InterchangeBadgeMode,
	InterchangeBadgeDirection
} from '$lib/types';
import type { ExportData } from './types';
import { buildLineOffsets as buildLineOffsetsCore } from '$lib/utils/schematic';
import {
	BADGE_SIZE,
	BADGE_GAP,
	LABEL_BADGE_GAP,
	STACK_BADGE_GAP,
	TEXT_CENTER_OFFSET,
	type BadgeLayout,
	getBadgeLayout
} from './badge-layout';

export { BADGE_SIZE, BADGE_GAP, LABEL_BADGE_GAP, STACK_BADGE_GAP, TEXT_CENTER_OFFSET };
export type { BadgeLayout };
export { getBadgeLayout };

export function getViewStationForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): ViewStation | null {
	if (isGlobal) return null;
	return viewStations.find((vs) => vs.stationId === stationId) ?? null;
}

export function getInterchangeBadgeModeForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): InterchangeBadgeMode {
	const vs = getViewStationForStation(stationId, viewStations, isGlobal);
	return vs?.interchangeBadgeMode ?? 'station';
}

export function getInterchangeBadgeDirectionForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): InterchangeBadgeDirection {
	const vs = getViewStationForStation(stationId, viewStations, isGlobal);
	return vs?.interchangeBadgeDirection ?? 'S';
}

export function getHiddenInterchangeLineIdsForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): number[] {
	const vs = getViewStationForStation(stationId, viewStations, isGlobal);
	return vs?.hiddenInterchangeLineIds ?? [];
}

export function stationPos(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): { x: number; y: number } {
	if (isGlobal) return { x: station.schematicX, y: station.schematicY };
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs
		? { x: vs.schematicX, y: vs.schematicY }
		: { x: station.schematicX, y: station.schematicY };
}

export function stationLabelDir(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): string {
	if (isGlobal) return station.labelDirection ?? 'E';
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.labelDirection ?? station.labelDirection ?? 'E';
}

export function stationLabelAnchor(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): string {
	if (isGlobal) return station.labelAnchor ?? 'E';
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.labelAnchor ?? station.labelAnchor ?? 'E';
}

export function stationSubAlign(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): string | undefined {
	if (isGlobal) return station.subtitleAlign;
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.subtitleAlign ?? station.subtitleAlign;
}

export function stationAnchorDx(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): number {
	if (isGlobal) return station.anchorDx ?? 14;
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.anchorDx ?? station.anchorDx ?? 14;
}

export function stationAnchorDy(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): number {
	if (isGlobal) return station.anchorDy ?? 14;
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.anchorDy ?? station.anchorDy ?? 14;
}

export function buildLineOffsets(
	data: ExportData,
	isGlobal: boolean
): Map<number, Map<string, { x: number; y: number }>> {
	return buildLineOffsetsCore(
		data.stations,
		data.routePoints,
		data.lines,
		new Set(data.hiddenLineIds),
		(s) => stationPos(s, data.viewStations, isGlobal)
	);
}

export function getInterchangeHiddenLineIds(data: ExportData): Set<number> {
	const hiddenLineIds = new Set(data.hiddenLineIds);
	const visibleLineIds = new Set(
		data.lines.filter((l) => l.id && !hiddenLineIds.has(l.id)).map((l) => l.id!)
	);
	const result = new Set<number>();
	for (const rp of data.routePoints) {
		if (!hiddenLineIds.has(rp.lineId)) continue;
		const hasVisible = data.routePoints.some(
			(orp) => orp.stationId === rp.stationId && visibleLineIds.has(orp.lineId)
		);
		if (hasVisible) result.add(rp.lineId);
	}
	return result;
}

export function getTransitType(line: Line, data: ExportData): TransitType | undefined {
	return data.transitTypes.find((t) => t.id === line.transitTypeId);
}

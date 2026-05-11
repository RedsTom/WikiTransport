import type {
	Station,
	Line,
	TransitType,
	ViewStation,
	InterchangeBadgeMode,
	InterchangeBadgeDirection
} from '$lib/types';
import type { ExportData } from './types';
import { LINE_SPACING } from '$lib/constants/schematic';

export const BADGE_SIZE = 20;
export const BADGE_GAP = 3;
export const BADGE_GAP_FROM_ANCHOR = 20;
export const LABEL_BADGE_GAP = 4;
export const STACK_BADGE_GAP = 12;
export const TEXT_CENTER_OFFSET = -4;

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

export interface BadgeLayout {
	startX: number;
	startY: number;
	horizontal: boolean;
	centeringOffset: number;
}

export function getBadgeLayout(
	mode: InterchangeBadgeMode,
	direction: InterchangeBadgeDirection,
	stationX: number,
	stationY: number,
	stationLabelDir: string,
	labelLayout: { x: number; y: number; subtitleY: number },
	badgeCount: number,
	textWidth: number = 0,
	labelAnchor: string = 'E'
): BadgeLayout {
	const totalW = badgeCount * BADGE_SIZE + (badgeCount - 1) * BADGE_GAP;
	const totalH = badgeCount * BADGE_SIZE + (badgeCount - 1) * BADGE_GAP;
	const useDir = stationLabelDir;

	const textRightExtent =
		labelAnchor === 'end' ? 0 : labelAnchor === 'middle' ? textWidth / 2 : textWidth;
	const textLeftExtent =
		labelAnchor === 'start' ? 0 : labelAnchor === 'middle' ? textWidth / 2 : textWidth;

	if (mode === 'station') {
		const anchorX = stationX;
		const anchorY = stationY;

		const isHorizontal = !['E', 'W'].includes(direction);
		const isSLabel = useDir.includes('S');

		let startX: number = 0;
		let startY: number = 0;

		if (isHorizontal) {
			startX = anchorX - totalW / 2;
		} else {
			startY = anchorY - totalW / 2;
		}

		switch (direction) {
			case 'N':
				startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				break;
			case 'S':
				if (isSLabel) {
					startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				} else {
					startY = anchorY + BADGE_GAP_FROM_ANCHOR;
				}
				break;
			case 'E':
				startX = anchorX + BADGE_GAP_FROM_ANCHOR;
				break;
			case 'W':
				startX = anchorX - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				break;
			case 'NE':
				startX = anchorX + BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
				startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				break;
			case 'NW':
				startX = anchorX - BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
				startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				break;
			case 'SE':
				startX = anchorX + BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
				if (isSLabel) {
					startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				} else {
					startY = anchorY + BADGE_GAP_FROM_ANCHOR;
				}
				break;
			case 'SW':
				startX = anchorX - BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
				if (isSLabel) {
					startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
				} else {
					startY = anchorY + BADGE_GAP_FROM_ANCHOR;
				}
				break;
		}

		return { startX, startY, horizontal: isHorizontal, centeringOffset: 0 };
	}

	if (mode === 'next_to_text') {
		if (labelAnchor === 'end') {
			return {
				startX: labelLayout.x - textLeftExtent - LABEL_BADGE_GAP - totalW,
				startY: labelLayout.y - BADGE_SIZE / 2 + TEXT_CENTER_OFFSET,
				horizontal: true,
				centeringOffset: 0
			};
		}
		const centeringOffset = labelAnchor === 'middle' ? -(LABEL_BADGE_GAP + totalW) / 2 : 0;
		return {
			startX: labelLayout.x + textRightExtent + LABEL_BADGE_GAP + centeringOffset,
			startY: labelLayout.y - BADGE_SIZE / 2 + TEXT_CENTER_OFFSET,
			horizontal: true,
			centeringOffset
		};
	}

	const gap = STACK_BADGE_GAP;
	switch (useDir) {
		case 'E':
		case 'NE':
		case 'SE':
			return {
				startX: labelLayout.x + textRightExtent + gap,
				startY: labelLayout.y - totalH / 2,
				horizontal: false,
				centeringOffset: 0
			};
		case 'W':
		case 'NW':
		case 'SW':
			return {
				startX: labelLayout.x - textLeftExtent - gap - BADGE_SIZE,
				startY: labelLayout.y - totalH / 2,
				horizontal: false,
				centeringOffset: 0
			};
		case 'N':
			return {
				startX: labelLayout.x - totalW / 2,
				startY: labelLayout.y - gap - BADGE_SIZE,
				horizontal: true,
				centeringOffset: 0
			};
		case 'S':
			return {
				startX: labelLayout.x - totalW / 2,
				startY: labelLayout.y + gap,
				horizontal: true,
				centeringOffset: 0
			};
		default:
			return {
				startX: labelLayout.x + textRightExtent + gap,
				startY: labelLayout.y - totalH / 2,
				horizontal: false,
				centeringOffset: 0
			};
	}
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
	const segMap = new Map<string, { dx: number; dy: number; lineIds: number[] }>();
	const hiddenLines = new Set(data.hiddenLineIds);

	for (const line of data.lines) {
		if (!line.id || hiddenLines.has(line.id)) continue;
		const stIds = data.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order)
			.map((rp) => rp.stationId);
		for (let i = 0; i < stIds.length - 1; i++) {
			const a = stIds[i],
				b = stIds[i + 1];
			const key = `${Math.min(a, b)},${Math.max(a, b)}`;
			let entry = segMap.get(key);
			if (!entry) {
				const sA = data.stations.find((s) => s.id === a);
				const sB = data.stations.find((s) => s.id === b);
				if (!sA || !sB) continue;
				const pA = stationPos(sA, data.viewStations, isGlobal);
				const pB = stationPos(sB, data.viewStations, isGlobal);
				entry = { dx: pB.x - pA.x, dy: pB.y - pA.y, lineIds: [] };
				segMap.set(key, entry);
			}
			entry.lineIds.push(line.id);
		}
	}

	for (const [, entry] of segMap) {
		entry.lineIds.sort((a, b) => {
			const la = data.lines.find((l) => l.id === a);
			const lb = data.lines.find((l) => l.id === b);
			return (la?.transitTypeId ?? -1) - (lb?.transitTypeId ?? -1) || a - b;
		});
	}

	const result: Map<number, Map<string, { x: number; y: number }>> = new Map();
	for (const line of data.lines) {
		if (line.id && !hiddenLines.has(line.id)) result.set(line.id, new Map());
	}

	for (const [key, info] of segMap) {
		const { dx, dy, lineIds } = info;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len === 0 || lineIds.length <= 1) continue;
		const perpX = dy / len,
			perpY = -dx / len;
		for (let idx = 0; idx < lineIds.length; idx++) {
			const lid = lineIds[idx];
			const off = (idx - (lineIds.length - 1) / 2) * LINE_SPACING;
			const lineSegMap = result.get(lid);
			if (!lineSegMap) continue;
			lineSegMap.set(key, { x: perpX * off, y: perpY * off });
		}
	}

	return result;
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

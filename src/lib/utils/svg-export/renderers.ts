import type {
	Station,
	Line,
	TransitType,
	ViewStation,
	InterchangeBadgeMode,
	InterchangeBadgeDirection
} from '$lib/types';
import type { ExportData } from './types';
import { createOctilinearPath, scaleDashPattern, getLabelLayout } from '../schematic';
import { getContrastColor } from '../color';
import { POINT_RADIUS, LINE_WIDTH, LINE_SPACING, DIR_CFG } from '$lib/constants/schematic';
import { measureText } from '../textMeasure';

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

function lineNamesForStation(
	stationId: number,
	data: ExportData,
	hiddenLines: Set<number>
): { visibleLineIds: number[]; hiddenLineIds: number[] } {
	const servingLineIds = data.routePoints
		.filter((rp) => rp.stationId === stationId)
		.map((rp) => rp.lineId);
	const visibleLineIds: number[] = [];
	const hiddenLineIds: number[] = [];
	for (const lid of servingLineIds) {
		if (hiddenLines.has(lid)) hiddenLineIds.push(lid);
		else visibleLineIds.push(lid);
	}
	return { visibleLineIds, hiddenLineIds };
}

export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function shapeSvg(
	shape: 'circle' | 'square' | 'diamond' | 'pill',
	size: number,
	fill: string,
	textColor: string,
	label: string,
	cx: number,
	cy: number
): string {
	const half = size / 2;
	const escapedLabel = escapeXml(label);
	const isDiamond = shape === 'diamond';
	const diamondHalf = isDiamond ? half / Math.SQRT2 : half;
	const diamondSize = diamondHalf * 2;
	const fontSize = isDiamond
		? Math.max(7, Math.min(10, size * 0.35))
		: Math.max(10, Math.min(13, size * 0.5));
	const textDY = fontSize * 0.35;
	const textY = cy + textDY;
	const stroke = 'stroke="white" stroke-width="1.5"';

	const text = `<text x="${cx}" y="${textY}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}">${escapedLabel}</text>`;

	switch (shape) {
		case 'circle':
			return `<circle cx="${cx}" cy="${cy}" r="${half}" fill="${fill}" ${stroke}/>\n${text}`;
		case 'square':
			return `<rect x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" rx="2" fill="${fill}" ${stroke}/>\n${text}`;
		case 'diamond':
			return `<rect x="${cx - diamondHalf}" y="${cy - diamondHalf}" width="${diamondSize}" height="${diamondSize}" rx="2" fill="${fill}" ${stroke} transform="rotate(45, ${cx}, ${cy})"/>\n${text}`;
		case 'pill':
			return `<rect x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" rx="${half}" fill="${fill}" ${stroke}/>\n${text}`;
	}
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

export function renderLines(
	data: ExportData,
	isGlobal: boolean,
	lineOffsets: Map<number, Map<string, { x: number; y: number }>>
): string {
	const hiddenLines = new Set(data.hiddenLineIds);
	let svg = '';

	for (const line of data.lines) {
		if (!line.id || hiddenLines.has(line.id)) continue;

		const rps = data.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order);
		const segOffMap = lineOffsets.get(line.id);
		const lineAnchors = data.anchorPoints
			.filter((ap) => ap.lineId === line.id)
			.sort((a, b) => a.order - b.order);

		const allCoords: { x: number; y: number; order: number }[] = [];
		for (let i = 0; i < rps.length; i++) {
			const rp = rps[i];
			const s = data.stations.find((st) => st.id === rp.stationId);
			if (!s) continue;
			const pos = stationPos(s, data.viewStations, isGlobal);
			let offX = 0,
				offY = 0,
				cnt = 0;
			const addOff = (a: number, b: number) => {
				const k = `${Math.min(a, b)},${Math.max(a, b)}`;
				const o = segOffMap?.get(k);
				if (o) {
					offX += o.x;
					offY += o.y;
					cnt++;
				}
			};
			if (i > 0) addOff(rps[i - 1].stationId, rp.stationId);
			if (i < rps.length - 1) addOff(rp.stationId, rps[i + 1].stationId);
			if (cnt > 0) {
				offX /= cnt;
				offY /= cnt;
			}
			allCoords.push({ x: pos.x + offX, y: pos.y + offY, order: rp.order });
		}
		for (const ap of lineAnchors) {
			const beforeRps = rps.filter((rp) => rp.order < ap.order);
			const afterRps = rps.filter((rp) => rp.order > ap.order);
			if (beforeRps.length === 0 || afterRps.length === 0) {
				allCoords.push({ x: ap.schematicX, y: ap.schematicY, order: ap.order });
				continue;
			}
			const k = `${Math.min(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)},${Math.max(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)}`;
			const o = segOffMap?.get(k);
			allCoords.push({
				x: ap.schematicX + (o?.x ?? 0),
				y: ap.schematicY + (o?.y ?? 0),
				order: ap.order
			});
		}
		allCoords.sort((a, b) => a.order - b.order);

		if (allCoords.length > 1) {
			const dash = scaleDashPattern(line.dashPattern, line.strokeWidth ?? LINE_WIDTH);
			const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
			svg += `<path d="${createOctilinearPath(allCoords)}" fill="none" stroke="${line.color}" stroke-width="${line.strokeWidth ?? LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>\n`;
		}
	}

	return svg;
}

export function renderStations(data: ExportData, isGlobal: boolean): string {
	const hiddenStations = new Set(data.hiddenStationIds);
	const hiddenLines = new Set(data.hiddenLineIds);
	let svg = '';

	for (const station of data.stations) {
		if (hiddenStations.has(station.id!)) continue;
		const pos = stationPos(station, data.viewStations, isGlobal);
		const { visibleLineIds, hiddenLineIds: hiddenIds } = lineNamesForStation(
			station.id!,
			data,
			hiddenLines
		);

		const isInterchange = visibleLineIds.length > 1;
		const hasHiddenLines = hiddenIds.length > 0;
		let circleColor = 'white',
			strokeColor = '#999',
			strokeWidth = 2,
			radius = POINT_RADIUS;

		if (visibleLineIds.length === 1 && !hasHiddenLines) {
			const line = data.lines.find((l) => l.id === visibleLineIds[0]);
			circleColor = line?.color ?? 'white';
			strokeColor = 'white';
		} else if (isInterchange || hasHiddenLines) {
			circleColor = 'white';
			strokeColor = '#666';
			strokeWidth = 2.5;
			radius = POINT_RADIUS + 2;
		}

		svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${circleColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;
		svg += renderStationLabel(station, data, pos, isGlobal);
	}

	return svg;
}

function renderStationLabel(
	station: Station,
	data: ExportData,
	pos: { x: number; y: number },
	isGlobal: boolean
): string {
	const labelAnchor = stationLabelAnchor(station, data.viewStations, isGlobal);
	const labelDir = stationLabelDir(station, data.viewStations, isGlobal);
	const anchorDx = stationAnchorDx(station, data.viewStations, isGlobal);
	const anchorDy = stationAnchorDy(station, data.viewStations, isGlobal);
	const subAlign = stationSubAlign(station, data.viewStations, isGlobal);

	const dCfg = DIR_CFG[labelDir] ?? DIR_CFG.E;
	const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y);

	const hiddenLines = new Set(data.hiddenLineIds);
	const { hiddenLineIds: rawHiddenIds } = lineNamesForStation(station.id!, data, hiddenLines);
	const excludedIds = getHiddenInterchangeLineIdsForStation(
		station.id!,
		data.viewStations,
		isGlobal
	);
	const excludedSet = new Set(excludedIds);
	const badgeCount = rawHiddenIds.filter((id) => !excludedSet.has(id)).length;

	const hasSubtitle = !!station.subtitle;
	const titleFontSize = hasSubtitle ? 11 : 12;
	const subFontSize = 9;

	const name = escapeXml(station.name);
	const subtitle = station.subtitle ? escapeXml(station.subtitle) : '';
	const titleW =
		measureText(station.name, titleFontSize, true) || station.name.length * titleFontSize * 0.58;
	const subW = station.subtitle
		? measureText(station.subtitle, subFontSize) || station.subtitle.length * subFontSize * 0.58
		: 0;

	let centeringOffset = 0;
	if (badgeCount > 0) {
		const badgeMode = getInterchangeBadgeModeForStation(station.id!, data.viewStations, isGlobal);
		const badgeDirection = getInterchangeBadgeDirectionForStation(
			station.id!,
			data.viewStations,
			isGlobal
		);
		const bl = getBadgeLayout(
			badgeMode,
			badgeDirection,
			pos.x,
			pos.y,
			labelDir,
			layout,
			badgeCount,
			titleW,
			dCfg.anchor
		);
		centeringOffset = bl.centeringOffset;
	}

	const titleX =
		dCfg.anchor === 'end'
			? layout.x - titleW
			: dCfg.anchor === 'middle'
				? layout.x - titleW / 2
				: layout.x;
	const adjustedTitleX = titleX + centeringOffset;
	const subX =
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
							: layout.x;
	const adjustedSubX = subX + centeringOffset;

	const rotation = dCfg.rotation
		? ` transform="rotate(${dCfg.rotation}, ${layout.x}, ${layout.y})"`
		: '';

	let txt = `<g${rotation}>\n<text x="${adjustedTitleX}" y="${layout.y}" font-size="${titleFontSize}" font-family="sans-serif" font-weight="bold" fill="#000" text-anchor="start">${name}</text>\n`;
	if (hasSubtitle) {
		txt += `<text x="${adjustedSubX}" y="${layout.subtitleY}" font-size="${subFontSize}" font-family="sans-serif" fill="#666" text-anchor="start">${subtitle}</text>\n`;
	}
	txt += `</g>\n`;
	return txt;
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

function renderHiddenLineBadges(
	data: ExportData,
	hiddenLineIds: number[],
	startX: number,
	startY: number,
	horizontal: boolean = true
): string {
	let svg = '';

	for (let i = 0; i < hiddenLineIds.length; i++) {
		const lid = hiddenLineIds[i];
		const line = data.lines.find((l) => l.id === lid);
		if (!line) continue;
		const tt = getTransitType(line, data);
		const shape = tt?.iconShape ?? 'square';
		const textColor = getContrastColor(line.color);

		const cx = horizontal
			? startX + i * (BADGE_SIZE + BADGE_GAP) + BADGE_SIZE / 2
			: startX + BADGE_SIZE / 2;
		const cy = horizontal
			? startY + BADGE_SIZE / 2
			: startY + i * (BADGE_SIZE + BADGE_GAP) + BADGE_SIZE / 2;
		svg += shapeSvg(shape, BADGE_SIZE, line.color, textColor, line.name, cx, cy);
		svg += '\n';
	}

	return svg;
}

export function renderInterchanges(data: ExportData, isGlobal: boolean): string {
	const hiddenStations = new Set(data.hiddenStationIds);
	const hiddenLines = new Set(data.hiddenLineIds);
	let svg = '';

	for (const station of data.stations) {
		if (hiddenStations.has(station.id!)) continue;
		const pos = stationPos(station, data.viewStations, isGlobal);
		const { hiddenLineIds: rawHiddenIds } = lineNamesForStation(station.id!, data, hiddenLines);

		const excludedInterchangeIds = getHiddenInterchangeLineIdsForStation(
			station.id!,
			data.viewStations,
			isGlobal
		);
		const excludedSet = new Set(excludedInterchangeIds);
		const hiddenIds = rawHiddenIds
			.filter((id) => !excludedSet.has(id))
			.sort((a, b) => {
				const la = data.lines.find((l) => l.id === a);
				const lb = data.lines.find((l) => l.id === b);
				if (!la || !lb) return a - b;
				if (la.transitTypeId !== lb.transitTypeId)
					return (la.transitTypeId ?? -1) - (lb.transitTypeId ?? -1);
				return (la.name ?? '').localeCompare(lb.name ?? '');
			});

		if (hiddenIds.length === 0) continue;

		const badgeMode = getInterchangeBadgeModeForStation(station.id!, data.viewStations, isGlobal);
		const badgeDirection = getInterchangeBadgeDirectionForStation(
			station.id!,
			data.viewStations,
			isGlobal
		);
		const labelAnchor = stationLabelAnchor(station, data.viewStations, isGlobal);
		const anchorDx = stationAnchorDx(station, data.viewStations, isGlobal);
		const anchorDy = stationAnchorDy(station, data.viewStations, isGlobal);
		const labelDir = stationLabelDir(station, data.viewStations, isGlobal);

		const baseLayout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y);
		const titleW = measureText(station.name, 12, true) || station.name.length * 12 * 0.58;
		const badgeDirCfg = DIR_CFG[labelDir] ?? DIR_CFG.E;

		const layout = getBadgeLayout(
			badgeMode,
			badgeDirection,
			pos.x,
			pos.y,
			labelDir,
			baseLayout,
			hiddenIds.length,
			titleW,
			badgeDirCfg.anchor
		);

		svg += renderHiddenLineBadges(data, hiddenIds, layout.startX, layout.startY, layout.horizontal);
	}

	return svg;
}

export function getTransitType(line: Line, data: ExportData): TransitType | undefined {
	return data.transitTypes.find((t) => t.id === line.transitTypeId);
}

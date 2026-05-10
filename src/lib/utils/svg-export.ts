import type {
	Project,
	Line,
	Station,
	RoutePoint,
	AnchorPoint,
	TransitType,
	ViewStation,
	InterchangeBadgeMode,
	InterchangeBadgeDirection
} from '$lib/types/models';
import { createOctilinearPath, scaleDashPattern, getLabelLayout } from './schematic';
import { getContrastColor } from './color';
import { POINT_RADIUS, LINE_WIDTH, LINE_SPACING, DIR_CFG } from '$lib/constants/schematic';
import { measureText } from './textMeasure';

const BADGE_SIZE = 20;
const BADGE_GAP = 3;
const BADGE_GAP_FROM_ANCHOR = 20;
const LABEL_BADGE_GAP = 4;
const STACK_BADGE_GAP = 12;
const TEXT_CENTER_OFFSET = -4;

function getViewStationForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): ViewStation | null {
	if (isGlobal) return null;
	return viewStations.find((vs) => vs.stationId === stationId) ?? null;
}

function getInterchangeBadgeModeForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): InterchangeBadgeMode {
	const vs = getViewStationForStation(stationId, viewStations, isGlobal);
	return vs?.interchangeBadgeMode ?? 'station';
}

function getInterchangeBadgeDirectionForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): InterchangeBadgeDirection {
	const vs = getViewStationForStation(stationId, viewStations, isGlobal);
	return vs?.interchangeBadgeDirection ?? 'S';
}

function getHiddenInterchangeLineIdsForStation(
	stationId: number,
	viewStations: ViewStation[],
	isGlobal: boolean
): number[] {
	const vs = getViewStationForStation(stationId, viewStations, isGlobal);
	return vs?.hiddenInterchangeLineIds ?? [];
}

interface BadgeLayout {
	startX: number;
	startY: number;
	horizontal: boolean;
	centeringOffset: number;
}

function getBadgeLayout(
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

export interface ExportData {
	project: Project;
	lines: Line[];
	stations: Station[];
	routePoints: RoutePoint[];
	anchorPoints: AnchorPoint[];
	transitTypes: TransitType[];
	viewStations: ViewStation[];
	hiddenLineIds: number[];
	hiddenStationIds: number[];
}

export interface ExportOptions {
	showLegend: boolean;
}

interface Bounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

function stationPos(
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

function stationLabelDir(station: Station, viewStations: ViewStation[], isGlobal: boolean): string {
	if (isGlobal) return station.labelDirection ?? 'E';
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.labelDirection ?? station.labelDirection ?? 'E';
}

function stationLabelAnchor(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): string {
	if (isGlobal) return station.labelAnchor ?? 'E';
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.labelAnchor ?? station.labelAnchor ?? 'E';
}

function stationSubAlign(
	station: Station,
	viewStations: ViewStation[],
	isGlobal: boolean
): string | undefined {
	if (isGlobal) return station.subtitleAlign;
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.subtitleAlign ?? station.subtitleAlign;
}

function stationAnchorDx(station: Station, viewStations: ViewStation[], isGlobal: boolean): number {
	if (isGlobal) return station.anchorDx ?? 14;
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.anchorDx ?? station.anchorDx ?? 14;
}

function stationAnchorDy(station: Station, viewStations: ViewStation[], isGlobal: boolean): number {
	if (isGlobal) return station.anchorDy ?? 14;
	const vs = viewStations.find((v) => v.stationId === station.id);
	return vs?.anchorDy ?? station.anchorDy ?? 14;
}

function getStationLabelExtent(
	station: Station,
	data: ExportData,
	isGlobal: boolean
): { minX: number; minY: number; maxX: number; maxY: number } | null {
	const hiddenStations = new Set(data.hiddenStationIds);
	if (hiddenStations.has(station.id!)) return null;

	const pos = stationPos(station, data.viewStations, isGlobal);
	const labelDir = stationLabelDir(station, data.viewStations, isGlobal);
	const labelAnchor = stationLabelAnchor(station, data.viewStations, isGlobal);
	const anchorDx = stationAnchorDx(station, data.viewStations, isGlobal);
	const anchorDy = stationAnchorDy(station, data.viewStations, isGlobal);
	const dCfg = DIR_CFG[labelDir] ?? DIR_CFG.E;
	const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y);

	const hasSubtitle = !!station.subtitle;
	const titleFontSize = hasSubtitle ? 11 : 12;
	const subFontSize = 9;
	const titleW =
		measureText(station.name, titleFontSize, true) || station.name.length * titleFontSize * 0.58;
	const subW = station.subtitle
		? measureText(station.subtitle, subFontSize) || station.subtitle.length * subFontSize * 0.58
		: 0;
	const maxTextW = Math.max(titleW, subW);
	const textH = titleFontSize + (hasSubtitle ? subFontSize + 4 : 0);

	const hiddenLines = new Set(data.hiddenLineIds);
	const { hiddenLineIds } = lineNamesForStation(station.id!, data, hiddenLines);
	const nBadges = hiddenLineIds.length;

	let actualBadgeCount = nBadges;

	let textL: number, textR: number, textT: number, textB: number;
	switch (dCfg.anchor) {
		case 'start':
			textL = layout.x;
			textR = layout.x + maxTextW;
			break;
		case 'end':
			textL = layout.x - maxTextW;
			textR = layout.x;
			break;
		default:
			textL = layout.x - maxTextW / 2;
			textR = layout.x + maxTextW / 2;
			break;
	}
	textT = layout.y - titleFontSize;
	textB = layout.y + (hasSubtitle ? subFontSize + 4 : 2);

	if (dCfg.rotation) {
		const theta = (dCfg.rotation * Math.PI) / 180;
		const cosT = Math.abs(Math.cos(theta));
		const sinT = Math.abs(Math.sin(theta));
		const cx = layout.x;
		const cy = layout.y;
		const dx = maxTextW / 2;
		const dy = textH / 2;
		const rx = dx * cosT + dy * sinT;
		const ry = dx * sinT + dy * cosT;
		if (dCfg.anchor === 'start') {
			textL = cx;
			textR = cx + rx * 2;
		} else if (dCfg.anchor === 'end') {
			textL = cx - rx * 2;
			textR = cx;
		} else {
			textL = cx - rx;
			textR = cx + rx;
		}
		textT = cy - ry;
		textB = cy + ry;
	}

	let minX = textL;
	let maxX = textR;
	let minY = textT;
	let maxY = textB;

	if (nBadges > 0) {
		const excludedIds = getHiddenInterchangeLineIdsForStation(
			station.id!,
			data.viewStations,
			isGlobal
		);
		const excludedSet = new Set(excludedIds);
		const badgeMode = getInterchangeBadgeModeForStation(station.id!, data.viewStations, isGlobal);
		const labelDir = stationLabelDir(station, data.viewStations, isGlobal);
		const badgeDirection = getInterchangeBadgeDirectionForStation(
			station.id!,
			data.viewStations,
			isGlobal
		);

		const badgeLayout = getBadgeLayout(
			badgeMode,
			badgeDirection,
			pos.x,
			pos.y,
			labelDir,
			layout,
			actualBadgeCount,
			maxTextW,
			dCfg.anchor
		);

		if (badgeLayout.centeringOffset) {
			textL += badgeLayout.centeringOffset;
			textR += badgeLayout.centeringOffset;
			minX += badgeLayout.centeringOffset;
			maxX += badgeLayout.centeringOffset;
		}

		let bminX: number, bmaxX: number, bminY: number, bmaxY: number;
		if (badgeLayout.horizontal) {
			const totalW = actualBadgeCount * BADGE_SIZE + (actualBadgeCount - 1) * BADGE_GAP;
			bminX = badgeLayout.startX;
			bmaxX = badgeLayout.startX + totalW;
			bminY = badgeLayout.startY;
			bmaxY = badgeLayout.startY + BADGE_SIZE;
		} else {
			const totalH = actualBadgeCount * BADGE_SIZE + (actualBadgeCount - 1) * BADGE_GAP;
			bminX = badgeLayout.startX;
			bmaxX = badgeLayout.startX + BADGE_SIZE;
			bminY = badgeLayout.startY;
			bmaxY = badgeLayout.startY + totalH;
		}
		minX = Math.min(minX, bminX);
		maxX = Math.max(maxX, bmaxX);
		minY = Math.min(minY, bminY);
		maxY = Math.max(maxY, bmaxY);
	}

	return { minX, minY, maxX, maxY };
}

function getContentBounds(data: ExportData, isGlobal: boolean): Bounds {
	const hiddenStations = new Set(data.hiddenStationIds);
	const hiddenLines = new Set(data.hiddenLineIds);
	const pts: { x: number; y: number }[] = [];

	for (const st of data.stations) {
		if (hiddenStations.has(st.id!)) continue;
		pts.push(stationPos(st, data.viewStations, isGlobal));
	}
	for (const ap of data.anchorPoints) {
		if (ap.lineId && hiddenLines.has(ap.lineId)) continue;
		pts.push({ x: ap.schematicX, y: ap.schematicY });
	}

	if (pts.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

	let minX = Math.min(...pts.map((p) => p.x));
	let maxX = Math.max(...pts.map((p) => p.x));
	let minY = Math.min(...pts.map((p) => p.y));
	let maxY = Math.max(...pts.map((p) => p.y));

	for (const st of data.stations) {
		if (hiddenStations.has(st.id!)) continue;
		const ext = getStationLabelExtent(st, data, isGlobal);
		if (ext) {
			minX = Math.min(minX, ext.minX);
			maxX = Math.max(maxX, ext.maxX);
			minY = Math.min(minY, ext.minY);
			maxY = Math.max(maxY, ext.maxY);
		}
	}

	const padding = 60;
	return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
}

function buildLineOffsets(
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

export function getTransitType(line: Line, data: ExportData): TransitType | undefined {
	return data.transitTypes.find((t) => t.id === line.transitTypeId);
}

export function getContrastTextColor(hex: string): '#fff' | '#000' {
	return getContrastColor(hex);
}

export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

interface LegendLineEntry {
	line: Line;
	transitType: TransitType | undefined;
	textColor: '#fff' | '#000';
	terminusA: string;
	terminusB: string;
}

export function getLegendEntries(data: ExportData): LegendLineEntry[] {
	const hiddenLines = new Set(data.hiddenLineIds);
	return data.lines
		.filter((l) => l.id && !hiddenLines.has(l.id))
		.map((line) => {
			const tt = getTransitType(line, data);
			const textColor = getContrastColor(line.color);
			const rps = data.routePoints
				.filter((rp) => rp.lineId === line.id)
				.sort((a, b) => a.order - b.order);
			const firstSt = rps.length > 0 ? data.stations.find((s) => s.id === rps[0].stationId) : null;
			const lastSt =
				rps.length > 0 ? data.stations.find((s) => s.id === rps[rps.length - 1].stationId) : null;
			return {
				line,
				transitType: tt,
				textColor,
				terminusA: firstSt?.name ?? '???',
				terminusB: lastSt?.name ?? '???'
			};
		});
}

function shapeSvg(
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

function renderLines(
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

function renderStations(data: ExportData, isGlobal: boolean): string {
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

function renderInterchanges(data: ExportData, isGlobal: boolean): string {
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

function getInterchangeHiddenLineIds(data: ExportData): Set<number> {
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

function getLegendDimensions(data: ExportData): { width: number } | null {
	const hiddenLines = new Set(data.hiddenLineIds);
	const visibleLines = data.lines.filter((l) => l.id && !hiddenLines.has(l.id));
	if (visibleLines.length === 0) return null;

	const hiddenInterchangeLines = data.lines.filter(
		(l) => l.id && getInterchangeHiddenLineIds(data).has(l.id)
	);
	const allLegendLines = [...visibleLines, ...hiddenInterchangeLines];

	const termFontSize = 13;
	let maxTermChars = 0;
	for (const line of allLegendLines) {
		const rps = data.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order);
		const firstSt = rps.length > 0 ? data.stations.find((s) => s.id === rps[0].stationId) : null;
		const lastSt =
			rps.length > 0 ? data.stations.find((s) => s.id === rps[rps.length - 1].stationId) : null;
		const termA = firstSt?.name ?? '';
		const termB = lastSt?.name ?? '';
		maxTermChars = Math.max(maxTermChars, termA.length, termB.length);
	}

	const pad = 16;
	const badgeSize = 30;
	const gap = 8;
	const termW = maxTermChars * termFontSize * 0.58;
	return {
		width: Math.max(200, pad + badgeSize + gap + termW + pad)
	};
}

function renderLegend(
	data: ExportData,
	lx: number,
	ly: number,
	legendWidth: number,
	legendHeight: number
): string {
	const hiddenLines = new Set(data.hiddenLineIds);
	const visibleLines = data.lines.filter((l) => l.id && !hiddenLines.has(l.id));
	if (visibleLines.length === 0) return '';

	const hiddenInterchangeIds = getInterchangeHiddenLineIds(data);
	const hiddenInterchangeLines = data.lines.filter((l) => l.id && hiddenInterchangeIds.has(l.id));
	const allLegendLines = [...visibleLines, ...hiddenInterchangeLines].sort((a, b) => {
		if ((a.transitTypeId ?? -1) !== (b.transitTypeId ?? -1))
			return (a.transitTypeId ?? -1) - (b.transitTypeId ?? -1);
		return (a.name ?? '').localeCompare(b.name ?? '');
	});

	const pad = 16;
	const badgeSize = 30;
	const termFontSize = 13;
	const entryBase = 40;

	let y = ly + pad;
	let svg = `<g id="legend">\n`;
	svg += `<rect x="${lx}" y="${ly}" width="${legendWidth}" height="${legendHeight}" fill="#f4f4f4" stroke="#bbb" stroke-width="1"/>\n`;

	for (const line of allLegendLines) {
		const tt = getTransitType(line, data);
		const shape = tt?.iconShape ?? 'square';
		const textColor = getContrastColor(line.color);
		const cx = lx + pad + badgeSize / 2;
		const cy = y + entryBase / 2;

		svg += shapeSvg(shape, badgeSize, line.color, textColor, line.name, cx, cy);
		svg += '\n';

		const rps = data.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order);
		const firstSt = rps.length > 0 ? data.stations.find((s) => s.id === rps[0].stationId) : null;
		const lastSt =
			rps.length > 0 ? data.stations.find((s) => s.id === rps[rps.length - 1].stationId) : null;
		const termX = lx + pad + badgeSize + 8;
		const termA = firstSt ? escapeXml(firstSt.name) : '???';
		svg += `<text x="${termX}" y="${y + 15}" font-size="${termFontSize}" font-family="sans-serif" fill="#555">${termA}</text>\n`;
		const termB = lastSt ? escapeXml(lastSt.name) : '???';
		svg += `<text x="${termX}" y="${y + 31}" font-size="${termFontSize}" font-family="sans-serif" fill="#555">${termB}</text>\n`;

		y += entryBase;
	}

	svg += `</g>\n`;
	return svg;
}

function extendBoundsForLegend(
	data: ExportData,
	mapBounds: Bounds
): {
	bounds: Bounds;
	legendX: number;
	legendY: number;
	legendWidth: number;
	legendHeight: number;
} | null {
	const dim = getLegendDimensions(data);
	if (!dim) return null;

	const gap = 20;
	const mapH = mapBounds.maxY - mapBounds.minY;
	const legendWidth = dim.width;
	const legendHeight = mapH;
	const bounds: Bounds = {
		minX: mapBounds.minX,
		minY: mapBounds.minY,
		maxX: mapBounds.maxX + gap + legendWidth,
		maxY: mapBounds.maxY
	};
	return {
		bounds,
		legendX: mapBounds.maxX + gap,
		legendY: mapBounds.minY,
		legendWidth,
		legendHeight
	};
}

export function generateExportSvg(
	data: ExportData,
	options: ExportOptions,
	isGlobal: boolean
): string {
	const mapBounds = getContentBounds(data, isGlobal);
	const lineOffsets = buildLineOffsets(data, isGlobal);

	let legendExt = options.showLegend ? extendBoundsForLegend(data, mapBounds) : null;
	const bounds = legendExt ? legendExt.bounds : mapBounds;

	const cw = bounds.maxX - bounds.minX;
	const ch = bounds.maxY - bounds.minY;

	const aspectRatio = Math.max(cw, 200) / Math.max(ch, 200);
	let svgWidth = 1200;
	let svgHeight = Math.round(svgWidth / aspectRatio);
	if (svgHeight > 900) {
		svgHeight = 900;
		svgWidth = Math.round(svgHeight * aspectRatio);
	}

	let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
	svg += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${bounds.minX} ${bounds.minY} ${cw} ${ch}" width="${svgWidth}" height="${svgHeight}">\n`;

	svg += `<rect x="${bounds.minX}" y="${bounds.minY}" width="${cw}" height="${ch}" fill="#f8f8f8"/>\n`;
	svg += `<g id="lines">\n${renderLines(data, isGlobal, lineOffsets)}</g>\n`;
	svg += `<g id="stations">\n${renderStations(data, isGlobal)}</g>\n`;

	if (legendExt) {
		svg += renderLegend(
			data,
			legendExt.legendX,
			legendExt.legendY,
			legendExt.legendWidth,
			legendExt.legendHeight
		);
	}

	svg += `<g id="interchanges">\n${renderInterchanges(data, isGlobal)}</g>\n`;
	svg += `</svg>`;
	return svg;
}

export function buildExportSvgForPreview(
	data: ExportData,
	options: ExportOptions,
	isGlobal: boolean
): string {
	const mapBounds = getContentBounds(data, isGlobal);
	const lineOffsets = buildLineOffsets(data, isGlobal);

	const legendExt = options.showLegend ? extendBoundsForLegend(data, mapBounds) : null;
	const bounds = legendExt ? legendExt.bounds : mapBounds;

	const cw = bounds.maxX - bounds.minX;
	const ch = bounds.maxY - bounds.minY;

	let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${cw} ${ch}" style="width:100%;height:100%">\n`;

	svg += `<rect x="${bounds.minX}" y="${bounds.minY}" width="${cw}" height="${ch}" fill="#f8f8f8"/>\n`;
	svg += `<g id="lines">\n${renderLines(data, isGlobal, lineOffsets)}</g>\n`;
	svg += `<g id="stations">\n${renderStations(data, isGlobal)}</g>\n`;

	if (legendExt) {
		svg += renderLegend(
			data,
			legendExt.legendX,
			legendExt.legendY,
			legendExt.legendWidth,
			legendExt.legendHeight
		);
	}

	svg += `<g id="interchanges">\n${renderInterchanges(data, isGlobal)}</g>\n`;
	svg += `</svg>`;
	return svg;
}

import type { Station } from '$lib/types';
import type { ExportData } from './types';
import { DIR_CFG } from '$lib/constants/schematic';
import { getLabelLayout } from '../schematic';
import { measureText } from '../textMeasure';
import {
	stationPos,
	stationLabelDir,
	stationLabelAnchor,
	stationAnchorDx,
	stationAnchorDy,
	getBadgeLayout,
	getInterchangeBadgeModeForStation,
	getInterchangeBadgeDirectionForStation,
	BADGE_SIZE,
	BADGE_GAP
} from './renderers';
import { getLegendDimensions } from './legend';

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
	const { hiddenLineIds: hids } = lineNamesForStation(station.id!, data, hiddenLines);
	const nBadges = hids.length;

	const actualBadgeCount = nBadges;

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
		const badgeMode = getInterchangeBadgeModeForStation(station.id!, data.viewStations, isGlobal);
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

export function getContentBounds(
	data: ExportData,
	isGlobal: boolean
): { minX: number; minY: number; maxX: number; maxY: number } {
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

export function extendBoundsForLegend(
	data: ExportData,
	mapBounds: { minX: number; minY: number; maxX: number; maxY: number }
): {
	bounds: { minX: number; minY: number; maxX: number; maxY: number };
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
	const bounds = {
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

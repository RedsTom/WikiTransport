import type { Line, TransitType } from '$lib/types';
import type { ExportData } from './types';
import { getContrastColor } from '../color';
import { escapeXml, getTransitType, getInterchangeHiddenLineIds, shapeSvg } from './renderers';

export interface LegendLineEntry {
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

export function getLegendDimensions(data: ExportData): { width: number } | null {
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

export function renderLegend(
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

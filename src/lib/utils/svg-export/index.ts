export type { ExportData, ExportOptions } from './types';
export type { BadgeLayout } from './renderers';
export {
	getBadgeLayout,
	getTransitType,
	escapeXml,
	buildLineOffsets,
	renderLines,
	renderStations,
	renderInterchanges,
	getInterchangeHiddenLineIds
} from './renderers';
export { getContentBounds, extendBoundsForLegend } from './bounds';
export { getLegendEntries, renderLegend, getLegendDimensions } from './legend';

import { getContentBounds, extendBoundsForLegend } from './bounds';
import { buildLineOffsets, renderLines, renderStations, renderInterchanges } from './renderers';
import { renderLegend } from './legend';
import type { ExportData, ExportOptions } from './types';

function buildSvg(
	data: ExportData,
	options: ExportOptions,
	isGlobal: boolean,
	preview: boolean
): string {
	const mapBounds = getContentBounds(data, isGlobal);
	const lineOffsets = buildLineOffsets(data, isGlobal);

	const legendExt = options.showLegend ? extendBoundsForLegend(data, mapBounds) : null;
	const bounds = legendExt ? legendExt.bounds : mapBounds;

	const cw = bounds.maxX - bounds.minX;
	const ch = bounds.maxY - bounds.minY;

	if (preview) {
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

export function generateExportSvg(
	data: ExportData,
	options: ExportOptions,
	isGlobal: boolean
): string {
	return buildSvg(data, options, isGlobal, false);
}

export function buildExportSvgForPreview(
	data: ExportData,
	options: ExportOptions,
	isGlobal: boolean
): string {
	return buildSvg(data, options, isGlobal, true);
}

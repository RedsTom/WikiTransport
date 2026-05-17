export type { ExportData, ExportOptions } from './types';
export type { BadgeLayout } from './renderers';
export {
	getBadgeLayout,
	getTransitType,
	stationPos,
	stationLabelDir,
	stationLabelAnchor,
	stationSubAlign,
	stationAnchorDx,
	stationAnchorDy,
	getInterchangeHiddenLineIds,
	getHiddenInterchangeLineIdsForStation,
	getInterchangeBadgeModeForStation,
	getInterchangeBadgeDirectionForStation,
	buildRenderingData,
	BADGE_SIZE,
	BADGE_GAP,
	LABEL_BADGE_GAP,
	STACK_BADGE_GAP,
	TEXT_CENTER_OFFSET
} from './renderers';
export { getContentBounds, extendBoundsForLegend } from './bounds';
export { getLegendEntries, getLegendDimensions } from './legend';

import { mount, unmount } from 'svelte';
import ExportSvg from '$lib/components/export/ExportSvg.svelte';
import { getContentBounds, extendBoundsForLegend } from './bounds';
import { buildRenderingData } from './renderers';
import type { ExportData, ExportOptions } from './types';

function buildSvg(
	data: ExportData,
	options: ExportOptions,
	isGlobal: boolean,
	preview: boolean
): string {
	const mapBounds = getContentBounds(data, isGlobal);
	const renderingData = buildRenderingData(data, isGlobal);

	const legendExt = options.showLegend ? extendBoundsForLegend(data, mapBounds) : null;
	const bounds = legendExt ? legendExt.bounds : mapBounds;

	const target = document.createElement('div');
	target.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
	document.body.appendChild(target);

	const component = mount(ExportSvg, {
		target,
		props: { data, isGlobal, bounds, legendExt, preview, renderingData }
	});

	const svgEl = target.querySelector('svg');
	let result = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';

	if (!preview && result) {
		result = `<?xml version="1.0" encoding="UTF-8"?>\n${result}`;
	}

	unmount(component);
	target.remove();
	return result;
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

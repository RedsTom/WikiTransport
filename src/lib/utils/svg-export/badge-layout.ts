import type { InterchangeBadgeMode, InterchangeBadgeDirection } from '$lib/types';

export const BADGE_SIZE = 20;
export const BADGE_GAP = 3;
export const BADGE_GAP_FROM_ANCHOR = 20;
export const LABEL_BADGE_GAP = 4;
export const STACK_BADGE_GAP = 12;
export const TEXT_CENTER_OFFSET = -4;

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

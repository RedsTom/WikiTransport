export const GRID_SIZE = 40;
export const POINT_RADIUS = 8;
export const LINE_WIDTH = 6;
export const LINE_SPACING = 12;
export const ANCHOR_DX_DEFAULT = 14;
export const ANCHOR_DY_DEFAULT = 14;

export const DIR_CFG: Record<string, { anchor: string; rotation: number }> = {
	N: { anchor: 'middle', rotation: 0 },
	NE: { anchor: 'start', rotation: -45 },
	E: { anchor: 'start', rotation: 0 },
	SE: { anchor: 'start', rotation: 45 },
	S: { anchor: 'middle', rotation: 0 },
	SW: { anchor: 'end', rotation: -45 },
	W: { anchor: 'end', rotation: 0 },
	NW: { anchor: 'end', rotation: 45 }
};

export const DIR_ARROWS: Record<string, string> = {
	N: 'arrow_upward',
	NE: 'north_east',
	E: 'arrow_forward',
	SE: 'south_east',
	S: 'arrow_downward',
	SW: 'south_west',
	W: 'arrow_back',
	NW: 'north_west'
};

export const ANCHOR_ICONS: Record<string, string> = {
	N: 'vertical_align_top',
	NE: 'north_east',
	E: 'align_horizontal_right',
	SE: 'south_east',
	S: 'vertical_align_bottom',
	SW: 'south_west',
	W: 'align_horizontal_left',
	NW: 'north_west'
};

export const DASH_PATTERNS = [
	{ value: '', label: 'solid' },
	{ value: '4,4', label: 'dashed_short' },
	{ value: '8,4', label: 'dashed_long' },
	{ value: '2,4', label: 'dotted' },
	{ value: '8,4,2,4', label: 'dash_dot' }
] as const;

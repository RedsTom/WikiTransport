import type {
	Project,
	Line,
	Station,
	RoutePoint,
	AnchorPoint,
	TransitType,
	ViewStation
} from '$lib/types';

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
	tunnelOrder?: Record<string, number[]>;
}

export interface ExportOptions {
	showLegend: boolean;
}

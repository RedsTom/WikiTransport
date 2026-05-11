import type { InterchangeBadgeMode, InterchangeBadgeDirection } from './interchange';

export interface View {
	id?: number;
	projectId: number;
	name: string;
	hiddenLineIds: number[];
	hiddenStationIds: number[];
}

export interface ViewStation {
	id?: number;
	viewId: number;
	stationId: number;
	schematicX: number;
	schematicY: number;
	labelDirection?: string;
	labelAnchor?: string;
	subtitleAlign?: string;
	anchorDx?: number;
	anchorDy?: number;
	interchangeBadgeMode?: InterchangeBadgeMode;
	interchangeBadgeDirection?: InterchangeBadgeDirection;
	hiddenInterchangeLineIds?: number[];
}

export interface Project {
	id?: number;
	name: string;
	city: string;
	centerLat: number;
	centerLng: number;
	zoom: number;
	updatedAt: Date;
}

export type IconShape = 'circle' | 'square' | 'diamond' | 'pill';

export interface TransitType {
	id?: number;
	projectId: number;
	name: string;
	iconShape: IconShape;
	icon?: string;
}

export interface Line {
	id?: number;
	projectId: number;
	name: string;
	transitTypeId: number;
	color: string;
	zIndex: number;
	strokeWidth?: number;
	dashPattern?: string;
}

export interface Station {
	id?: number;
	projectId: number;
	name: string;
	subtitle?: string;
	geoLat: number;
	geoLng: number;
	schematicX: number;
	schematicY: number;
	labelDirection?: string;
	labelAnchor?: string;
	subtitleAlign?: string;
	anchorDx?: number;
	anchorDy?: number;
}

export type Direction = 'both' | 'one_way_forward' | 'one_way_backward';

export interface RoutePoint {
	id?: number;
	lineId: number;
	stationId: number;
	order: number;
	direction: Direction;
}

export interface AnchorPoint {
	id?: number;
	lineId: number;
	schematicX: number;
	schematicY: number;
	order: number;
	viewId?: number;
}

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
}

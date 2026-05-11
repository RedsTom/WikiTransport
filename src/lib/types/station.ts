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

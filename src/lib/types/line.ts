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

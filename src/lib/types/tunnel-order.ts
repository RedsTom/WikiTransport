export interface TunnelOrderEntry {
	id?: number;
	projectId: number;
	viewId?: number;
	tunnelKey: string;
	lineIds: number[];
}

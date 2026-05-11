export type Direction = 'both' | 'one_way_forward' | 'one_way_backward';

export interface RoutePoint {
	id?: number;
	lineId: number;
	stationId: number;
	order: number;
	direction: Direction;
}

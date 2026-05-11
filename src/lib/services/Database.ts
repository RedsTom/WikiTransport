import Dexie, { type Table } from 'dexie';
import type {
	Project,
	TransitType,
	Line,
	Station,
	RoutePoint,
	AnchorPoint,
	View,
	ViewStation
} from '../types';

export class TransitDatabase extends Dexie {
	projects!: Table<Project, number>;
	transitTypes!: Table<TransitType, number>;
	lines!: Table<Line, number>;
	stations!: Table<Station, number>;
	routePoints!: Table<RoutePoint, number>;
	anchorPoints!: Table<AnchorPoint, number>;
	views!: Table<View, number>;
	viewStations!: Table<ViewStation, number>;

	constructor() {
		super('TransitDB');

		this.version(5).stores({
			projects: '++id, name, updatedAt',
			transitTypes: '++id, projectId',
			lines: '++id, projectId, transitTypeId, zIndex',
			stations: '++id, projectId, name',
			routePoints: '++id, lineId, stationId, order',
			anchorPoints: '++id, lineId, order, viewId',
			views: '++id, projectId',
			viewStations: '++id, viewId, stationId'
		});
	}
}

export const db = new TransitDatabase();

import { db } from './Database';
import type { Station, RoutePoint } from '../types';

export class StationService {
	static async getStations(projectId: number): Promise<Station[]> {
		return await db.stations.where({ projectId }).toArray();
	}

	static async createStation(
		projectId: number,
		name: string = 'New Station',
		geoLat: number = 0,
		geoLng: number = 0,
		schematicX: number = 0,
		schematicY: number = 0
	): Promise<number> {
		const newStation: Station = {
			projectId,
			name,
			geoLat,
			geoLng,
			schematicX,
			schematicY
		};
		return (await db.stations.add(newStation)) as number;
	}

	static async updateStation(id: number, changes: Partial<Station>): Promise<number> {
		return await db.stations.update(id, changes);
	}

	static async deleteStation(id: number): Promise<void> {
		await db.transaction('rw', db.stations, db.routePoints, async () => {
			await db.routePoints.where({ stationId: id }).delete();
			await db.stations.delete(id);
		});
	}

	// Route Points (linking lines and stations)
	static async getRoutePointsForLine(lineId: number): Promise<RoutePoint[]> {
		return await db.routePoints.where({ lineId }).sortBy('order');
	}

	static async addStationToLine(
		lineId: number,
		stationId: number,
		order: number,
		direction: 'both' | 'one_way_forward' | 'one_way_backward' = 'both'
	): Promise<number> {
		const newPoint: RoutePoint = {
			lineId,
			stationId,
			order,
			direction
		};
		return (await db.routePoints.add(newPoint)) as number;
	}
}

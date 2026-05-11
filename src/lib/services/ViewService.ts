import { db } from './Database';
import type { View } from '../types';

export class ViewService {
	static async getForProject(projectId: number): Promise<View[]> {
		return await db.views.where({ projectId }).toArray();
	}

	static async create(
		projectId: number,
		name: string,
		hiddenLineIds: number[] = [],
		hiddenStationIds: number[] = []
	): Promise<number> {
		const item: View = { projectId, name, hiddenLineIds, hiddenStationIds };
		return (await db.views.add(item)) as number;
	}

	static async update(id: number, changes: Partial<View>): Promise<number> {
		return await db.views.update(id, changes);
	}

	static async delete(id: number): Promise<void> {
		await db.viewStations.where({ viewId: id }).delete();
		await db.views.delete(id);
	}
}

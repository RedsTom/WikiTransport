import { db } from './Database';
import type { AnchorPoint } from '../types/models';

export class AnchorPointService {
	static async getForLine(lineId: number, viewId?: number): Promise<AnchorPoint[]> {
		let collection = db.anchorPoints.where({ lineId });
		if (viewId !== undefined) {
			collection = collection.filter((ap) => ap.viewId === viewId);
		} else {
			collection = collection.filter((ap) => ap.viewId === undefined || ap.viewId === null);
		}
		return await collection.sortBy('order');
	}

	static async getAllForView(viewId?: number): Promise<AnchorPoint[]> {
		if (viewId === undefined) {
			return await db.anchorPoints
				.filter((ap) => ap.viewId === undefined || ap.viewId === null)
				.toArray();
		}
		return await db.anchorPoints.where({ viewId }).toArray();
	}

	static async create(
		lineId: number,
		schematicX: number,
		schematicY: number,
		order: number,
		viewId?: number
	): Promise<number> {
		const item: AnchorPoint = { lineId, schematicX, schematicY, order };
		if (viewId !== undefined) item.viewId = viewId;
		return (await db.anchorPoints.add(item)) as number;
	}

	static async update(id: number, changes: Partial<AnchorPoint>): Promise<number> {
		return await db.anchorPoints.update(id, changes);
	}

	static async delete(id: number): Promise<void> {
		await db.anchorPoints.delete(id);
	}

	static async deleteForView(viewId: number): Promise<void> {
		await db.anchorPoints.where({ viewId }).delete();
	}
}

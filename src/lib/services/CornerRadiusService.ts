import { db } from './Database';
import type { CornerRadiusEntry } from '../types';

export class CornerRadiusService {
	static async getForView(projectId: number, viewId: number): Promise<CornerRadiusEntry[]> {
		return await db.cornerRadii.where({ projectId, viewId }).toArray();
	}

	static async getGlobal(projectId: number): Promise<CornerRadiusEntry[]> {
		return await db.cornerRadii
			.where({ projectId })
			.filter((e) => e.viewId === undefined)
			.toArray();
	}

	static async set(projectId: number, x: number, y: number, radius: number, viewId?: number) {
		const existing = await db.cornerRadii
			.where({ projectId })
			.filter((e) => e.viewId === viewId && e.x === x && e.y === y)
			.first();
		if (existing) {
			await db.cornerRadii.update(existing.id!, { radius });
		} else {
			await db.cornerRadii.add({ projectId, viewId, x, y, radius });
		}
	}

	static async remove(projectId: number, x: number, y: number, viewId?: number) {
		const existing = await db.cornerRadii
			.where({ projectId })
			.filter((e) => e.viewId === viewId && e.x === x && e.y === y)
			.first();
		if (existing) {
			await db.cornerRadii.delete(existing.id!);
		}
	}
}

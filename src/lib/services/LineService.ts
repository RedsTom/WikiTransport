import { db } from './Database';
import type { Line, Station, RoutePoint } from '../types/models';

export class LineService {
	static async getLines(projectId: number): Promise<Line[]> {
		return await db.lines.where({ projectId }).sortBy('zIndex');
	}

	static async createLine(projectId: number, transitTypeId: number, name: string): Promise<number> {
		const count = await db.lines.where({ projectId }).count();
		const newLine: Line = {
			projectId,
			name,
			transitTypeId,
			color: '#6750A4', // Default primary color
			zIndex: count
		};
		return (await db.lines.add(newLine)) as number;
	}

	static async updateLine(id: number, changes: Partial<Line>): Promise<number> {
		return await db.lines.update(id, changes);
	}

	static async deleteLine(id: number): Promise<void> {
		await db.transaction('rw', db.lines, db.routePoints, async () => {
			await db.routePoints.where({ lineId: id }).delete();
			await db.lines.delete(id);
		});
	}

	static async updateLineOrders(items: { id: number; order: number }[]): Promise<void> {
		await db.transaction('rw', db.lines, async () => {
			for (const item of items) {
				await db.lines.update(item.id, { zIndex: item.order });
			}
		});
	}
}

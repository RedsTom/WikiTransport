import { db } from './Database';
import type { TransitType } from '../types';

export class TransitTypeService {
	static async getTypes(projectId: number): Promise<TransitType[]> {
		return await db.transitTypes.where({ projectId }).toArray();
	}

	static async createType(
		projectId: number,
		name: string,
		iconShape: TransitType['iconShape'] = 'circle',
		icon?: string
	): Promise<number> {
		const newType: TransitType = {
			projectId,
			name,
			iconShape,
			icon
		};
		return (await db.transitTypes.add(newType)) as number;
	}

	static async updateType(id: number, changes: Partial<TransitType>): Promise<number> {
		return await db.transitTypes.update(id, changes);
	}

	static async deleteType(id: number): Promise<void> {
		// Do not allow deleting if lines are using it, or cascade.
		// For simplicity here, we cascade delete lines using this type.
		const linesUsingIt = await db.lines.where({ transitTypeId: id }).toArray();
		const lineIds = linesUsingIt.map((l) => l.id!);

		await db.transaction('rw', db.transitTypes, db.lines, db.routePoints, async () => {
			await db.routePoints.where('lineId').anyOf(lineIds).delete();
			await db.lines.where('transitTypeId').equals(id).delete();
			await db.transitTypes.delete(id);
		});
	}
}

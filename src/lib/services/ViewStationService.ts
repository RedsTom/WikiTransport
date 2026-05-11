import { db } from './Database';
import type { ViewStation, InterchangeBadgeMode, InterchangeBadgeDirection } from '../types';

export type ViewStationUpdate = Partial<Omit<ViewStation, 'id' | 'viewId' | 'stationId'>>;

export class ViewStationService {
	static async getForView(viewId: number): Promise<ViewStation[]> {
		return await db.viewStations.where({ viewId }).toArray();
	}

	static async updateViewStation(
		viewId: number,
		stationId: number,
		updates: ViewStationUpdate
	): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, updates);
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: updates.schematicX ?? s.schematicX,
				schematicY: updates.schematicY ?? s.schematicY,
				...updates
			} as ViewStation);
		}
	}

	static async setPosition(
		viewId: number,
		stationId: number,
		schematicX: number,
		schematicY: number,
		labelDirection?: string,
		labelAnchor?: string,
		subtitleAlign?: string,
		anchorDx?: number,
		anchorDy?: number
	): Promise<void> {
		await this.updateViewStation(viewId, stationId, {
			schematicX,
			schematicY,
			labelDirection,
			labelAnchor,
			subtitleAlign,
			anchorDx,
			anchorDy
		});
	}

	static async setInterchangeBadgeMode(
		viewId: number,
		stationId: number,
		mode: InterchangeBadgeMode
	): Promise<void> {
		await this.updateViewStation(viewId, stationId, { interchangeBadgeMode: mode });
	}

	static async setInterchangeBadgeDirection(
		viewId: number,
		stationId: number,
		direction: InterchangeBadgeDirection
	): Promise<void> {
		await this.updateViewStation(viewId, stationId, { interchangeBadgeDirection: direction });
	}

	static async toggleInterchangeLine(
		viewId: number,
		stationId: number,
		lineId: number,
		hidden: boolean
	): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		let hiddenIds = existing?.hiddenInterchangeLineIds ?? [];
		if (hidden && !hiddenIds.includes(lineId)) {
			hiddenIds = [...hiddenIds, lineId];
		} else if (!hidden && hiddenIds.includes(lineId)) {
			hiddenIds = hiddenIds.filter((id) => id !== lineId);
		}
		await this.updateViewStation(viewId, stationId, { hiddenInterchangeLineIds: hiddenIds });
	}

	static async deleteForView(viewId: number): Promise<void> {
		await db.viewStations.where({ viewId }).delete();
	}
}

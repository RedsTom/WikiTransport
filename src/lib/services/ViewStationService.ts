import { db } from './Database';
import type {
	ViewStation,
	Station,
	InterchangeBadgeMode,
	InterchangeBadgeDirection
} from '../types/models';

type ViewStationUpdate = Partial<Omit<ViewStation, 'id' | 'viewId' | 'stationId'>>;

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

	static async setLabelDirection(
		viewId: number,
		stationId: number,
		labelDirection: string
	): Promise<void> {
		await this.updateViewStation(viewId, stationId, { labelDirection });
	}

	static async setSubtitleAlign(
		viewId: number,
		stationId: number,
		subtitleAlign: string
	): Promise<void> {
		await this.updateViewStation(viewId, stationId, { subtitleAlign: subtitleAlign || undefined });
	}

	static async setAnchorDx(viewId: number, stationId: number, anchorDx: number): Promise<void> {
		await this.updateViewStation(viewId, stationId, { anchorDx });
	}

	static async setAnchorDy(viewId: number, stationId: number, anchorDy: number): Promise<void> {
		await this.updateViewStation(viewId, stationId, { anchorDy });
	}

	static async setLabelAnchor(
		viewId: number,
		stationId: number,
		labelAnchor: string
	): Promise<void> {
		await this.updateViewStation(viewId, stationId, { labelAnchor });
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

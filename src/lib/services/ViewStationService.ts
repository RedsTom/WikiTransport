import { db } from './Database';
import type { ViewStation } from '../types/models';

export class ViewStationService {
	static async getForView(viewId: number): Promise<ViewStation[]> {
		return await db.viewStations.where({ viewId }).toArray();
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
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, {
				schematicX,
				schematicY,
				labelDirection,
				labelAnchor,
				subtitleAlign,
				anchorDx,
				anchorDy
			});
		} else {
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX,
				schematicY,
				labelDirection,
				labelAnchor,
				subtitleAlign,
				anchorDx,
				anchorDy
			} as ViewStation);
		}
	}

	static async setLabelDirection(
		viewId: number,
		stationId: number,
		labelDirection: string
	): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, { labelDirection });
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: s.schematicX,
				schematicY: s.schematicY,
				labelDirection
			} as ViewStation);
		}
	}

	static async setSubtitleAlign(
		viewId: number,
		stationId: number,
		subtitleAlign: string
	): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, { subtitleAlign });
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: s.schematicX,
				schematicY: s.schematicY,
				subtitleAlign
			} as ViewStation);
		}
	}

	static async setAnchorDx(viewId: number, stationId: number, anchorDx: number): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, { anchorDx });
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: s.schematicX,
				schematicY: s.schematicY,
				anchorDx
			} as ViewStation);
		}
	}

	static async setAnchorDy(viewId: number, stationId: number, anchorDy: number): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, { anchorDy });
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: s.schematicX,
				schematicY: s.schematicY,
				anchorDy
			} as ViewStation);
		}
	}

	static async setLabelAnchor(
		viewId: number,
		stationId: number,
		labelAnchor: string
	): Promise<void> {
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			await db.viewStations.update(existing.id!, { labelAnchor });
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: s.schematicX,
				schematicY: s.schematicY,
				labelAnchor
			} as ViewStation);
		}
	}

	static async deleteForView(viewId: number): Promise<void> {
		await db.viewStations.where({ viewId }).delete();
	}
}

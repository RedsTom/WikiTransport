import { db } from './Database';
import type { ViewStation, Station } from '../types/models';

type ViewStationUpdate = Partial<Omit<ViewStation, 'id' | 'viewId' | 'stationId'>>;

export class ViewStationService {
	static async getForView(viewId: number): Promise<ViewStation[]> {
		return await db.viewStations.where({ viewId }).toArray();
	}

	/**
	 * Create or update a view station with the given properties.
	 * Only the provided fields in `updates` will be modified.
	 * If no existing record is found and at least one positional field
	 * (schematicX/Y) is missing, the base station's position is used as fallback.
	 */
	static async updateViewStation(
		viewId: number,
		stationId: number,
		updates: ViewStationUpdate
	): Promise<void> {
		const clean: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(updates)) {
			if (v !== undefined) clean[k] = v;
		}
		const existing = await db.viewStations.where({ viewId, stationId }).first();
		if (existing) {
			if (Object.keys(clean).length > 0) {
				await db.viewStations.update(existing.id!, clean);
			}
		} else {
			const s = await db.stations.get(stationId);
			if (!s) return;
			await db.viewStations.add({
				viewId,
				stationId,
				schematicX: (clean.schematicX as number) ?? s.schematicX,
				schematicY: (clean.schematicY as number) ?? s.schematicY,
				...clean
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
		await this.updateViewStation(viewId, stationId, { subtitleAlign });
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

	static async deleteForView(viewId: number): Promise<void> {
		await db.viewStations.where({ viewId }).delete();
	}
}

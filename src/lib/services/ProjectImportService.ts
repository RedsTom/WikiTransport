import { db } from './Database';
import JSZip from 'jszip';
import type {
	Project,
	TransitType,
	Station,
	Line,
	RoutePoint,
	AnchorPoint,
	View,
	ViewStation
} from '../types';

export class ProjectImportService {
	static async previewProject(buffer: ArrayBuffer): Promise<{ name: string; city: string }> {
		const zip = await JSZip.loadAsync(buffer);
		const raw = JSON.parse(await zip.file('project.json')!.async('string'));
		return { name: raw.name, city: raw.city };
	}

	static async importProject(
		buffer: ArrayBuffer,
		mode: 'new' | 'update',
		targetProjectId?: number,
		overrides?: { name?: string; city?: string }
	): Promise<number> {
		const zip = await JSZip.loadAsync(buffer);

		const rawProject: {
			name?: string;
			city?: string;
			centerLat?: number;
			centerLng?: number;
			zoom?: number;
		} = JSON.parse(await zip.file('project.json')!.async('string'));

		const rawTransitTypes: {
			_exportId: number;
			name: string;
			iconShape: string;
			icon?: string;
		}[] = JSON.parse(await zip.file('transitTypes.json')!.async('string'));

		const rawStations: {
			_exportId: number;
			name: string;
			subtitle?: string;
			geoLat: number;
			geoLng: number;
			schematicX: number;
			schematicY: number;
			labelDirection?: string;
			labelAnchor?: string;
			subtitleAlign?: string;
			anchorDx?: number;
			anchorDy?: number;
		}[] = JSON.parse(await zip.file('stations.json')!.async('string'));

		const rawLines: {
			_exportId: number;
			name: string;
			_transitTypeExportId: number;
			color: string;
			zIndex: number;
			strokeWidth?: number;
			dashPattern?: string;
		}[] = JSON.parse(await zip.file('lines.json')!.async('string'));

		const rawRoutePoints: {
			_lineExportId: number;
			_stationExportId: number;
			order: number;
			direction: string;
		}[] = JSON.parse(await zip.file('routePoints.json')!.async('string'));

		const rawAnchorPoints: {
			_lineExportId: number;
			schematicX: number;
			schematicY: number;
			order: number;
			_viewExportId?: number;
		}[] = JSON.parse(await zip.file('anchorPoints.json')!.async('string'));

		const rawViews: {
			_exportId: number;
			name: string;
			_hiddenLineExportIds: number[];
			_hiddenStationExportIds: number[];
		}[] = JSON.parse(await zip.file('views.json')!.async('string'));

		const rawViewStations: {
			_viewExportId: number;
			_stationExportId: number;
			schematicX: number;
			schematicY: number;
			labelDirection?: string;
			labelAnchor?: string;
			subtitleAlign?: string;
			anchorDx?: number;
			anchorDy?: number;
			interchangeBadgeMode?: string;
			interchangeBadgeDirection?: string;
			_hiddenInterchangeLineExportIds?: number[];
		}[] = JSON.parse(await zip.file('viewStations.json')!.async('string'));

		return await db.transaction(
			'rw',
			[
				db.projects,
				db.transitTypes,
				db.lines,
				db.stations,
				db.routePoints,
				db.anchorPoints,
				db.views,
				db.viewStations
			],
			async () => {
				let projectId: number;

				if (mode === 'update' && targetProjectId !== undefined) {
					await this.deleteProjectData(targetProjectId);
					projectId = targetProjectId;
					await db.projects.update(projectId, {
						name: overrides?.name ?? rawProject.name ?? '',
						city: overrides?.city ?? rawProject.city ?? '',
						centerLat: rawProject.centerLat ?? 48.8566,
						centerLng: rawProject.centerLng ?? 2.3522,
						zoom: rawProject.zoom ?? 13,
						updatedAt: new Date()
					});
				} else {
					const project: Project = {
						name: overrides?.name ?? rawProject.name ?? '',
						city: overrides?.city ?? rawProject.city ?? '',
						centerLat: rawProject.centerLat ?? 48.8566,
						centerLng: rawProject.centerLng ?? 2.3522,
						zoom: rawProject.zoom ?? 13,
						updatedAt: new Date()
					};
					projectId = (await db.projects.add(project)) as number;
				}

				const ttExportToNew = new Map<number, number>();
				for (const tt of rawTransitTypes) {
					const newId = (await db.transitTypes.add({
						projectId,
						name: tt.name,
						iconShape: tt.iconShape,
						icon: tt.icon
					} as TransitType)) as number;
					ttExportToNew.set(tt._exportId, newId);
				}

				const stationExportToNew = new Map<number, number>();
				for (const s of rawStations) {
					const newId = (await db.stations.add({
						projectId,
						name: s.name,
						subtitle: s.subtitle,
						geoLat: s.geoLat,
						geoLng: s.geoLng,
						schematicX: s.schematicX,
						schematicY: s.schematicY,
						labelDirection: s.labelDirection,
						labelAnchor: s.labelAnchor,
						subtitleAlign: s.subtitleAlign,
						anchorDx: s.anchorDx,
						anchorDy: s.anchorDy
					} as Station)) as number;
					stationExportToNew.set(s._exportId, newId);
				}

				const lineExportToNew = new Map<number, number>();
				for (const l of rawLines) {
					const newId = (await db.lines.add({
						projectId,
						name: l.name,
						transitTypeId: ttExportToNew.get(l._transitTypeExportId)!,
						color: l.color,
						zIndex: l.zIndex,
						strokeWidth: l.strokeWidth,
						dashPattern: l.dashPattern
					} as Line)) as number;
					lineExportToNew.set(l._exportId, newId);
				}

				const viewExportToNew = new Map<number, number>();
				for (const v of rawViews) {
					const newId = (await db.views.add({
						projectId,
						name: v.name,
						hiddenLineIds: (v._hiddenLineExportIds ?? []).map(
							(id: number) => lineExportToNew.get(id)!
						),
						hiddenStationIds: (v._hiddenStationExportIds ?? []).map(
							(id: number) => stationExportToNew.get(id)!
						)
					} as View)) as number;
					viewExportToNew.set(v._exportId, newId);
				}

				for (const rp of rawRoutePoints) {
					await db.routePoints.add({
						lineId: lineExportToNew.get(rp._lineExportId)!,
						stationId: stationExportToNew.get(rp._stationExportId)!,
						order: rp.order,
						direction: rp.direction
					} as RoutePoint);
				}

				for (const ap of rawAnchorPoints) {
					await db.anchorPoints.add({
						lineId: lineExportToNew.get(ap._lineExportId)!,
						schematicX: ap.schematicX,
						schematicY: ap.schematicY,
						order: ap.order,
						viewId:
							ap._viewExportId !== undefined ? viewExportToNew.get(ap._viewExportId) : undefined
					} as AnchorPoint);
				}

				for (const vs of rawViewStations) {
					await db.viewStations.add({
						viewId: viewExportToNew.get(vs._viewExportId)!,
						stationId: stationExportToNew.get(vs._stationExportId)!,
						schematicX: vs.schematicX,
						schematicY: vs.schematicY,
						labelDirection: vs.labelDirection,
						labelAnchor: vs.labelAnchor,
						subtitleAlign: vs.subtitleAlign,
						anchorDx: vs.anchorDx,
						anchorDy: vs.anchorDy,
						interchangeBadgeMode: vs.interchangeBadgeMode,
						interchangeBadgeDirection: vs.interchangeBadgeDirection,
						hiddenInterchangeLineIds: (vs._hiddenInterchangeLineExportIds ?? []).map(
							(id: number) => lineExportToNew.get(id)!
						)
					} as ViewStation);
				}

				await db.projects.update(projectId, { updatedAt: new Date() });

				return projectId;
			}
		);
	}

	private static async deleteProjectData(projectId: number): Promise<void> {
		const lineKeys = await db.lines.where({ projectId }).primaryKeys();
		const viewKeys = await db.views.where({ projectId }).primaryKeys();

		if (lineKeys.length > 0) {
			await db.routePoints.where('lineId').anyOf(lineKeys).delete();
			await db.anchorPoints.where('lineId').anyOf(lineKeys).delete();
		}
		if (viewKeys.length > 0) {
			await db.viewStations.where('viewId').anyOf(viewKeys).delete();
		}

		await db.lines.where({ projectId }).delete();
		await db.transitTypes.where({ projectId }).delete();
		await db.stations.where({ projectId }).delete();
		await db.views.where({ projectId }).delete();
	}
}

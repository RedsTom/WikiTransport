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

export class ProjectExportService {
	static async exportProject(projectId: number): Promise<Blob> {
		const project = await db.projects.get(projectId);
		if (!project) throw new Error('Project not found');

		const [transitTypes, stations, lines, views] = await Promise.all([
			db.transitTypes.where({ projectId }).toArray(),
			db.stations.where({ projectId }).toArray(),
			db.lines.where({ projectId }).toArray(),
			db.views.where({ projectId }).toArray()
		]);

		const lineIds = lines.map((l) => l.id!);
		const viewIds = views.map((v) => v.id!);

		const [routePoints, anchorPoints, viewStations] = await Promise.all([
			lineIds.length > 0
				? db.routePoints.where('lineId').anyOf(lineIds).toArray()
				: Promise.resolve([] as RoutePoint[]),
			lineIds.length > 0
				? db.anchorPoints.where('lineId').anyOf(lineIds).toArray()
				: Promise.resolve([] as AnchorPoint[]),
			viewIds.length > 0
				? db.viewStations.where('viewId').anyOf(viewIds).toArray()
				: Promise.resolve([] as ViewStation[])
		]);

		const zip = new JSZip();

		zip.file(
			'project.json',
			JSON.stringify({
				name: project.name,
				city: project.city,
				centerLat: project.centerLat,
				centerLng: project.centerLng,
				zoom: project.zoom
			})
		);

		zip.file(
			'transitTypes.json',
			JSON.stringify(
				transitTypes.map((tt) => ({
					_exportId: tt.id!,
					name: tt.name,
					iconShape: tt.iconShape,
					icon: tt.icon
				}))
			)
		);

		zip.file(
			'stations.json',
			JSON.stringify(
				stations.map((s) => ({
					_exportId: s.id!,
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
				}))
			)
		);

		zip.file(
			'lines.json',
			JSON.stringify(
				lines.map((l) => ({
					_exportId: l.id!,
					name: l.name,
					_transitTypeExportId: l.transitTypeId,
					color: l.color,
					zIndex: l.zIndex,
					strokeWidth: l.strokeWidth,
					dashPattern: l.dashPattern
				}))
			)
		);

		zip.file(
			'routePoints.json',
			JSON.stringify(
				routePoints.map((rp) => ({
					_lineExportId: rp.lineId,
					_stationExportId: rp.stationId,
					order: rp.order,
					direction: rp.direction
				}))
			)
		);

		zip.file(
			'anchorPoints.json',
			JSON.stringify(
				anchorPoints.map((ap) => ({
					_lineExportId: ap.lineId,
					schematicX: ap.schematicX,
					schematicY: ap.schematicY,
					order: ap.order,
					...(ap.viewId !== undefined ? { _viewExportId: ap.viewId } : {})
				}))
			)
		);

		zip.file(
			'views.json',
			JSON.stringify(
				views.map((v) => ({
					_exportId: v.id!,
					name: v.name,
					_hiddenLineExportIds: v.hiddenLineIds ?? [],
					_hiddenStationExportIds: v.hiddenStationIds ?? []
				}))
			)
		);

		zip.file(
			'viewStations.json',
			JSON.stringify(
				viewStations.map((vs) => ({
					_viewExportId: vs.viewId,
					_stationExportId: vs.stationId,
					schematicX: vs.schematicX,
					schematicY: vs.schematicY,
					labelDirection: vs.labelDirection,
					labelAnchor: vs.labelAnchor,
					subtitleAlign: vs.subtitleAlign,
					anchorDx: vs.anchorDx,
					anchorDy: vs.anchorDy,
					interchangeBadgeMode: vs.interchangeBadgeMode,
					interchangeBadgeDirection: vs.interchangeBadgeDirection,
					_hiddenInterchangeLineExportIds: vs.hiddenInterchangeLineIds ?? []
				}))
			)
		);

		return await zip.generateAsync({ type: 'blob' });
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
}

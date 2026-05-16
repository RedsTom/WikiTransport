import { db } from './Database';
import JSZip from 'jszip';
import type { AnchorPoint, RoutePoint, ViewStation } from '../types';

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
}

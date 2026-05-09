import type {
	Project,
	Line,
	Station,
	RoutePoint,
	TransitType,
	AnchorPoint,
	View,
	ViewStation
} from '../types/models';
import { LineService } from '../services/LineService';
import { StationService } from '../services/StationService';
import { TransitTypeService } from '../services/TransitTypeService';
import { AnchorPointService } from '../services/AnchorPointService';
import { ViewService } from '../services/ViewService';
import { ViewStationService } from '../services/ViewStationService';
import { EditorService } from '../services/EditorService';

export class EditorState {
	project = $state<Project | null>(null);
	transitTypes = $state<TransitType[]>([]);
	lines = $state<Line[]>([]);
	stations = $state<Station[]>([]);
	routePoints = $state<RoutePoint[]>([]);
	anchorPoints = $state<AnchorPoint[]>([]);
	views = $state<View[]>([]);
	viewStations = $state<ViewStation[]>([]);
	activeViewId = $state<number | null>(null);

	leftTab = $state<'lines' | 'types' | 'stations'>('lines');
	rightTab = $state<'general' | 'line' | 'station'>('general');

	selectedTransitTypeId = $state<number | null>(null);
	selectedLineId = $state<number | null>(null);
	selectedStationId = $state<number | null>(null);
	selectedAnchorId = $state<number | null>(null);

	placementMode = $state<'station' | 'anchor' | null>(null);
	anchorLineClicked = $state(false);

	hiddenLineIds = $state<Set<number>>(new Set());
	hiddenTypeIds = $state<Set<number>>(new Set());

	stationToDelete = $state<number | null>(null);
	lineToDelete = $state<number | null>(null);
	anchorToDelete = $state<number | null>(null);
	deleteStationOpen = $state(false);
	deleteLineOpen = $state(false);
	deleteAnchorOpen = $state(false);

	get activeView(): View | null {
		return this.views.find((v) => v.id === this.activeViewId) ?? null;
	}

	get isGlobalView(): boolean {
		return this.activeViewId === null;
	}

	stationPosition(station: Station): { x: number; y: number } {
		if (this.isGlobalView) {
			return { x: station.schematicX, y: station.schematicY };
		}
		const vs = this.viewStations.find(
			(vs) => vs.viewId === this.activeViewId && vs.stationId === station.id
		);
		if (vs) return { x: vs.schematicX, y: vs.schematicY };
		return { x: station.schematicX, y: station.schematicY };
	}

	get effectiveHiddenLineIds(): Set<number> {
		if (this.isGlobalView) return this.hiddenLineIds;
		const view = this.activeView;
		return new Set(view?.hiddenLineIds ?? []);
	}

	get effectiveHiddenStationIds(): Set<number> {
		if (this.isGlobalView) return new Set();
		const view = this.activeView;
		const base = new Set(view?.hiddenStationIds ?? []);
		const hiddenLineSet = new Set(view?.hiddenLineIds ?? []);
		for (const st of this.stations) {
			if (!st.id) continue;
			if (base.has(st.id)) continue;
			const lineIds = this.routePoints
				.filter((rp) => rp.stationId === st.id)
				.map((rp) => rp.lineId);
			if (lineIds.length > 0 && lineIds.every((lid) => hiddenLineSet.has(lid))) {
				base.add(st.id);
			}
		}
		return base;
	}

	stationLabelDirection(station: Station): string {
		if (this.isGlobalView) return station.labelDirection ?? 'E';
		const vs = this.viewStations.find(
			(vs) => vs.viewId === this.activeViewId && vs.stationId === station.id
		);
		if (vs) return vs.labelDirection ?? 'E';
		return station.labelDirection ?? 'E';
	}

	stationLabelAnchor(station: Station): string {
		if (this.isGlobalView) return station.labelAnchor ?? 'E';
		const vs = this.viewStations.find(
			(vs) => vs.viewId === this.activeViewId && vs.stationId === station.id
		);
		if (vs) return vs.labelAnchor ?? 'E';
		return station.labelAnchor ?? 'E';
	}

	stationSubtitleAlign(station: Station): string | undefined {
		if (this.isGlobalView) return station.subtitleAlign;
		const vs = this.viewStations.find(
			(vs) => vs.viewId === this.activeViewId && vs.stationId === station.id
		);
		if (vs) return vs.subtitleAlign;
		return station.subtitleAlign;
	}

	stationAnchorDx(station: Station): number {
		return this._stationAnchorValue(station, 'anchorDx', 14);
	}

	stationAnchorDy(station: Station): number {
		return this._stationAnchorValue(station, 'anchorDy', 14);
	}

	private _stationAnchorValue(
		station: Station,
		field: 'anchorDx' | 'anchorDy',
		defaultValue: number
	): number {
		if (this.isGlobalView) return station[field] ?? defaultValue;
		const vs = this.viewStations.find(
			(vs) => vs.viewId === this.activeViewId && vs.stationId === station.id
		);
		if (vs) return vs[field] ?? station[field] ?? defaultValue;
		return station[field] ?? defaultValue;
	}

	toggleStationVisibility(id: number) {
		if (this.isGlobalView) return;
		const view = this.activeView;
		if (!view) return;
		const ids = view.hiddenStationIds.includes(id)
			? view.hiddenStationIds.filter((x) => x !== id)
			: [...view.hiddenStationIds, id];
		view.hiddenStationIds = ids;
		ViewService.update(view.id!, { hiddenStationIds: ids });
	}

	toggleTypeVisibility(id: number) {
		const next = new Set(this.hiddenTypeIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		this.hiddenTypeIds = next;
	}

	reset() {
		this.project = null;
		this.transitTypes = [];
		this.lines = [];
		this.stations = [];
		this.routePoints = [];
		this.anchorPoints = [];
		this.views = [];
		this.viewStations = [];
		this.activeViewId = null;
		this.leftTab = 'lines';
		this.rightTab = 'general';
		this.selectedTransitTypeId = null;
		this.selectedLineId = null;
		this.selectedStationId = null;
		this.selectedAnchorId = null;
		this.placementMode = null;
		this.anchorLineClicked = false;
		this.hiddenLineIds = new Set();
		this.hiddenTypeIds = new Set();
		this.stationToDelete = null;
		this.lineToDelete = null;
		this.anchorToDelete = null;
		this.deleteStationOpen = false;
		this.deleteLineOpen = false;
		this.deleteAnchorOpen = false;
	}

	async loadTransitTypes() {
		if (this.project?.id) {
			this.transitTypes = await TransitTypeService.getTypes(this.project.id);
		}
	}

	async loadLines() {
		if (this.project?.id) {
			this.lines = await LineService.getLines(this.project.id);
		}
	}

	async loadStations() {
		if (this.project?.id) {
			this.stations = await StationService.getStations(this.project.id);
		}
	}

	async loadRoutePoints() {
		let allPoints: RoutePoint[] = [];
		for (const line of this.lines) {
			if (line.id) {
				const points = await StationService.getRoutePointsForLine(line.id);
				allPoints.push(...points);
			}
		}
		this.routePoints = allPoints;
	}

	async loadAnchorPoints(viewId?: number) {
		let allAnchors: AnchorPoint[] = [];
		for (const line of this.lines) {
			if (line.id) {
				const anchors = await AnchorPointService.getForLine(line.id, viewId);
				allAnchors.push(...anchors);
			}
		}
		this.anchorPoints = allAnchors;
	}

	async loadViews() {
		if (this.project?.id) {
			this.views = await ViewService.getForProject(this.project.id);
		}
	}
}

export const editorState = new EditorState();

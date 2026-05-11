import type {
	Project,
	Line,
	Station,
	RoutePoint,
	TransitType,
	AnchorPoint,
	View,
	ViewStation,
	InterchangeBadgeMode,
	InterchangeBadgeDirection
} from '../types';
import { LineService } from '../services/LineService';
import { StationService } from '../services/StationService';
import { TransitTypeService } from '../services/TransitTypeService';
import { AnchorPointService } from '../services/AnchorPointService';
import { ViewService } from '../services/ViewService';

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
	currentViewBox = $state({ x: 0, y: 0, width: 1000, height: 1000 });
	viewBoxRecords = $state<Record<string, { x: number; y: number; width: number; height: number }>>(
		{}
	);
	isSwitchingView = $state(false);

	leftTab = $state<'lines' | 'types' | 'stations'>('lines');
	rightTab = $state<'general' | 'line' | 'station'>('general');

	selectedTransitTypeId = $state<number | null>(null);
	selectedLineId = $state<number | null>(null);
	selectedStationId = $state<number | null>(null);
	selectedAnchorId = $state<number | null>(null);
	hoveredAnchorId = $state<number | null>(null);

	placementMode = $state<'station' | 'anchor' | null>(null);
	pendingLineInsert = $state<{ refStationId: number; before: boolean } | null>(null);

	hiddenLineIds = $state<Set<number>>(new Set());

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
		return this._stationViewValue(station, 'labelDirection', 'E');
	}

	stationLabelAnchor(station: Station): string {
		return this._stationViewValue(station, 'labelAnchor', 'E');
	}

	stationSubtitleAlign(station: Station): string | undefined {
		return this._stationViewValue<string | undefined>(station, 'subtitleAlign', undefined);
	}

	stationAnchorDx(station: Station): number {
		return this._stationViewValue(station, 'anchorDx', 14);
	}

	stationAnchorDy(station: Station): number {
		return this._stationViewValue(station, 'anchorDy', 14);
	}

	stationInterchangeBadgeMode(station: Station): InterchangeBadgeMode {
		return this._stationViewValue<InterchangeBadgeMode>(station, 'interchangeBadgeMode', 'station');
	}

	stationInterchangeBadgeDirection(station: Station): InterchangeBadgeDirection {
		return this._stationViewValue<InterchangeBadgeDirection>(
			station,
			'interchangeBadgeDirection',
			'S'
		);
	}

	stationHiddenInterchangeLineIds(station: Station): number[] {
		return this._stationViewValue<number[]>(station, 'hiddenInterchangeLineIds', []);
	}

	private _stationViewValue<T>(
		station: Station,
		field: keyof Station | keyof ViewStation,
		defaultValue: T
	): T {
		if (this.isGlobalView) return (station as any)[field] ?? defaultValue;
		const vs = this.viewStations.find(
			(vs) => vs.viewId === this.activeViewId && vs.stationId === station.id
		);
		if (vs) return (vs as any)[field] ?? (station as any)[field] ?? defaultValue;
		return (station as any)[field] ?? defaultValue;
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
		this.hiddenLineIds = new Set();
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

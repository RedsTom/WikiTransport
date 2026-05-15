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
import { SvelteSet } from 'svelte/reactivity';
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

	leftTab = $state<'overview' | 'types' | 'stations' | null>(null);
	rightTab = $state<'general' | 'type' | 'line' | 'station' | null>(null);

	selectedTransitTypeId = $state<number | null>(null);
	selectedLineId = $state<number | null>(null);
	selectedStationId = $state<number | null>(null);
	selectedAnchorId = $state<number | null>(null);
	hoveredAnchorId = $state<number | null>(null);

	placementMode = $state<'station' | 'anchor' | null>(null);
	pendingLineInsert = $state<{ refStationId: number; before: boolean } | null>(null);

	hiddenLineIds = $state(new SvelteSet<number>());

	stationToDelete = $state<number | null>(null);
	lineToDelete = $state<number | null>(null);
	anchorToDelete = $state<number | null>(null);
	deleteStationOpen = $state(false);
	deleteLineOpen = $state(false);
	deleteAnchorOpen = $state(false);

	/* eslint-disable svelte/prefer-svelte-reactivity */
	stationMap = $derived(new Map(this.stations.filter((s) => s.id != null).map((s) => [s.id!, s])));
	lineMap = $derived(new Map(this.lines.filter((l) => l.id != null).map((l) => [l.id!, l])));
	transitTypeMap = $derived(
		new Map(this.transitTypes.filter((t) => t.id != null).map((t) => [t.id!, t]))
	);
	viewStationMap = $derived(
		this.activeViewId != null
			? new Map(
					this.viewStations
						.filter((vs) => vs.viewId === this.activeViewId)
						.map((vs) => [vs.stationId, vs])
				)
			: new Map()
	);

	routePointsByLine = $derived.by(() => {
		const map = new Map<number, RoutePoint[]>();
		for (const rp of this.routePoints) {
			if (rp.lineId == null) continue;
			let arr = map.get(rp.lineId);
			if (!arr) {
				arr = [];
				map.set(rp.lineId, arr);
			}
			arr.push(rp);
		}
		for (const [, arr] of map) arr.sort((a, b) => a.order - b.order);
		return map;
	});

	routePointsByStation = $derived.by(() => {
		const map = new Map<number, RoutePoint[]>();
		for (const rp of this.routePoints) {
			if (rp.stationId == null) continue;
			let arr = map.get(rp.stationId);
			if (!arr) {
				arr = [];
				map.set(rp.stationId, arr);
			}
			arr.push(rp);
		}
		return map;
	});

	anchorPointsByLine = $derived.by(() => {
		const map = new Map<number, AnchorPoint[]>();
		for (const ap of this.anchorPoints) {
			if (ap.lineId == null) continue;
			let arr = map.get(ap.lineId);
			if (!arr) {
				arr = [];
				map.set(ap.lineId, arr);
			}
			arr.push(ap);
		}
		for (const [, arr] of map) arr.sort((a, b) => a.order - b.order);
		return map;
	});
	/* eslint-enable svelte/prefer-svelte-reactivity */

	get activeView(): View | null {
		return this.views.find((v) => v.id === this.activeViewId) ?? null;
	}

	get isGlobalView(): boolean {
		return this.activeViewId === null;
	}

	stationPosition(station: Station): { x: number; y: number } {
		if (this.isGlobalView || station.id == null) {
			return { x: station.schematicX, y: station.schematicY };
		}
		const vs = this.viewStationMap.get(station.id);
		if (vs) return { x: vs.schematicX, y: vs.schematicY };
		return { x: station.schematicX, y: station.schematicY };
	}

	get effectiveHiddenLineIds(): Set<number> {
		if (this.isGlobalView) return this.hiddenLineIds;
		const view = this.activeView;
		return new SvelteSet(view?.hiddenLineIds ?? []);
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
		const s = station as unknown as Record<string, unknown>;
		if (this.isGlobalView || station.id == null) return (s[field] as T) ?? defaultValue;
		const vs = this.viewStationMap.get(station.id);
		if (vs)
			return (
				((vs as unknown as Record<string, unknown>)[field] as T) ?? (s[field] as T) ?? defaultValue
			);
		return (s[field] as T) ?? defaultValue;
	}

	effectiveHiddenStationIds = $derived.by<Set<number>>(() => {
		if (this.isGlobalView) return new SvelteSet<number>();
		const view = this.activeView;
		const base = new SvelteSet(view?.hiddenStationIds ?? []);
		const hiddenLineSet = new SvelteSet(view?.hiddenLineIds ?? []);
		for (const st of this.stations) {
			if (!st.id) continue;
			if (base.has(st.id)) continue;
			const rps = this.routePointsByStation.get(st.id);
			if (!rps || rps.length === 0) continue;
			if (rps.every((rp) => hiddenLineSet.has(rp.lineId))) {
				base.add(st.id);
			}
		}
		return base;
	});

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
		this.leftTab = null;
		this.rightTab = null;
		this.selectedTransitTypeId = null;
		this.selectedLineId = null;
		this.selectedStationId = null;
		this.selectedAnchorId = null;
		this.placementMode = null;
		this.hiddenLineIds = new SvelteSet<number>();
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
		const lineIds = this.lines.map((l) => l.id).filter((id): id is number => id != null);
		if (lineIds.length === 0) {
			this.routePoints = [];
			return;
		}
		this.routePoints = await StationService.getRoutePointsForLines(lineIds);
	}

	async loadAnchorPoints(viewId?: number) {
		const lineIds = this.lines.map((l) => l.id).filter((id): id is number => id != null);
		if (lineIds.length === 0) {
			this.anchorPoints = [];
			return;
		}
		this.anchorPoints = await AnchorPointService.getForLines(lineIds, viewId);
	}

	async loadViews() {
		if (this.project?.id) {
			this.views = await ViewService.getForProject(this.project.id);
		}
	}
}

export const editorState = new EditorState();

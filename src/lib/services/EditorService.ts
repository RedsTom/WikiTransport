import { SvelteSet } from 'svelte/reactivity';
import type { EditorState } from '$lib/store/editor.svelte';
import type { Station, ViewStation } from '$lib/types';
import { StationService } from './StationService';
import { LineService } from './LineService';
import { ViewService } from './ViewService';
import { ViewStationService } from './ViewStationService';
import { AnchorPointService } from './AnchorPointService';

/**
 * Orchestrates multi-entity business operations on the editor state.
 * Keeps the store focused on state management and derived values.
 */
export class EditorService {
	/**
	 * Load all data for a project: transit types, lines, stations, route points, anchors, and views.
	 */
	static async reloadAll(state: EditorState): Promise<void> {
		await state.loadTransitTypes();
		await state.loadLines();
		await state.loadStations();
		await state.loadRoutePoints();
		await state.loadAnchorPoints(state.activeViewId ?? undefined);
		await state.loadViews();
	}

	/**
	 * Switch the active view and load its view stations and anchors.
	 */
	static async switchToView(state: EditorState, viewId: number | null): Promise<void> {
		state.activeViewId = viewId;
		if (viewId !== null) {
			state.viewStations = await ViewStationService.getForView(viewId);
		} else {
			state.viewStations = [];
		}
		await state.loadAnchorPoints(viewId ?? undefined);
	}

	/**
	 * Create a new view by cloning the current state (stations, anchors, visibility).
	 */
	static async createView(state: EditorState, name: string): Promise<number> {
		const projectId = state.project?.id;
		if (!projectId) throw new Error('No project loaded');
		const hiddenLineIds = [...state.effectiveHiddenLineIds];
		const viewId = await ViewService.create(projectId, name, hiddenLineIds, []);

		for (const s of state.stations) {
			if (!s.id) continue;
			await ViewStationService.setPosition(
				viewId,
				s.id,
				s.schematicX,
				s.schematicY,
				s.labelDirection,
				s.labelAnchor,
				s.subtitleAlign,
				s.anchorDx,
				s.anchorDy
			);
		}

		const globalAnchors = await AnchorPointService.getAllForView();
		for (const ap of globalAnchors) {
			await AnchorPointService.create(ap.lineId, ap.schematicX, ap.schematicY, ap.order, viewId);
		}

		await state.loadViews();
		await this.switchToView(state, viewId);
		return viewId;
	}

	/**
	 * Delete a view and clean up associated anchor points and view stations.
	 */
	static async deleteView(state: EditorState, viewId: number): Promise<void> {
		await AnchorPointService.deleteForView(viewId);
		await ViewService.delete(viewId);
		if (state.activeViewId === viewId) {
			state.activeViewId = null;
			state.viewStations = [];
		}
		await state.loadViews();
	}

	/**
	 * Update a station's position (and optional properties) in either global or view mode.
	 */
	static async updateViewStationPosition(
		state: EditorState,
		stationId: number,
		schematicX: number,
		schematicY: number,
		labelDirection?: string,
		labelAnchor?: string,
		subtitleAlign?: string,
		anchorDx?: number,
		anchorDy?: number
	) {
		if (state.isGlobalView) {
			const changes: Record<string, unknown> = { schematicX, schematicY };
			if (labelDirection !== undefined) changes.labelDirection = labelDirection;
			if (labelAnchor !== undefined) changes.labelAnchor = labelAnchor;
			if (subtitleAlign !== undefined) changes.subtitleAlign = subtitleAlign;
			if (anchorDx !== undefined) changes.anchorDx = anchorDx;
			if (anchorDy !== undefined) changes.anchorDy = anchorDy;
			await StationService.updateStation(stationId, changes as Partial<Station>);
			const st = state.stations.find((s) => s.id === stationId);
			if (st) {
				st.schematicX = schematicX;
				st.schematicY = schematicY;
				if (labelDirection !== undefined) st.labelDirection = labelDirection;
				if (labelAnchor !== undefined) st.labelAnchor = labelAnchor;
				if (subtitleAlign !== undefined) st.subtitleAlign = subtitleAlign;
				if (anchorDx !== undefined) st.anchorDx = anchorDx;
				if (anchorDy !== undefined) st.anchorDy = anchorDy;
			}
		} else if (state.activeViewId !== null) {
			await ViewStationService.setPosition(
				state.activeViewId,
				stationId,
				schematicX,
				schematicY,
				labelDirection,
				labelAnchor,
				subtitleAlign,
				anchorDx,
				anchorDy
			);
			const existing = state.viewStations.find(
				(vs) => vs.viewId === state.activeViewId && vs.stationId === stationId
			);
			const vsUpdates: Record<string, unknown> = { schematicX, schematicY };
			if (labelDirection !== undefined) vsUpdates.labelDirection = labelDirection;
			if (labelAnchor !== undefined) vsUpdates.labelAnchor = labelAnchor;
			if (subtitleAlign !== undefined) vsUpdates.subtitleAlign = subtitleAlign;
			if (anchorDx !== undefined) vsUpdates.anchorDx = anchorDx;
			if (anchorDy !== undefined) vsUpdates.anchorDy = anchorDy;
			if (existing) {
				Object.assign(existing, vsUpdates);
			} else {
				state.viewStations = [
					...state.viewStations,
					{
						id: undefined,
						viewId: state.activeViewId,
						stationId,
						...vsUpdates
					} as unknown as ViewStation
				];
			}
		}
	}

	/**
	 * Toggle line visibility in either global or view mode.
	 */
	static toggleLineVisibility(state: EditorState, id: number) {
		if (state.isGlobalView) {
			const next = new SvelteSet(state.hiddenLineIds);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			state.hiddenLineIds = next;
		} else {
			const view = state.activeView;
			if (!view) return;
			const ids = view.hiddenLineIds.includes(id)
				? view.hiddenLineIds.filter((x) => x !== id)
				: [...view.hiddenLineIds, id];
			view.hiddenLineIds = ids;
			ViewService.update(view.id!, { hiddenLineIds: ids });
		}
	}

	/**
	 * Delete a station and reset selection.
	 */
	static async deleteStation(state: EditorState, id: number): Promise<void> {
		await StationService.deleteStation(id);
		state.selectedStationId = null;
		await state.loadStations();
		await state.loadRoutePoints();
	}

	/**
	 * Delete a line and reset selection.
	 */
	static async deleteLine(state: EditorState, id: number): Promise<void> {
		await LineService.deleteLine(id);
		state.selectedLineId = null;
		await state.loadLines();
		await state.loadRoutePoints();
	}

	/**
	 * Update an anchor point's position and reload.
	 */
	static async updateAnchorPosition(
		state: EditorState,
		id: number,
		schematicX: number,
		schematicY: number
	) {
		await AnchorPointService.update(id, { schematicX, schematicY });
		const anchor = state.anchorPoints.find((a) => a.id === id);
		if (anchor) {
			anchor.schematicX = schematicX;
			anchor.schematicY = schematicY;
		}
	}

	/**
	 * Delete an anchor point and reset selection.
	 */
	static async deleteAnchor(state: EditorState, id: number): Promise<void> {
		await AnchorPointService.delete(id);
		state.selectedAnchorId = null;
		await state.loadAnchorPoints(state.activeViewId ?? undefined);
	}

	/**
	 * Deselect all selected entities.
	 */
	static deselectAll(state: EditorState) {
		state.selectedLineId = null;
		state.selectedStationId = null;
		state.selectedAnchorId = null;
		state.selectedTransitTypeId = null;
	}
}

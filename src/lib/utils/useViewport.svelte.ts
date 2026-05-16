import { editorState } from '$lib/store/editor.svelte';

const MIN_ZOOM = 20;
const MAX_ZOOM = 50000;

export function useViewport(svgEl: () => SVGSVGElement | null) {
	let viewBoxX = $state(0);
	let viewBoxY = $state(0);
	let viewBoxWidth = $state(1000);
	let viewBoxHeight = $state(1000);
	let isDragging = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);

	const allContentPoints = $derived.by(() => {
		const points: { x: number; y: number }[] = [];
		const hiddenStationIds = editorState.effectiveHiddenStationIds;
		const hiddenLineIds = editorState.effectiveHiddenLineIds;
		for (const s of editorState.stations) {
			if (s.id != null && !editorState.isGlobalView && hiddenStationIds.has(s.id)) continue;
			points.push(editorState.stationPosition(s));
		}
		for (const a of editorState.anchorPoints) {
			if (!editorState.isGlobalView && hiddenLineIds.has(a.lineId)) continue;
			points.push({ x: a.schematicX, y: a.schematicY });
		}
		return points;
	});

	const isTooFar = $derived.by(() => {
		if (allContentPoints.length === 0) return false;
		const vx = viewBoxX,
			vy = viewBoxY;
		const vw = viewBoxWidth,
			vh = viewBoxHeight;
		return !allContentPoints.some(
			(p) => p.x >= vx && p.x <= vx + vw && p.y >= vy && p.y <= vy + vh
		);
	});

	function fitContent() {
		const svg = svgEl();
		if (!svg) return;
		if (allContentPoints.length === 0) {
			viewBoxX = 0;
			viewBoxY = 0;
			viewBoxWidth = 1000;
			viewBoxHeight = 1000;
			return;
		}
		const minX = Math.min(...allContentPoints.map((p) => p.x));
		const maxX = Math.max(...allContentPoints.map((p) => p.x));
		const minY = Math.min(...allContentPoints.map((p) => p.y));
		const maxY = Math.max(...allContentPoints.map((p) => p.y));
		const padding = 200;
		const cx = (minX + maxX) / 2;
		const cy = (minY + maxY) / 2;
		let cw = Math.max(maxX - minX + padding * 2, 200);
		let ch = Math.max(maxY - minY + padding * 2, 200);
		const ar = svg.clientWidth / svg.clientHeight;
		if (cw / ch > ar) {
			ch = cw / ar;
		} else {
			cw = ch * ar;
		}
		viewBoxX = cx - cw / 2;
		viewBoxY = cy - ch / 2;
		viewBoxWidth = cw;
		viewBoxHeight = ch;
	}

	$effect(() => {
		if (editorState.isSwitchingView) return;
		const key = editorState.activeViewId === null ? 'global' : String(editorState.activeViewId);
		const vb = { x: viewBoxX, y: viewBoxY, width: viewBoxWidth, height: viewBoxHeight };
		editorState.viewBoxRecords[key] = vb;
		editorState.currentViewBox = vb;
	});

	$effect(() => {
		const key = editorState.activeViewId === null ? 'global' : String(editorState.activeViewId);
		const saved = editorState.viewBoxRecords[key];
		if (saved) {
			viewBoxX = saved.x;
			viewBoxY = saved.y;
			viewBoxWidth = saved.width;
			viewBoxHeight = saved.height;
		} else {
			fitContent();
		}
	});

	function startPan(clientX: number, clientY: number) {
		isDragging = true;
		lastMouseX = clientX;
		lastMouseY = clientY;
	}

	function movePan(clientX: number, clientY: number) {
		if (!isDragging) return;
		const svg = svgEl();
		if (!svg) return;
		const dx = clientX - lastMouseX;
		const dy = clientY - lastMouseY;
		const scale = viewBoxWidth / svg.clientWidth;
		viewBoxX -= dx * scale;
		viewBoxY -= dy * scale;
		lastMouseX = clientX;
		lastMouseY = clientY;
	}

	function stopPan() {
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const zoomSpeed = 0.1;
		const zoomDir = e.deltaY > 0 ? 1 : -1;
		const zoomFactor = 1 + zoomDir * zoomSpeed;

		const svg = svgEl();
		if (!svg) return;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

		const newW = viewBoxWidth * zoomFactor;
		const newH = viewBoxHeight * zoomFactor;
		if (newW < MIN_ZOOM || newW > MAX_ZOOM) return;

		viewBoxX = svgP.x - (svgP.x - viewBoxX) * zoomFactor;
		viewBoxY = svgP.y - (svgP.y - viewBoxY) * zoomFactor;
		viewBoxWidth = newW;
		viewBoxHeight = newH;
	}

	return {
		get viewBoxX() {
			return viewBoxX;
		},
		set viewBoxX(v: number) {
			viewBoxX = v;
		},
		get viewBoxY() {
			return viewBoxY;
		},
		set viewBoxY(v: number) {
			viewBoxY = v;
		},
		get viewBoxWidth() {
			return viewBoxWidth;
		},
		get viewBoxHeight() {
			return viewBoxHeight;
		},
		get isTooFar() {
			return isTooFar;
		},
		fitContent,
		startPan,
		movePan,
		stopPan,
		handleWheel
	};
}

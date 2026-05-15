<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount, onDestroy } from 'svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { LineService } from '$lib/services/LineService';
	import { StationService } from '$lib/services/StationService';
	import { TransitTypeService } from '$lib/services/TransitTypeService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { ViewService } from '$lib/services/ViewService';
	import { ViewStationService } from '$lib/services/ViewStationService';
	import { CircularProgress, IconButton, Button } from '$lib/components/ui';
	import { generateExportSvg, buildExportSvgForPreview } from '$lib/utils/svg-export';
	import type { ExportData, ExportOptions } from '$lib/utils/svg-export';
	import type { View } from '$lib/types';

	const projectId = $derived(Number(page.params.id));
	const viewParam = $derived(page.params.view ?? 'global');
	const isGlobal = $derived(viewParam === 'global');

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let exportData = $state<ExportData | null>(null);
	let viewObj = $state<View | null>(null);
	let svgWrapper = $state<HTMLDivElement | null>(null);

	let options = $state<ExportOptions>({ showLegend: true });

	let isGenerating = $state(false);
	let generationProgress = $state(0);

	let currentViewLabel = $derived(isGlobal ? m.global_view() : (viewObj?.name ?? viewParam));

	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);

	let svgTransform = $derived(`translate(${translateX}px, ${translateY}px) scale(${scale})`);

	let _animFrame: number | null = null;
	let _genTimeout: ReturnType<typeof setTimeout> | null = null;

	function injectSvg(svgString: string) {
		if (!svgWrapper) return;
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgString, 'image/svg+xml');
		const svgEl = doc.documentElement;
		if (svgEl.tagName !== 'svg') return;
		/* eslint-disable-next-line svelte/no-dom-manipulating */
		svgWrapper.innerHTML = '';
		/* eslint-disable-next-line svelte/no-dom-manipulating */
		svgWrapper.appendChild(document.importNode(svgEl, true));
		applyTransform();
	}

	function applyTransform() {
		if (!svgWrapper) return;
		const svgEl = svgWrapper.firstElementChild as SVGSVGElement | null;
		if (svgEl) {
			svgEl.style.transform = svgTransform;
			svgEl.style.transformOrigin = '0 0';
		}
	}

	function animateProgress() {
		const elapsed = performance.now() - _progressStart;
		const t = Math.min(elapsed / 4000, 1);
		generationProgress = Math.floor(t * t * 88);
		if (t < 1) {
			_animFrame = requestAnimationFrame(animateProgress);
		}
	}

	let _progressStart = 0;

	$effect(() => {
		if (!exportData || !svgWrapper) return;
		const opts = options;
		const global = isGlobal;

		if (_animFrame !== null) cancelAnimationFrame(_animFrame);
		if (_genTimeout !== null) clearTimeout(_genTimeout);

		isGenerating = true;
		generationProgress = 0;
		scale = 1;
		translateX = 0;
		translateY = 0;

		_progressStart = performance.now();
		_animFrame = requestAnimationFrame(animateProgress);

		_genTimeout = setTimeout(() => {
			if (!exportData) return;
			try {
				const svgString = buildExportSvgForPreview(exportData, opts, global);
				if (_animFrame !== null) cancelAnimationFrame(_animFrame);
				generationProgress = 100;
				injectSvg(svgString);
			} finally {
				isGenerating = false;
			}
		}, 80);
	});

	$effect(() => {
		if (svgTransform) applyTransform();
	});

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(0.1, Math.min(20, scale * delta));
		const rect = svgWrapper?.getBoundingClientRect();
		if (rect) {
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			const ratio = newScale / scale;
			translateX = mx - (mx - translateX) * ratio;
			translateY = my - (my - translateY) * ratio;
		}
		scale = newScale;
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		isPanning = true;
		panStartX = e.clientX - translateX;
		panStartY = e.clientY - translateY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;
		translateX = e.clientX - panStartX;
		translateY = e.clientY - panStartY;
	}

	function handleMouseUp() {
		isPanning = false;
	}

	async function loadData() {
		try {
			const project = await ProjectService.getProject(projectId);
			if (!project) {
				error = m.export_error();
				isLoading = false;
				return;
			}

			const lines = await LineService.getLines(project.id!);
			const stations = await StationService.getStations(project.id!);
			const transitTypes = await TransitTypeService.getTypes(project.id!);

			const routePoints: import('$lib/types').RoutePoint[] = [];
			for (const line of lines) {
				if (line.id) {
					const pts = await StationService.getRoutePointsForLine(line.id);
					routePoints.push(...pts);
				}
			}

			const anchorPoints: import('$lib/types').AnchorPoint[] = [];

			let activeView: View | null = null;
			let hiddenLineIds: number[] = [];
			let explicitHiddenStationIds: number[] = [];
			let viewStations: import('$lib/types').ViewStation[] = [];

			if (isGlobal) {
				for (const line of lines) {
					if (line.id) {
						const anchors = await AnchorPointService.getForLine(line.id, undefined);
						anchorPoints.push(...anchors);
					}
				}
			} else {
				const views = await ViewService.getForProject(project.id!);
				const vId = Number(viewParam);
				activeView = views.find((v) => v.id === vId) ?? null;
				if (activeView) {
					hiddenLineIds = activeView.hiddenLineIds ?? [];
					explicitHiddenStationIds = activeView.hiddenStationIds ?? [];
					viewStations = await ViewStationService.getForView(activeView.id!);
					for (const line of lines) {
						if (line.id) {
							const anchors = await AnchorPointService.getForLine(line.id, activeView.id!);
							anchorPoints.push(...anchors);
						}
					}
				}
				viewObj = activeView;
			}

			const hiddenLineSet = new Set(hiddenLineIds);
			const hiddenStationIds: number[] = [...explicitHiddenStationIds];
			for (const st of stations) {
				if (!st.id) continue;
				if (explicitHiddenStationIds.includes(st.id)) continue;
				const servingLineIds = routePoints
					.filter((rp) => rp.stationId === st.id)
					.map((rp) => rp.lineId);
				if (servingLineIds.length > 0 && servingLineIds.every((lid) => hiddenLineSet.has(lid))) {
					hiddenStationIds.push(st.id);
				}
			}

			exportData = {
				project,
				lines,
				stations,
				routePoints,
				anchorPoints,
				transitTypes,
				viewStations,
				hiddenLineIds,
				hiddenStationIds
			};

			isLoading = false;
		} catch (e) {
			error = String(e);
			isLoading = false;
		}
	}

	function handleDownload() {
		if (!exportData) return;
		const fullSvg = generateExportSvg(exportData, options, isGlobal);
		const blob = new Blob([fullSvg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const viewName = isGlobal ? 'global' : (viewObj?.name ?? viewParam);
		a.download = `${exportData.project.name}-${viewName}.svg`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	onDestroy(() => {
		if (_animFrame !== null) cancelAnimationFrame(_animFrame);
		if (_genTimeout !== null) clearTimeout(_genTimeout);
	});

	onMount(() => {
		loadData();
	});
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-surface text-on-surface">
	<header
		class="flex h-14 shrink-0 items-center justify-between border-b border-outline/20 bg-surface px-4"
	>
		<div class="flex items-center gap-4">
			<IconButton onclick={() => goto(resolve(`/project/${projectId}`))}>
				<span class="material-symbols-outlined">arrow_back</span>
			</IconButton>
			<h1 class="text-base font-medium">{m.export_preview()}</h1>
			<span class="rounded bg-surface-variant px-2 py-0.5 text-xs text-on-surface-variant"
				>{Math.round(scale * 100)}%</span
			>
		</div>
		<Button variant="filled" onclick={handleDownload} disabled={!exportData}>
			<span class="material-symbols-outlined text-sm">download</span>
			{m.export_download()}
		</Button>
	</header>

	<div class="flex flex-1 overflow-hidden">
		{#if isLoading}
			<div class="flex w-full items-center justify-center">
				<CircularProgress indeterminate />
			</div>
		{:else if error}
			<div class="flex w-full items-center justify-center text-error">
				<p>{error}</p>
			</div>
		{:else}
			<aside class="w-72 shrink-0 border-r border-outline/20 bg-surface p-4">
				<h2 class="mb-4 text-sm font-semibold tracking-wider text-on-surface-variant uppercase">
					{m.preview()}
				</h2>

				<div class="mb-4 rounded-lg bg-surface-variant p-3">
					<p class="text-xs text-on-surface-variant">{m.project_name()}</p>
					<p class="font-medium">{exportData?.project.name}</p>
					<p class="mt-1 text-xs text-on-surface-variant">{m.view_name()}</p>
					<p class="font-medium">{currentViewLabel}</p>
				</div>

				<div class="mb-4">
					<h3 class="mb-2 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
						{m.properties()}
					</h3>

					<label
						class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-variant"
					>
						<button
							role="switch"
							aria-checked={options.showLegend}
							aria-label={m.show_legend()}
							onclick={() => (options = { ...options, showLegend: !options.showLegend })}
							class="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors {options.showLegend
								? 'bg-primary'
								: 'bg-outline/30'}"
						>
							<span
								class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform {options.showLegend
									? 'translate-x-4'
									: 'translate-x-0'}"
							></span>
						</button>
						<span class="text-sm">{m.show_legend()}</span>
					</label>
				</div>

				<div class="mt-auto border-t border-outline/20 pt-4">
					<p class="text-xs text-on-surface-variant">
						{exportData?.lines.length}
						{m.lines().toLowerCase()}
					</p>
					<p class="text-xs text-on-surface-variant">
						{exportData?.stations.length}
						{m.stations().toLowerCase()}
					</p>
				</div>
			</aside>

			<main
				class="relative flex flex-1 items-center justify-center overflow-hidden bg-[#e8e8e8] p-0"
			>
				{#if isGenerating}
					<div
						class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#e8e8e8]"
					>
						<CircularProgress value={generationProgress} />
						<p class="text-sm text-on-surface-variant">
							{m.generating_preview()} ({generationProgress}%)
						</p>
					</div>
				{/if}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={svgWrapper}
					class="h-full w-full {isPanning ? 'cursor-grabbing' : 'cursor-grab'}"
					onwheel={handleWheel}
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
				></div>
			</main>
		{/if}
	</div>
</div>

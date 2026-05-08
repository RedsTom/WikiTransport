<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import { Button } from '$lib/components/ui';
	import { measureText } from '$lib/utils/textMeasure';

	let { onclose = () => {} }: { onclose: () => void } = $props();

	let exportEl = $state<HTMLDivElement | null>(null);
	let showLegend = $state(true);
	let exportScale = $state(2);

	let allLines = $derived(editorState.lines);
	let visibleLines = $derived(
		allLines.filter((l) => !editorState.effectiveHiddenLineIds.has(l.id!))
	);

	let stationLineCounts = $derived.by(() => {
		const counts = new Map<
			number,
			{ lineIds: number[]; lineNames: string[]; lineColors: string[] }
		>();
		for (const rp of editorState.routePoints) {
			const line = allLines.find((l) => l.id === rp.lineId);
			if (!line || editorState.effectiveHiddenLineIds.has(line.id!)) continue;
			if (!counts.has(rp.stationId)) {
				counts.set(rp.stationId, { lineIds: [], lineNames: [], lineColors: [] });
			}
			const entry = counts.get(rp.stationId)!;
			if (!entry.lineIds.includes(line.id!)) {
				entry.lineIds.push(line.id!);
				entry.lineNames.push(line.name);
				entry.lineColors.push(line.color);
			}
		}
		return counts;
	});

	let interchangeStations = $derived(
		new Set(
			[...stationLineCounts.entries()].filter(([_, v]) => v.lineIds.length > 1).map(([k]) => k)
		)
	);

	function getTermini(lineId: number): { from: string; to: string } {
		const rps = editorState.routePoints
			.filter((rp) => rp.lineId === lineId)
			.sort((a, b) => a.order - b.order);
		if (rps.length === 0) return { from: '', to: '' };
		const firstSt = editorState.stations.find((s) => s.id === rps[0].stationId);
		const lastSt = editorState.stations.find((s) => s.id === rps[rps.length - 1].stationId);
		return {
			from: firstSt?.name ?? '',
			to: lastSt?.name ?? ''
		};
	}

	function getOctilinearPath(coords: { x: number; y: number }[]): string {
		if (coords.length === 0) return '';
		let path = `M ${coords[0].x} ${coords[0].y}`;
		for (let i = 1; i < coords.length; i++) {
			const p1 = coords[i - 1];
			const p2 = coords[i];
			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;
			const adx = Math.abs(dx);
			const ady = Math.abs(dy);
			const minD = Math.min(adx, ady);
			if (minD > 0) {
				const midX = p1.x + Math.sign(dx) * minD;
				const midY = p1.y + Math.sign(dy) * minD;
				path += ` L ${midX} ${midY}`;
				if (adx !== ady) {
					path += ` L ${p2.x} ${p2.y}`;
				}
			} else {
				path += ` L ${p2.x} ${p2.y}`;
			}
		}
		return path;
	}

	const LINE_SPACING = 12;

	let lineOffsets = $derived.by(() => {
		const segMap = new Map<string, { dx: number; dy: number; lineIds: number[] }>();
		for (const line of visibleLines) {
			if (!line.id) continue;
			const stIds = editorState.routePoints
				.filter((rp) => rp.lineId === line.id)
				.sort((a, b) => a.order - b.order)
				.map((rp) => rp.stationId);
			for (let i = 0; i < stIds.length - 1; i++) {
				const a = stIds[i],
					b = stIds[i + 1];
				const key = `${Math.min(a, b)},${Math.max(a, b)}`;
				let entry = segMap.get(key);
				if (!entry) {
					const sA = editorState.stations.find((s) => s.id === a);
					const sB = editorState.stations.find((s) => s.id === b);
					if (!sA || !sB) continue;
					const pA = editorState.stationPosition(sA);
					const pB = editorState.stationPosition(sB);
					entry = { dx: pB.x - pA.x, dy: pB.y - pA.y, lineIds: [] };
					segMap.set(key, entry);
				}
				entry.lineIds.push(line.id);
			}
		}
		for (const [, entry] of segMap) {
			entry.lineIds.sort((a, b) => {
				const la = allLines.find((l) => l.id === a);
				const lb = allLines.find((l) => l.id === b);
				return (la?.transitTypeId ?? -1) - (lb?.transitTypeId ?? -1) || a - b;
			});
		}
		const result = new Map<number, Map<string, { x: number; y: number }>>();
		for (const line of visibleLines) {
			if (line.id) result.set(line.id, new Map());
		}
		for (const [key, info] of segMap) {
			const { dx, dy, lineIds } = info;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len === 0 || lineIds.length <= 1) continue;
			const perpX = dy / len;
			const perpY = -dx / len;
			for (let idx = 0; idx < lineIds.length; idx++) {
				const lineId = lineIds[idx];
				const off = (idx - (lineIds.length - 1) / 2) * LINE_SPACING;
				const segMap = result.get(lineId);
				if (!segMap) continue;
				segMap.set(key, { x: perpX * off, y: perpY * off });
			}
		}
		return result;
	});

	const DIR_CFG: Record<string, { anchor: string; rotation: number }> = {
		N: { anchor: 'middle', rotation: 0 },
		NE: { anchor: 'start', rotation: -45 },
		E: { anchor: 'start', rotation: 0 },
		SE: { anchor: 'start', rotation: 45 },
		S: { anchor: 'middle', rotation: 0 },
		SW: { anchor: 'end', rotation: -45 },
		W: { anchor: 'end', rotation: 0 },
		NW: { anchor: 'end', rotation: 45 }
	};

	function getLabelLayout(
		anchor: string,
		dx: number,
		dy: number,
		sx: number,
		sy: number
	): { x: number; y: number; subtitleY: number } {
		const anchorX =
			(
				{
					N: sx,
					NE: sx + dx,
					E: sx + dx,
					SE: sx + dx,
					S: sx,
					SW: sx - dx,
					W: sx - dx,
					NW: sx - dx
				} as Record<string, number>
			)[anchor] ?? sx + dx;
		const anchorY =
			(
				{
					N: sy - dy,
					NE: sy - dy,
					E: sy,
					SE: sy + dy,
					S: sy + dy,
					SW: sy + dy,
					W: sy,
					NW: sy - dy
				} as Record<string, number>
			)[anchor] ?? sy;

		let titleY: number;
		if (anchor === 'N' || anchor === 'NE' || anchor === 'NW') {
			titleY = anchorY - 3;
		} else if (anchor === 'S' || anchor === 'SE' || anchor === 'SW') {
			titleY = anchorY + 9;
		} else {
			titleY = anchorY + 3;
		}

		return { x: anchorX, y: titleY, subtitleY: titleY + 13 };
	}

	let padding = 120;
	let legendWidth = 300;
	let contentBounds = $derived.by(() => {
		const xs = editorState.stations.map((s) => editorState.stationPosition(s).x);
		const ys = editorState.stations.map((s) => editorState.stationPosition(s).y);
		if (xs.length === 0) return { minX: 0, maxX: 600, minY: 0, maxY: 400 };
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys)
		};
	});
	let svgOffsetX = $derived(contentBounds.minX - padding);
	let svgOffsetY = $derived(contentBounds.minY - padding);
	let svgWidth = $derived.by(() => {
		const extraRight = showLegend ? legendWidth + 30 : 0;
		return contentBounds.maxX - contentBounds.minX + padding * 2 + extraRight;
	});
	let svgHeight = $derived(contentBounds.maxY - contentBounds.minY + padding * 2);
	let legendX = $derived(contentBounds.maxX + padding + 10);
	let legendY = $derived(contentBounds.minY + padding);

	const SHAPE_SIZE = 44;

	async function exportPng() {
		if (!exportEl) return;
		const svg = exportEl.querySelector('svg');
		if (!svg) return;
		const svgData = new XMLSerializer().serializeToString(svg);
		const canvas = document.createElement('canvas');
		canvas.width = svgWidth * exportScale;
		canvas.height = svgHeight * exportScale;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.scale(exportScale, exportScale);
		const img = new Image();
		const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		img.onload = () => {
			ctx.drawImage(img, 0, 0);
			URL.revokeObjectURL(url);
			const a = document.createElement('a');
			a.href = canvas.toDataURL('image/png');
			const viewName = editorState.activeView?.name ?? 'global';
			a.download = `${editorState.project?.name || 'map'}-${viewName}.png`;
			a.click();
		};
		img.src = url;
	}
</script>

<div class="flex h-screen w-full flex-col bg-white text-black">
	<header class="flex shrink-0 items-center justify-between border-b px-4 py-2">
		<div class="flex items-center gap-4">
			<Button variant="text" onclick={onclose}>
				<span class="material-symbols-outlined mr-1">arrow_back</span>
				Back to editor
			</Button>
			<h1 class="text-lg font-bold">
				{editorState.project?.name}
				<span class="font-normal text-gray-500">
					— Preview{editorState.activeView ? `: ${editorState.activeView.name}` : ''}
				</span>
			</h1>
		</div>
		<div class="flex items-center gap-3">
			<label class="flex items-center gap-1 text-sm">
				<input type="checkbox" bind:checked={showLegend} />
				Legend
			</label>
			<label class="flex items-center gap-1 text-sm">
				Scale:
				<select bind:value={exportScale} class="rounded border px-2 py-1 text-sm">
					<option value={1}>1x</option>
					<option value={2}>2x</option>
					<option value={3}>3x</option>
					<option value={4}>4x</option>
				</select>
			</label>
			<Button variant="filled" onclick={exportPng}>
				<span class="material-symbols-outlined mr-1">download</span>
				Export PNG
			</Button>
		</div>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<div class="flex flex-1 items-center justify-center overflow-auto bg-gray-50 p-4">
			<div bind:this={exportEl} class="bg-white shadow-lg" style="width: {svgWidth}px">
				<svg
					width={svgWidth}
					height={svgHeight}
					viewBox="{svgOffsetX} {svgOffsetY} {svgWidth} {svgHeight}"
					xmlns="http://www.w3.org/2000/svg"
					style="font-family: sans-serif;"
				>
					<rect width="100%" height="100%" fill="white" />

					<!-- Lines -->
					{#each visibleLines as line}
						{@const points = editorState.routePoints
							.filter((rp) => rp.lineId === line.id)
							.sort((a, b) => a.order - b.order)}
						{@const segOffMap = lineOffsets.get(line.id!)}
						{@const lineAnchors = editorState.anchorPoints
							.filter((ap) => ap.lineId === line.id)
							.sort((a, b) => a.order - b.order)}
						{@const coords = (() => {
							const result: { x: number; y: number; order: number }[] = [];
							for (let i = 0; i < points.length; i++) {
								const rp = points[i];
								const s = editorState.stations.find((st) => st.id === rp.stationId);
								if (!s) continue;
								const pos = editorState.stationPosition(s);
								let offX = 0,
									offY = 0,
									cnt = 0;
								const addOff = (a: number, b: number) => {
									const k = `${Math.min(a, b)},${Math.max(a, b)}`;
									const o = segOffMap?.get(k);
									if (o) {
										offX += o.x;
										offY += o.y;
										cnt++;
									}
								};
								if (i > 0) addOff(points[i - 1].stationId, rp.stationId);
								if (i < points.length - 1) addOff(rp.stationId, points[i + 1].stationId);
								if (cnt > 0) {
									offX /= cnt;
									offY /= cnt;
								}
								result.push({ x: pos.x + offX, y: pos.y + offY, order: rp.order });
							}
							for (const ap of lineAnchors) {
								const beforeRps = points.filter((rp) => rp.order < ap.order);
								const afterRps = points.filter((rp) => rp.order > ap.order);
								if (beforeRps.length === 0 || afterRps.length === 0) {
									result.push({ x: ap.schematicX, y: ap.schematicY, order: ap.order });
									continue;
								}
								const k = `${Math.min(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)},${Math.max(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)}`;
								const o = segOffMap?.get(k);
								result.push({
									x: ap.schematicX + (o?.x ?? 0),
									y: ap.schematicY + (o?.y ?? 0),
									order: ap.order
								});
							}
							result.sort((a, b) => a.order - b.order);
							return result;
						})()}

						{#if coords.length > 1}
							<path
								d={getOctilinearPath(coords)}
								fill="none"
								stroke={line.color}
								stroke-width={line.strokeWidth ?? 6}
								stroke-dasharray={line.dashPattern || undefined}
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					{/each}

					<!-- Stations -->
					{#each editorState.stations as station}
						{@const isHidden =
							!editorState.isGlobalView && editorState.effectiveHiddenStationIds.has(station.id!)}
						{@const pos = editorState.stationPosition(station)}
						{@const linesHere = stationLineCounts.get(station.id!)}
						{@const isInterchange = interchangeStations.has(station.id!)}
						{@const visibleHere =
							!isHidden &&
							linesHere?.lineIds.some((id) => !editorState.effectiveHiddenLineIds.has(id))}

						{#if visibleHere}
							{#if isInterchange}
								<circle cx={pos.x} cy={pos.y} r="10" fill="white" stroke="black" stroke-width="3" />
							{:else}
								<circle
									cx={pos.x}
									cy={pos.y}
									r="5"
									fill={linesHere?.lineColors[0] || 'black'}
									stroke="white"
									stroke-width="2"
								/>
							{/if}

							{@const labelDir = editorState.stationLabelDirection(station)}
							{@const labelAnchor = editorState.stationLabelAnchor(station)}
							{@const dCfg = DIR_CFG[labelDir] ?? DIR_CFG.E}
							{@const hasSubtitle = !!station.subtitle}
							{@const subAlign = editorState.stationSubtitleAlign(station)}
							{@const anchorDx = editorState.stationAnchorDx(station)}
							{@const anchorDy = editorState.stationAnchorDy(station)}
							{@const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y)}
							{@const titleFontSize = hasSubtitle ? 11 : 10}
							{@const subFontSize = 8}
							{@const titleW = measureText(station.name, titleFontSize, true)}
							{@const subW = hasSubtitle ? measureText(station.subtitle!, subFontSize) : 0}
							{@const titleX =
								dCfg.anchor === 'end'
									? layout.x - titleW
									: dCfg.anchor === 'middle'
										? layout.x - titleW / 2
										: layout.x}
							{@const subX =
								subAlign === 'left'
									? titleX
									: subAlign === 'center'
										? titleX + (titleW - subW) / 2
										: subAlign === 'right'
											? titleX + titleW - subW
											: dCfg.anchor === 'end'
												? layout.x - subW
												: dCfg.anchor === 'middle'
													? layout.x - subW / 2
													: layout.x}

							<g
								transform={dCfg.rotation
									? `rotate(${dCfg.rotation}, ${layout.x}, ${layout.y})`
									: undefined}
							>
								<text
									x={titleX}
									y={layout.y}
									font-size={titleFontSize}
									font-weight="bold"
									fill="#333"
									text-anchor="start"
								>
									<title>{station.name}</title>
									{station.name.length > 22 ? station.name.slice(0, 22) + '…' : station.name}
								</text>
								{#if hasSubtitle}
									<text
										x={subX}
										y={layout.subtitleY}
										font-size={subFontSize}
										fill="#666"
										text-anchor="start"
									>
										<title>{station.subtitle!}</title>
										{station.subtitle!.length > 28
											? station.subtitle!.slice(0, 28) + '…'
											: station.subtitle!}
									</text>
								{/if}
							</g>
						{/if}
					{/each}

					<!-- Legend -->
					{#if showLegend && visibleLines.length > 0}
						{@const rowH = SHAPE_SIZE + 20}
						<g transform="translate({legendX}, {legendY})">
							<rect
								x="0"
								y="0"
								width={legendWidth}
								height={visibleLines.length * rowH + 20}
								rx="6"
								fill="white"
								stroke="#ddd"
								stroke-width="1"
							/>
							{#each visibleLines as line, i}
								{@const type = editorState.transitTypes.find((t) => t.id === line.transitTypeId)}
								{@const shape = type?.iconShape ?? 'circle'}
								{@const termini = getTermini(line.id!)}
								{@const y = 10 + i * rowH}
								{@const s = SHAPE_SIZE}
								{@const h = s / 2}
								{@const iconName = line.name.length > 5 ? line.name.slice(0, 5) + '…' : line.name}
								{@const iconFontSize = iconName.length > 3 ? 10 : 13}
								<g transform="translate(12, {y})">
									{#if shape === 'circle'}
										<circle cx={h} cy={h} r={h} fill={line.color} />
										<text
											x={h}
											y={h}
											text-anchor="middle"
											dominant-baseline="central"
											font-size={iconFontSize}
											font-weight="bold"
											fill="white"
										>
											{iconName}
										</text>
									{:else if shape === 'square'}
										<rect x="2" y="2" width={s - 4} height={s - 4} rx="4" fill={line.color} />
										<text
											x={h}
											y={h}
											text-anchor="middle"
											dominant-baseline="central"
											font-size={iconFontSize}
											font-weight="bold"
											fill="white"
										>
											{iconName}
										</text>
									{:else if shape === 'diamond'}
										<polygon
											points={`${h},2 ${s - 2},${h} ${h},${s - 2} 2,${h}`}
											fill={line.color}
										/>
										<text
											x={h}
											y={h}
											text-anchor="middle"
											dominant-baseline="central"
											font-size={iconFontSize}
											font-weight="bold"
											fill="white"
										>
											{iconName}
										</text>
									{:else if shape === 'pill'}
										<rect
											x="4"
											y={s * 0.18}
											width={s - 8}
											height={s * 0.64}
											rx={s * 0.32}
											fill={line.color}
										/>
										<text
											x={h}
											y={h}
											text-anchor="middle"
											dominant-baseline="central"
											font-size={iconFontSize}
											font-weight="bold"
											fill="white"
										>
											{iconName}
										</text>
									{/if}
									<text x={s + 10} y={h} dominant-baseline="central" font-size="10" fill="#333">
										{termini.from}{termini.to ? ` — ${termini.to}` : ''}
									</text>
								</g>
							{/each}
						</g>
					{/if}
				</svg>
			</div>
		</div>

		<!-- Config sidebar -->
		<aside class="w-64 shrink-0 border-l border-gray-200 bg-white p-4">
			<h2 class="mb-3 text-sm font-bold text-gray-500 uppercase">Lines</h2>
			<div class="flex flex-col gap-1.5">
				{#each allLines as line}
					<label
						class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-gray-50"
					>
						<input
							type="checkbox"
							checked={!editorState.effectiveHiddenLineIds.has(line.id!)}
							onchange={() => editorState.toggleLineVisibility(line.id!)}
						/>
						<div class="h-3 w-3 shrink-0 rounded-full" style="background-color: {line.color}"></div>
						<span class="flex-1 truncate">{line.name}</span>
					</label>
				{/each}
			</div>

			{#if showLegend}
				<h2 class="mt-6 mb-3 text-sm font-bold text-gray-500 uppercase">Legend</h2>
				<div class="flex flex-col gap-1.5">
					{#each visibleLines as line}
						{@const type = editorState.transitTypes.find((t) => t.id === line.transitTypeId)}
						<div class="flex items-center gap-2 px-2 py-1 text-sm">
							<div
								class="h-4 w-4 shrink-0"
								style="background-color: {line.color}; border-radius: {type?.iconShape === 'square'
									? '4px'
									: type?.iconShape === 'circle'
										? '50%'
										: type?.iconShape === 'diamond'
											? '4px'
											: '8px'}; transform: {type?.iconShape === 'diamond'
									? 'rotate(45deg)'
									: 'none'};"
							></div>
							<span class="flex-1 truncate">{line.name}</span>
						</div>
					{/each}
				</div>
			{/if}

			<h2 class="mt-6 mb-3 text-sm font-bold text-gray-500 uppercase">Interchanges</h2>
			<div class="flex flex-col gap-1.5">
				{#each [...stationLineCounts.entries()].filter(([_, v]) => v.lineIds.length > 1) as [stationId, info]}
					{@const station = editorState.stations.find((s) => s.id === stationId)}
					{#if station}
						<div class="rounded border border-gray-200 px-2 py-1.5 text-sm">
							<div class="mb-1 font-medium">{station.name}</div>
							<div class="flex flex-wrap gap-1">
								{#each info.lineNames as name, i}
									<span
										class="inline-block rounded-full px-2 py-0.5 text-xs text-white"
										style="background-color: {info.lineColors[i]}"
									>
										{name}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</aside>
	</div>
</div>

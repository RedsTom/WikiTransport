import { LINE_SPACING } from '$lib/constants/schematic';
import type { RoutePoint } from '$lib/types';
export {
	screenToSvg,
	screenToSvgRaw,
	distToSegment,
	closestPointOnSegment,
	snapToGrid,
	routeOctilinear,
	getTunnelKey,
	intersectLines,
	getLabelLayout,
	partitionLineIdsByVisibility,
	scaleDashPattern
} from './geometry';
export type { Point } from './geometry';
import { getTunnelKey, routeOctilinear, intersectLines, type Point } from './geometry';

export interface Tunnel {
	u: Point;
	v: Point;
	lines: Set<number>;
}

export function buildTunnels(
	lines: { id?: number }[],
	routePoints: RoutePoint[],
	anchorPoints: { lineId: number; schematicX: number; schematicY: number; order: number }[],
	stationPosition: (stationId: number) => Point | null,
	hiddenLineIds: Set<number>
): { basePaths: Map<number, Point[]>; tunnels: Map<string, Tunnel>; stationPoints: Set<string> } {
	const basePaths = new Map<number, Point[]>();
	const tunnels = new Map<string, Tunnel>();
	const stationPoints = new Set<string>();

	// Phase 1: build merged path for each line
	for (const line of lines) {
		if (!line.id || hiddenLineIds.has(line.id)) continue;

		const rps = routePoints.filter((rp) => rp.lineId === line.id);
		const aps = anchorPoints.filter((ap) => ap.lineId === line.id);

		const pts: { pos: Point; order: number }[] = [];
		for (const rp of rps) {
			const pos = stationPosition(rp.stationId);
			if (pos) {
				pts.push({ pos, order: rp.order });
				stationPoints.add(`${Math.round(pos.x)},${Math.round(pos.y)}`);
			}
		}
		for (const ap of aps) {
			pts.push({ pos: { x: ap.schematicX, y: ap.schematicY }, order: ap.order });
		}

		pts.sort((a, b) => a.order - b.order);

		const basePath: Point[] = [];
		if (pts.length > 0) {
			basePath.push(pts[0].pos);
			for (let i = 1; i < pts.length; i++) {
				const prev = pts[i - 1].pos;
				const curr = pts[i].pos;
				const oct = routeOctilinear(prev, curr);
				for (let j = 1; j < oct.length; j++) basePath.push(oct[j]);
			}
		}

		const dedup: Point[] = [];
		for (const p of basePath) {
			if (
				dedup.length === 0 ||
				Math.hypot(dedup[dedup.length - 1].x - p.x, dedup[dedup.length - 1].y - p.y) > 0.1
			) {
				dedup.push(p);
			}
		}
		if (dedup.length > 0) {
			const merged: Point[] = [dedup[0]];
			for (let i = 1; i < dedup.length - 1; i++) {
				const curr = dedup[i];
				const isStation = stationPoints.has(`${Math.round(curr.x)},${Math.round(curr.y)}`);
				if (isStation) {
					merged.push(curr);
					continue;
				}
				const prev = merged[merged.length - 1];
				const next = dedup[i + 1];
				const dx1 = curr.x - prev.x,
					dy1 = curr.y - prev.y;
				const dx2 = next.x - curr.x,
					dy2 = next.y - curr.y;
				const sameDir =
					(dy1 === 0 && dy2 === 0 && Math.sign(dx1) === Math.sign(dx2)) ||
					(dx1 === 0 && dx2 === 0 && Math.sign(dy1) === Math.sign(dy2)) ||
					(Math.abs(dx1) === Math.abs(dy1) &&
						Math.abs(dx2) === Math.abs(dy2) &&
						Math.sign(dx1) === Math.sign(dx2) &&
						Math.sign(dy1) === Math.sign(dy2));
				if (sameDir) continue;
				merged.push(curr);
			}
			if (dedup.length > 1) merged.push(dedup[dedup.length - 1]);
			basePaths.set(line.id, merged);
		}
	}

	// Phase 2: collect every unique point from all base paths, tracking source lines
	const allJunctionPoints = new Map<string, Point>();
	const pointSourceLines = new Map<string, Set<number>>();
	for (const [lineId, path] of basePaths) {
		for (const p of path) {
			const key = `${Math.round(p.x)},${Math.round(p.y)}`;
			if (!allJunctionPoints.has(key)) allJunctionPoints.set(key, p);
			if (!pointSourceLines.has(key)) pointSourceLines.set(key, new Set());
			pointSourceLines.get(key)!.add(lineId);
		}
	}

	// Phase 3: inject junction points into each line's path, but only when
	// the source line runs alongside the segment (has another point on it).
	for (const [lineId, path] of basePaths) {
		const newPath: Point[] = [path[0]];
		for (let i = 0; i < path.length - 1; i++) {
			const u = path[i];
			const v = path[i + 1];

			const toInject: Point[] = [];
			for (const [pKey, p] of allJunctionPoints) {
				if (pointCoordsEqual(p, u) || pointCoordsEqual(p, v)) continue;

				let alreadyIn = false;
				for (const q of newPath) {
					if (pointCoordsEqual(q, p)) {
						alreadyIn = true;
						break;
					}
				}
				if (alreadyIn) continue;

				if (!isPointOnSegment(p, u, v)) continue;

				const sources = pointSourceLines.get(pKey);
				if (!sources) continue;

				let hasCompanion = false;
				for (const srcLineId of sources) {
					const srcPath = basePaths.get(srcLineId);
					if (!srcPath) continue;
					for (const q of srcPath) {
						if (pointCoordsEqual(q, p)) continue;
						if (isPointOnSegment(q, u, v)) {
							hasCompanion = true;
							break;
						}
					}
					if (hasCompanion) break;
				}

				if (hasCompanion) toInject.push(p);
			}

			toInject.sort(
				(a, b) =>
					(a.x - u.x) * (a.x - u.x) +
					(a.y - u.y) * (a.y - u.y) -
					((b.x - u.x) * (b.x - u.x) + (b.y - u.y) * (b.y - u.y))
			);

			newPath.push(...toInject, v);
		}
		basePaths.set(lineId, newPath);
	}

	// Phase 4: create tunnels from the augmented paths
	for (const [lineId, path] of basePaths) {
		for (let i = 0; i < path.length - 1; i++) {
			const u = path[i],
				v = path[i + 1];
			const key = getTunnelKey(u, v);
			if (!tunnels.has(key)) tunnels.set(key, { u, v, lines: new Set() });
			tunnels.get(key)!.lines.add(lineId);
		}
	}
	return { basePaths, tunnels, stationPoints };
}

function pointCoordsEqual(a: Point, b: Point): boolean {
	return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

function isPointOnSegment(p: Point, a: Point, b: Point): boolean {
	const px = p.x,
		py = p.y;
	const ax = a.x,
		ay = a.y;
	const bx = b.x,
		by = b.y;

	const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
	if (cross !== 0) return false;

	const minX = Math.min(ax, bx),
		maxX = Math.max(ax, bx);
	const minY = Math.min(ay, by),
		maxY = Math.max(ay, by);
	if (px < minX || px > maxX || py < minY || py > maxY) return false;

	return true;
}

export function computeLineOffsets(
	tunnels: Map<string, Tunnel>,
	lineMap: Map<number, { id?: number; transitTypeId?: number }>,
	basePaths: Map<number, Point[]>,
	stationPoints: Set<string>,
	tunnelOrder?: Record<string, number[]>
): Map<string, Map<number, Point>> {
	const lineOffsetsInTunnel = new Map<string, Map<number, Point>>();

	for (const [key, tunnel] of tunnels) {
		let sortedLines: number[];
		if (tunnelOrder && tunnelOrder[key]) {
			const custom = tunnelOrder[key].filter((id) => tunnel.lines.has(id));
			const remaining = Array.from(tunnel.lines).filter((id) => !custom.includes(id));
			remaining.sort((a, b) => {
				const ta = lineMap.get(a)?.transitTypeId ?? 0;
				const tb = lineMap.get(b)?.transitTypeId ?? 0;
				return ta - tb || a - b;
			});
			sortedLines = [...custom, ...remaining];
		} else {
			sortedLines = Array.from(tunnel.lines).sort((a, b) => {
				const ta = lineMap.get(a)?.transitTypeId ?? 0;
				const tb = lineMap.get(b)?.transitTypeId ?? 0;
				return ta - tb || a - b;
			});
		}

		const isUMin =
			tunnel.u.x < tunnel.v.x || (tunnel.u.x === tunnel.v.x && tunnel.u.y < tunnel.v.y);
		const P_min = isUMin ? tunnel.u : tunnel.v;
		const P_max = isUMin ? tunnel.v : tunnel.u;

		const dx = P_max.x - P_min.x,
			dy = P_max.y - P_min.y;
		const len = Math.hypot(dx, dy);

		let nx = 0,
			ny = 0;
		if (len > 0.1) {
			nx = -dy / len;
			ny = dx / len;
		}

		const offsets = new Map<number, Point>();
		for (let i = 0; i < sortedLines.length; i++) {
			const lid = sortedLines[i];
			const d = (i - (sortedLines.length - 1) / 2) * LINE_SPACING;
			offsets.set(lid, { x: nx * d, y: ny * d });
		}
		lineOffsetsInTunnel.set(key, offsets);
	}

	for (const [, path] of basePaths) {
		const tunnelKeys: string[] = [];
		for (let i = 0; i < path.length - 1; i++) {
			tunnelKeys.push(getTunnelKey(path[i], path[i + 1]));
		}

		for (let i = 0; i < tunnelKeys.length; i++) {
			const key = tunnelKeys[i];
			const tunnelLines = tunnels.get(key)?.lines;
			if (!tunnelLines || tunnelLines.size > 1) continue;

			const start = path[i];
			if (stationPoints.has(`${Math.round(start.x)},${Math.round(start.y)}`)) continue;

			const offsets = lineOffsetsInTunnel.get(key);
			if (!offsets) continue;

			const lid = Array.from(tunnelLines)[0];
			const cur = offsets.get(lid);
			if (cur && (cur.x !== 0 || cur.y !== 0)) continue;

			const tryPropagate = (srcIdx: number): boolean => {
				if (srcIdx < 0 || srcIdx >= tunnelKeys.length) return false;
				const k = tunnelKeys[srcIdx];
				const tl = tunnels.get(k)?.lines;
				if (!tl || !tl.has(lid) || tl.size <= 1) return false;
				const src = lineOffsetsInTunnel.get(k)?.get(lid);
				if (!src) return false;
				if (
					directionChangedAt(path, i, srcIdx) &&
					multiTunnelHasThroughLine(tunnelKeys[srcIdx], basePaths, tunnels)
				) {
					offsets.set(lid, src);
					return true;
				}
				return false;
			};

			if (tryPropagate(i + 1) || tryPropagate(i - 1)) continue;
		}
	}

	return lineOffsetsInTunnel;
}

/** True if any line in the multi-line tunnel passes through with the same direction */
function multiTunnelHasThroughLine(
	tunnelKey: string,
	basePaths: Map<number, Point[]>,
	tunnels: Map<string, Tunnel>
): boolean {
	const tunnel = tunnels.get(tunnelKey);
	if (!tunnel || tunnel.lines.size < 2) return false;

	for (const lid of tunnel.lines) {
		const path = basePaths.get(lid);
		if (!path || path.length < 2) continue;

		for (let i = 0; i < path.length - 1; i++) {
			if (getTunnelKey(path[i], path[i + 1]) !== tunnelKey) continue;

			if (i > 0) {
				const prevT = tunnels.get(getTunnelKey(path[i - 1], path[i]));
				if (prevT?.lines.has(lid)) {
					const dx1 = path[i].x - path[i - 1].x,
						dy1 = path[i].y - path[i - 1].y;
					const dx2 = path[i + 1].x - path[i].x,
						dy2 = path[i + 1].y - path[i].y;
					if (dx1 * dy2 - dy1 * dx2 === 0 && dx1 * dx2 >= 0 && dy1 * dy2 >= 0) return true;
				}
			}
			if (i + 1 < path.length - 1) {
				const nextT = tunnels.get(getTunnelKey(path[i + 1], path[i + 2]));
				if (nextT?.lines.has(lid)) {
					const dx1 = path[i + 1].x - path[i].x,
						dy1 = path[i + 1].y - path[i].y;
					const dx2 = path[i + 2].x - path[i + 1].x,
						dy2 = path[i + 2].y - path[i + 1].y;
					if (dx1 * dy2 - dy1 * dx2 === 0 && dx1 * dx2 >= 0 && dy1 * dy2 >= 0) return true;
				}
			}
		}
	}

	return false;
}

/** Returns true if the two adjacent tunnels go in different directions at the shared point */
function directionChangedAt(path: Point[], idxA: number, idxB: number): boolean {
	const isFwd = idxB > idxA;
	const shared = path[isFwd ? idxB : idxA];
	const into = path[isFwd ? idxB - 1 : idxA - 1];
	const out = path[isFwd ? idxB + 1 : idxA + 1];

	const dx1 = shared.x - into.x;
	const dy1 = shared.y - into.y;
	const dx2 = out.x - shared.x;
	const dy2 = out.y - shared.y;

	const cross = dx1 * dy2 - dy1 * dx2;
	if (cross !== 0) return true;
	if (dx1 * dx2 < 0 || dy1 * dy2 < 0) return true;

	return false;
}

export function getOffsetPath(
	basePath: Point[],
	lineId: number,
	lineOffsets: Map<string, Map<number, Point>>,
	stationPoints: Set<string>,
	multiLineTunnels?: Set<string>,
	cornerRadii?: Record<string, number>
): { offsetPath: Point[]; roundAt: Map<number, number> } {
	if (basePath.length < 2) return { offsetPath: basePath, roundAt: new Map() };

	const offsetPath: Point[] = [];
	const roundAt: Map<number, number> = new Map();

	for (let i = 0; i < basePath.length; i++) {
		const isStation = stationPoints.has(
			`${Math.round(basePath[i].x)},${Math.round(basePath[i].y)}`
		);

		if (i === 0) {
			const k = getTunnelKey(basePath[0], basePath[1]);
			const O = lineOffsets.get(k)?.get(lineId) ?? { x: 0, y: 0 };
			offsetPath.push({ x: basePath[0].x + O.x, y: basePath[0].y + O.y });
		} else if (i === basePath.length - 1) {
			const k = getTunnelKey(basePath[i - 1], basePath[i]);
			const O = lineOffsets.get(k)?.get(lineId) ?? { x: 0, y: 0 };
			offsetPath.push({ x: basePath[i].x + O.x, y: basePath[i].y + O.y });
		} else {
			const k_prev = getTunnelKey(basePath[i - 1], basePath[i]);
			const O_prev = lineOffsets.get(k_prev)?.get(lineId) ?? { x: 0, y: 0 };

			const k_next = getTunnelKey(basePath[i], basePath[i + 1]);
			const O_next = lineOffsets.get(k_next)?.get(lineId) ?? { x: 0, y: 0 };

			const B_in = { x: basePath[i].x + O_prev.x, y: basePath[i].y + O_prev.y };
			const B_out = { x: basePath[i].x + O_next.x, y: basePath[i].y + O_next.y };

			const crx = Math.round(basePath[i].x);
			const cry = Math.round(basePath[i].y);
			const cr = cornerRadii?.[`${crx},${cry}`] ?? 0;

			const A = { x: basePath[i - 1].x + O_prev.x, y: basePath[i - 1].y + O_prev.y };
			const C = B_out;
			const D = { x: basePath[i + 1].x + O_next.x, y: basePath[i + 1].y + O_next.y };

			if (cr > 0) {
				const idx = offsetPath.length;
				roundAt.set(idx, cr);
			}
			if (cr > 0 || !isStation) {
				const Q = intersectLines(A, B_in, C, D);
				if (Q) {
					offsetPath.push(Q);
				} else {
					offsetPath.push(B_in);
					if (Math.hypot(B_in.x - B_out.x, B_in.y - B_out.y) > 0.1) offsetPath.push(B_out);
				}
			} else {
				offsetPath.push(B_in);
				if (Math.hypot(B_in.x - B_out.x, B_in.y - B_out.y) > 0.1) {
					offsetPath.push(B_out);
				}
			}
		}
	}
	return { offsetPath, roundAt };
}

export function createPathFromPoints(coords: Point[], roundAt?: Map<number, number>): string {
	if (coords.length === 0) return '';
	const hasRounding = roundAt && roundAt.size > 0;
	if (coords.length < 3 || !hasRounding) {
		let path = `M ${coords[0].x} ${coords[0].y}`;
		for (let i = 1; i < coords.length; i++) path += ` L ${coords[i].x} ${coords[i].y}`;
		return path;
	}

	let path = `M ${coords[0].x} ${coords[0].y}`;
	for (let i = 1; i < coords.length - 1; i++) {
		const prev = coords[i - 1];
		const curr = coords[i];
		const next = coords[i + 1];
		const cr = roundAt!.get(i);
		if (cr != null && cr > 0) {
			const dx1 = curr.x - prev.x;
			const dy1 = curr.y - prev.y;
			const dx2 = next.x - curr.x;
			const dy2 = next.y - curr.y;
			const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
			const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
			if (len1 >= 0.1 && len2 >= 0.1) {
				const r = Math.min(cr, len1 * 0.5, len2 * 0.5);
				const p1x = curr.x - (dx1 / len1) * r;
				const p1y = curr.y - (dy1 / len1) * r;
				const p2x = curr.x + (dx2 / len2) * r;
				const p2y = curr.y + (dy2 / len2) * r;
				path += ` L ${+p1x.toFixed(1)} ${+p1y.toFixed(1)} Q ${curr.x} ${curr.y} ${+p2x.toFixed(1)} ${+p2y.toFixed(1)}`;
				continue;
			}
		}
		path += ` L ${curr.x} ${curr.y}`;
	}
	path += ` L ${coords[coords.length - 1].x} ${coords[coords.length - 1].y}`;
	return path;
}

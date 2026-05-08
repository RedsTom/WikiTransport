import { prepareWithSegments, measureNaturalWidth } from '@chenglou/pretext';

const cache = new Map<string, number>();

export function measureText(text: string, fontSize: number, bold: boolean = false): number {
	const font = `${bold ? 'bold ' : ''}${fontSize}px sans-serif`;
	const key = `${text}|${font}`;
	let w = cache.get(key);
	if (w !== undefined) return w;
	const prepared = prepareWithSegments(text, font);
	w = measureNaturalWidth(prepared);
	cache.set(key, w);
	return w;
}

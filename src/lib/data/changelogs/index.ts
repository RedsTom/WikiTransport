export interface ChangelogEntry {
	version: string;
	title: string;
	summary: string;
	date: string;
	content: string;
}

const enModules = import.meta.glob('./en/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const frModules = import.meta.glob('./fr/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function versionFromPath(path: string): string {
	return path.split('/').pop()!.replace('.md', '');
}

function parseContent(raw: string): {
	title: string;
	summary: string;
	date: string;
	content: string;
} {
	const lines = raw.trimStart().split('\n');
	const title = lines[0]?.replace(/^#\s*/, '').trim() ?? '';
	let summary = '';
	let date = '';
	let contentStart = 0;
	for (let i = 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (trimmed.startsWith('Summary:')) {
			summary = trimmed.replace(/^Summary:\s*/, '').trim();
		} else if (trimmed.startsWith('Date:')) {
			date = trimmed.replace(/^Date:\s*/, '').trim();
			contentStart = i + 1;
		}
	}
	const content = lines.slice(contentStart).join('\n').trim();
	return { title, summary, date, content };
}

export interface LocalizedChangelog {
	version: string;
	date: string;
	titleEn: string;
	titleFr: string;
	summaryEn: string;
	summaryFr: string;
	contentEn: string;
	contentFr: string;
}

function loadAll(): LocalizedChangelog[] {
	const versions = new Set<string>();
	for (const path of Object.keys(enModules)) versions.add(versionFromPath(path));
	for (const path of Object.keys(frModules)) versions.add(versionFromPath(path));

	const result: LocalizedChangelog[] = [];
	for (const version of versions) {
		const enPath = Object.keys(enModules).find((p) => versionFromPath(p) === version);
		const frPath = Object.keys(frModules).find((p) => versionFromPath(p) === version);
		if (!enPath || !frPath) continue;

		const enParsed = parseContent(enModules[enPath]);
		const frParsed = parseContent(frModules[frPath]);

		result.push({
			version,
			date: enParsed.date || frParsed.date,
			titleEn: enParsed.title,
			titleFr: frParsed.title,
			summaryEn: enParsed.summary,
			summaryFr: frParsed.summary,
			contentEn: enParsed.content,
			contentFr: frParsed.content
		});
	}

	result.sort((a, b) => {
		const aParts = a.version.split('.').map((p) => parseInt(p, 10) || 0);
		const bParts = b.version.split('.').map((p) => parseInt(p, 10) || 0);
		for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
			const diff = (bParts[i] ?? 0) - (aParts[i] ?? 0);
			if (diff !== 0) return diff;
		}
		return 0;
	});

	return result;
}

export const changelogs = loadAll();

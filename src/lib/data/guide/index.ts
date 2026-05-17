export interface GuideSection {
	id: string;
	slug: string;
	title: string;
	order: number;
	updated: string;
	content: string;
	locale: string;
}

interface Frontmatter {
	id?: string;
	title?: string;
	order?: number;
	updated?: string;
}

const modules = import.meta.glob('/src/lib/data/guide/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; content: string } {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match) return { frontmatter: {}, content: raw.trim() };

	const fm: Frontmatter = {};
	for (const line of match[1].split('\n')) {
		const colonIdx = line.indexOf(':');
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		let value: string | number = line.slice(colonIdx + 1).trim();
		if (key === 'order') value = Number(value);
		fm[key as keyof Frontmatter] = value as never;
	}
	return { frontmatter: fm, content: match[2].trim() };
}

function slugFromPath(filepath: string): string {
	return filepath.split('/').pop()?.replace('.md', '') ?? '';
}

function localeFromPath(filepath: string): string {
	return filepath.includes('/en/') ? 'en' : 'fr';
}

export const allSections: GuideSection[] = Object.entries(modules)
	.filter(([path]) => path.endsWith('.md'))
	.map(([path, raw]) => {
		const { frontmatter, content } = parseFrontmatter(raw);
		const slug = slugFromPath(path);
		return {
			id: frontmatter.id ?? slug,
			slug,
			title: frontmatter.title ?? slug,
			order: frontmatter.order ?? 99,
			updated: frontmatter.updated ?? '',
			content,
			locale: localeFromPath(path)
		};
	})
	.sort((a, b) => a.order - b.order);

export function getSections(locale: string): GuideSection[] {
	return allSections.filter((s) => s.locale === locale);
}

export function getSection(locale: string, id: string): GuideSection | undefined {
	return allSections.find((s) => s.locale === locale && s.id === id);
}

export function getSectionById(id: string): GuideSection | undefined {
	return allSections.find((s) => s.id === id);
}

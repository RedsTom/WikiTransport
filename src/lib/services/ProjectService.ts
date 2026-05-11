import { db } from './Database';
import type { Project } from '../types';

export class ProjectService {
	static async getAllProjects(): Promise<Project[]> {
		return await db.projects.orderBy('updatedAt').reverse().toArray();
	}

	static async getProject(id: number): Promise<Project | undefined> {
		return await db.projects.get(id);
	}

	static async createProject(name: string, city: string): Promise<number> {
		let newProjectId: number;

		await db.transaction('rw', db.projects, db.transitTypes, async () => {
			const newProject: Project = {
				name,
				city,
				centerLat: 48.8566, // Paris by default, will improve later
				centerLng: 2.3522,
				zoom: 13,
				updatedAt: new Date()
			};
			newProjectId = (await db.projects.add(newProject)) as number;

			// Add default transit types
			await db.transitTypes.bulkAdd([
				{ projectId: newProjectId, name: 'Bus', icon: 'directions_bus', iconShape: 'circle' },
				{ projectId: newProjectId, name: 'Tramway', icon: 'tram', iconShape: 'square' },
				{ projectId: newProjectId, name: 'Metro', icon: 'subway', iconShape: 'diamond' }
			]);
		});

		return newProjectId!;
	}

	static async deleteProject(id: number): Promise<void> {
		await db.transaction(
			'rw',
			[db.projects, db.transitTypes, db.lines, db.stations, db.routePoints],
			async () => {
				await db.routePoints
					.where('lineId')
					.anyOf(await db.lines.where({ projectId: id }).primaryKeys())
					.delete();
				await db.lines.where({ projectId: id }).delete();
				await db.transitTypes.where({ projectId: id }).delete();
				await db.stations.where({ projectId: id }).delete();
				await db.projects.delete(id);
			}
		);
	}

	static async updateProject(id: number, changes: Partial<Project>): Promise<number> {
		return await db.projects.update(id, { ...changes, updatedAt: new Date() });
	}
}

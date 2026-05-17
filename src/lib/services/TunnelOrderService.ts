import { db } from './Database';
import type { TunnelOrderEntry } from '../types';

export class TunnelOrderService {
	static async getForProject(projectId: number): Promise<TunnelOrderEntry[]> {
		return await db.tunnelOrders.where({ projectId }).toArray();
	}

	static async getForView(projectId: number, viewId: number): Promise<TunnelOrderEntry[]> {
		return await db.tunnelOrders.where({ projectId, viewId }).toArray();
	}

	static async getGlobal(projectId: number): Promise<TunnelOrderEntry[]> {
		return await db.tunnelOrders
			.where({ projectId })
			.filter((e) => e.viewId === undefined)
			.toArray();
	}

	static async set(projectId: number, tunnelKey: string, lineIds: number[], viewId?: number) {
		const existing = await db.tunnelOrders
			.where({ projectId, tunnelKey })
			.filter((e) => e.viewId === viewId)
			.first();
		if (existing) {
			await db.tunnelOrders.update(existing.id!, { lineIds });
		} else {
			await db.tunnelOrders.add({ projectId, viewId, tunnelKey, lineIds });
		}
	}

	static async remove(projectId: number, tunnelKey: string, viewId?: number) {
		const existing = await db.tunnelOrders
			.where({ projectId, tunnelKey })
			.filter((e) => e.viewId === (viewId ?? undefined))
			.first();
		if (existing) {
			await db.tunnelOrders.delete(existing.id!);
		}
	}
}

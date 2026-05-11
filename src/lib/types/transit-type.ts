import type { IconShape } from './interchange';

export interface TransitType {
	id?: number;
	projectId: number;
	name: string;
	iconShape: IconShape;
	icon?: string;
}

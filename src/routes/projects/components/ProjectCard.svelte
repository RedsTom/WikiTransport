<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages.js';
	import type { Project } from '$lib/types';
	import { Button, IconButton, DropdownMenu } from '$lib/components/ui';

	let {
		project,
		onexport,
		onconfirmdelete
	}: {
		project: Project;
		onexport: (projectId: number, compact: boolean) => void;
		onconfirmdelete: (id: number) => void;
	} = $props();
</script>

<div
	class="group relative flex flex-col gap-2 rounded-xl border border-outline/20 bg-surface-variant p-4 transition-shadow hover:shadow-md"
>
	<h3 class="text-lg font-bold text-on-surface">{project.name}</h3>
	<p class="flex items-center gap-1 text-sm text-on-surface-variant">
		<span class="material-symbols-outlined text-sm">location_city</span>
		{project.city}
	</p>
	<p class="text-xs text-on-surface-variant opacity-70">
		{new Date(project.updatedAt).toLocaleDateString()}
	</p>
	<div class="mt-4 flex gap-2">
		<div class="flex-1">
			<Button
				variant="filled"
				class="w-full"
				onclick={() => goto(resolve(`/project/${project.id}`))}
			>
				{m.open()}
			</Button>
		</div>
		<DropdownMenu
			items={[
				{
					label: m.export_standard(),
					icon: 'download',
					action: () => onexport(project.id!, false)
				},
				{
					label: m.export_compact(),
					icon: 'compress',
					action: () => onexport(project.id!, true)
				}
			]}
		>
			<IconButton>
				<span class="material-symbols-outlined">download</span>
			</IconButton>
		</DropdownMenu>
		<IconButton onclick={() => onconfirmdelete(project.id!)}>
			<span class="material-symbols-outlined">delete</span>
		</IconButton>
	</div>
</div>

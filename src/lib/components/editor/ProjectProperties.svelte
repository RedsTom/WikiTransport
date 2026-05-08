<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import type { Project } from '$lib/types/models';

	import { TextField } from '$lib/components/ui';

	let projectName = $state('');
	let projectCity = $state('');

	$effect(() => {
		if (editorState.project) {
			projectName = editorState.project.name;
			projectCity = editorState.project.city;
		}
	});

	async function updateProject(changes: Partial<Project>) {
		if (editorState.project?.id) {
			await ProjectService.updateProject(editorState.project.id, changes);
			editorState.project = { ...editorState.project, ...changes };
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-sm font-bold tracking-wider text-primary uppercase">{m.project_name()}</h3>

	<TextField
		label={m.project_name()}
		bind:value={projectName}
		onchange={() => updateProject({ name: projectName })}
	/>

	<TextField
		label={m.city()}
		bind:value={projectCity}
		onchange={() => updateProject({ city: projectCity })}
	/>
</div>

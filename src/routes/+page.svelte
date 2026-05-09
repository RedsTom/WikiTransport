<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import { ProjectService } from '$lib/services/ProjectService';
	import type { Project } from '$lib/types/models';

	import { Button, Fab, IconButton, Dialog, TextField } from '$lib/components/ui';

	let projects = $state<Project[]>([]);
	let isDialogOpen = $state(false);
	let newProjectName = $state('');
	let newProjectCity = $state('');
	let deleteConfirmId = $state<number | null>(null);
	let deleteConfirmOpen = $state(false);

	onMount(async () => {
		await loadProjects();
	});

	async function loadProjects() {
		projects = await ProjectService.getAllProjects();
	}

	async function handleCreateProject() {
		if (newProjectName.trim() && newProjectCity.trim()) {
			const id = await ProjectService.createProject(newProjectName, newProjectCity);
			isDialogOpen = false;
			newProjectName = '';
			newProjectCity = '';
			goto(`/project/${id}`);
		}
	}

	function confirmDelete(id: number) {
		deleteConfirmId = id;
		deleteConfirmOpen = true;
	}
</script>

<svelte:head>
	<title>{m.app_title()} - {m.my_projects()}</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-on-surface">{m.app_title()}</h1>

		<div class="flex items-center gap-6">
			<!-- Language Selector -->
			<div class="flex items-center gap-2">
				{#each locales as locale (locale)}
					<a
						href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
						data-sveltekit-reload
						class="text-sm font-bold uppercase transition-colors hover:text-primary {page.url.pathname.includes(
							`/${locale}`
						) ||
						(locale === 'en' && !page.url.pathname.includes('/fr'))
							? 'text-primary'
							: 'text-on-surface-variant opacity-70'}"
					>
						{locale}
					</a>
				{/each}
			</div>

			<Fab extended onclick={() => (isDialogOpen = true)}>
				<span class="material-symbols-outlined">add</span>
				{m.new_project()}
			</Fab>
		</div>
	</div>

	<h2 class="mb-4 text-xl text-on-surface-variant">{m.my_projects()}</h2>

	{#if projects.length === 0}
		<div class="rounded-xl border border-outline/20 bg-surface-variant p-12 text-center">
			<span class="material-symbols-outlined mb-2 block text-4xl text-on-surface-variant">map</span>
			<p class="text-on-surface-variant">{m.no_projects()}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project}
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
								onclick={() => goto(`/project/${project.id}`)}
							>
								{m.open()}
							</Button>
						</div>
						<IconButton onclick={() => confirmDelete(project.id!)}>
							<span class="material-symbols-outlined">delete</span>
						</IconButton>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog bind:open={isDialogOpen}>
	{#snippet title()}
		{m.new_project()}
	{/snippet}
	<div class="flex flex-col gap-4 pt-2">
		<TextField bind:value={newProjectName} label={m.project_name()} />
		<TextField bind:value={newProjectCity} label={m.city()} />
	</div>
	{#snippet actions()}
		<Button variant="text" onclick={() => (isDialogOpen = false)}>
			{m.cancel()}
		</Button>
		<Button variant="filled" onclick={handleCreateProject}>
			{m.create()}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={deleteConfirmOpen}>
	{#snippet title()}
		{m.delete()}
	{/snippet}
	<p>{m.delete()} ?</p>
	{#snippet actions()}
		<Button
			variant="text"
			onclick={() => {
				deleteConfirmOpen = false;
				deleteConfirmId = null;
			}}
		>
			{m.cancel()}
		</Button>
		<Button
			variant="filled"
			onclick={async () => {
				if (deleteConfirmId !== null) {
					await ProjectService.deleteProject(deleteConfirmId);
					await loadProjects();
					deleteConfirmOpen = false;
					deleteConfirmId = null;
				}
			}}
		>
			{m.delete()}
		</Button>
	{/snippet}
</Dialog>

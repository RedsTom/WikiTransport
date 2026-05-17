<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { locales } from '$lib/paraglide/runtime';
	import { setLocale, useLocale } from '$lib/locale.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { ProjectService } from '$lib/services/ProjectService';
	import { ProjectExportService } from '$lib/services/ProjectExportService';
	import { ProjectImportService } from '$lib/services/ProjectImportService';
	import type { Project } from '$lib/types';
	import BetaNotice from './components/BetaNotice.svelte';
	import ProjectCard from './components/ProjectCard.svelte';
	import ChangelogSection from './components/ChangelogSection.svelte';

	import {
		Button,
		Fab,
		IconButton,
		Dialog,
		TextField,
		NativeSelect,
		CircularProgress,
		DropdownMenu
	} from '$lib/components/ui';

	let currentLocale = $derived(useLocale());

	let projects = $state<Project[]>([]);
	let projectsLoading = $state(true);

	let isDialogOpen = $state(false);
	let newProjectName = $state('');
	let newProjectCity = $state('');

	let deleteConfirmId = $state<number | null>(null);
	let deleteConfirmOpen = $state(false);

	let fileInputEl: HTMLInputElement;
	let importBuffer: ArrayBuffer | null = null;
	let importProjectName = $state('');
	let importNewName = $state('');
	let importNewCity = $state('');
	let importMode: 'new' | 'update' = $state('new');
	let importTargetProjectId = $state('');
	let importDialogOpen = $state(false);
	let importConfirmOpen = $state(false);
	let importError = $state('');
	let importLoading = $state(false);

	onMount(async () => {
		await loadProjects();
	});

	async function loadProjects() {
		projectsLoading = true;
		projects = await ProjectService.getAllProjects();
		projectsLoading = false;
	}

	async function handleCreateProject() {
		if (newProjectName.trim() && newProjectCity.trim()) {
			const id = await ProjectService.createProject(newProjectName, newProjectCity);
			isDialogOpen = false;
			newProjectName = '';
			newProjectCity = '';
			goto(resolve(`/project/${id}`));
		}
	}

	function confirmDelete(id: number) {
		deleteConfirmId = id;
		deleteConfirmOpen = true;
	}

	async function handleExport(projectId: number, compact: boolean) {
		const project = projects.find((p) => p.id === projectId);
		if (!project) return;
		const { blob, extension } = await ProjectExportService.exportProject(projectId, compact);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${project.name}.${extension}`.replace(/\s+/g, '_');
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImportClick() {
		fileInputEl.click();
	}

	async function handleFileSelected(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		importError = '';
		try {
			importBuffer = await file.arrayBuffer();
			const preview = await ProjectImportService.previewProject(importBuffer);
			importProjectName = preview.name;
			importNewName = preview.name ?? '';
			importNewCity = preview.city ?? '';
			importMode = 'new';
			importTargetProjectId = '';
			importDialogOpen = true;
		} catch {
			window.alert(m.import_invalid_file());
			importBuffer = null;
		}
	}

	function handleStartImport() {
		if (importMode === 'new') {
			if (!importNewName.trim() || !importNewCity.trim()) return;
			doImport();
		} else if (importMode === 'update' && importTargetProjectId) {
			importDialogOpen = false;
			importConfirmOpen = true;
		}
	}

	async function doImport() {
		if (!importBuffer) return;
		importLoading = true;
		importError = '';
		try {
			const targetId = importMode === 'update' ? Number(importTargetProjectId) : undefined;
			const overrides =
				importMode === 'new' ? { name: importNewName, city: importNewCity } : undefined;
			const newId = await ProjectImportService.importProject(
				importBuffer,
				importMode,
				targetId,
				overrides
			);
			closeDialogs();
			await loadProjects();
			if (importMode === 'new') {
				goto(resolve(`/project/${newId}`));
			}
		} catch (e) {
			console.error('Import failed:', e);
			importError = m.import_failed();
			importDialogOpen = true;
		} finally {
			importLoading = false;
		}
	}

	function closeDialogs() {
		importDialogOpen = false;
		importConfirmOpen = false;
		importBuffer = null;
		importError = '';
	}

	let importTargetProject = $derived(
		importTargetProjectId ? projects.find((p) => p.id === Number(importTargetProjectId)) : null
	);
</script>

<svelte:head>
	<title>{m.app_title()} - {m.my_projects()}</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
	<header class="mb-8 flex items-center justify-between">
		<a
			href={resolve('/')}
			class="flex items-center gap-2 text-xl font-bold text-on-surface no-underline transition-opacity hover:opacity-70"
		>
			<img src="/assets/logo.svg" alt="WikiTransport" class="h-8 w-8" />
			{m.app_title()}
		</a>

		<div class="flex items-center gap-6">
			<a
				href={resolve('/guide')}
				class="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
			>
				{m.guide()}
			</a>
			<a
				href={resolve('/changelogs')}
				class="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
			>
				{m.changelog()}
			</a>
			<div class="flex items-center gap-2">
				{#each locales as l (l)}
					<button
						onclick={() => setLocale(l)}
						class="text-sm font-bold uppercase transition-colors hover:text-primary {useLocale() ===
						l
							? 'text-primary'
							: 'text-on-surface-variant opacity-70'}"
					>
						{l}
					</button>
				{/each}
			</div>

			<div class="flex items-center gap-3">
				<Button variant="outlined" onclick={handleImportClick}>
					<span class="material-symbols-outlined">upload_file</span>
					{m.import_project()}
				</Button>
				<Fab extended onclick={() => (isDialogOpen = true)}>
					<span class="material-symbols-outlined">add</span>
					{m.new_project()}
				</Fab>
			</div>
		</div>
	</header>

	<input
		bind:this={fileInputEl}
		type="file"
		accept=".wtp,.wtpc"
		hidden
		onchange={handleFileSelected}
	/>

	<h2 class="mb-4 text-xl text-on-surface-variant">{m.my_projects()}</h2>

	<BetaNotice />

	{#if projectsLoading}
		<div class="flex items-center justify-center py-16">
			<CircularProgress class="h-8 w-8" />
		</div>
	{:else if projects.length === 0}
		<div class="rounded-xl border border-outline/20 bg-surface-variant p-12 text-center">
			<span class="material-symbols-outlined mb-2 block text-4xl text-on-surface-variant">map</span>
			<p class="text-on-surface-variant">{m.no_projects()}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<ProjectCard {project} onexport={handleExport} onconfirmdelete={confirmDelete} />
			{/each}
		</div>
	{/if}

	<ChangelogSection />
</div>

<Dialog bind:open={isDialogOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">add</span>
	{/snippet}
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
		<Button variant="filled" autofocus onclick={handleCreateProject}>
			{m.create()}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={deleteConfirmOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">delete</span>
	{/snippet}
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
			autofocus
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

<Dialog bind:open={importDialogOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">upload_file</span>
	{/snippet}
	{#snippet title()}
		{m.import_title()}
	{/snippet}
	<div class="flex flex-col gap-4 pt-2">
		{#if importProjectName}
			<p class="text-sm font-semibold text-on-surface">{importProjectName}</p>
		{/if}

		<label class="flex cursor-pointer items-center gap-2">
			<input type="radio" bind:group={importMode} value="new" />
			<span class="text-sm">{m.import_new()}</span>
		</label>

		{#if importMode === 'new'}
			<div class="ml-6 flex flex-col gap-3">
				<TextField bind:value={importNewName} label={m.project_name()} />
				<TextField bind:value={importNewCity} label={m.city()} />
			</div>
		{/if}

		<label class="flex cursor-pointer items-center gap-2">
			<input type="radio" bind:group={importMode} value="update" />
			<span class="text-sm">{m.import_update()}</span>
		</label>

		{#if importMode === 'update'}
			<div class="ml-6">
				<NativeSelect bind:value={importTargetProjectId}>
					<option value="">{m.import_select_project()}</option>
					{#each projects as p (p.id)}
						<option value={String(p.id)}>{p.name}</option>
					{/each}
				</NativeSelect>
			</div>
			{#if importTargetProject}
				<p class="text-sm text-error">
					{m.import_confirm({ name: importTargetProject.name })}
				</p>
			{/if}
		{/if}

		{#if importError}
			<p class="text-sm text-error">{importError}</p>
		{/if}
	</div>
	{#snippet actions()}
		<Button variant="text" onclick={closeDialogs}>
			{m.cancel()}
		</Button>
		<Button variant="filled" autofocus disabled={importLoading} onclick={handleStartImport}>
			{m.import_project()}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={importConfirmOpen}>
	{#snippet icon()}
		<span class="material-symbols-outlined">warning</span>
	{/snippet}
	{#snippet title()}
		{m.import_title()}
	{/snippet}
	<p>
		{#if importTargetProject}
			{m.import_confirm({ name: importTargetProject.name })}
		{/if}
	</p>
	{#snippet actions()}
		<Button variant="text" onclick={closeDialogs}>
			{m.cancel()}
		</Button>
		<Button variant="filled" autofocus disabled={importLoading} onclick={doImport}>
			{m.import_project()}
		</Button>
	{/snippet}
</Dialog>

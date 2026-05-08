<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { TransitTypeService } from '$lib/services/TransitTypeService';
	import type { TransitType } from '$lib/types/models';

	import { Button, TextField, Select, Dialog } from '$lib/components/ui';
	import type { IconShape } from '$lib/types/models';

	const ICON_OPTIONS = [
		'directions_bus',
		'train',
		'subway',
		'tram',
		'directions_railway',
		'directions_boat',
		'flight',
		'pedal_bike',
		'electric_scooter',
		'local_taxi',
		'directions_car',
		'airline_seat_flat',
		'directions_walk',
		'ski_lift',
		'cable'
	];

	let typeName = $state('');
	let typeShape = $state<IconShape>('circle');
	let typeIcon = $state('');

	let selectedType = $derived(
		editorState.transitTypes.find((t) => t.id === editorState.selectedTransitTypeId)
	);

	$effect(() => {
		if (selectedType) {
			typeName = selectedType.name;
			typeShape = selectedType.iconShape;
			typeIcon = selectedType.icon ?? '';
		}
	});

	async function updateType(changes: Partial<TransitType>) {
		if (selectedType?.id) {
			await TransitTypeService.updateType(selectedType.id, changes);
			await editorState.loadTransitTypes();
		}
	}

	let deleteConfirmOpen = $state(false);

	async function handleDeleteType() {
		if (selectedType?.id) {
			await TransitTypeService.deleteType(selectedType.id);
			editorState.selectedTransitTypeId = null;
			await editorState.reloadAll();
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-sm font-bold text-primary">Type</h3>

	<TextField label="Name" bind:value={typeName} onchange={() => updateType({ name: typeName })} />

	<div class="flex flex-col gap-2">
		<span class="text-sm text-on-surface-variant">Icon</span>
		<div class="grid grid-cols-5 gap-1">
			{#each ICON_OPTIONS as iconName}
				<button
					class="flex items-center justify-center rounded-md border p-2 text-lg transition-colors {typeIcon ===
					iconName
						? 'border-primary bg-primary-container text-primary'
						: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
					onclick={() => updateType({ icon: typeIcon === iconName ? '' : iconName })}
					title={iconName}
				>
					<span class="material-symbols-outlined">{iconName}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="m3-field">
		<Select
			label={m.shape()}
			options={[
				{ value: 'circle', label: m.circle() },
				{ value: 'square', label: m.square() },
				{ value: 'diamond', label: m.diamond() },
				{ value: 'pill', label: m.pill() }
			]}
			bind:value={typeShape}
		/>
	</div>

	<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
		<span class="material-symbols-outlined">delete</span>
		{m.delete()}
	</Button>

	<Dialog bind:open={deleteConfirmOpen}>
		{#snippet title()}{m.delete()}{/snippet}
		<p>{m.delete()} ?</p>
		{#snippet actions()}
			<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
			<Button
				variant="filled"
				onclick={async () => {
					await handleDeleteType();
					deleteConfirmOpen = false;
				}}
			>
				{m.delete()}
			</Button>
		{/snippet}
	</Dialog>
</div>

<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { TransitTypeService } from '$lib/services/TransitTypeService';
	import { EditorService } from '$lib/services/EditorService';
	import { TextField, Tooltip, Select, Button, Dialog } from '$lib/components/ui';
	import type { TransitType, IconShape } from '$lib/types';

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
		'downhill_skiing',
		'cable'
	] as const;

	function iconLabel(icon: string): string {
		const labels: Record<string, () => string> = {
			directions_bus: m.icon_bus,
			train: m.icon_train,
			subway: m.icon_subway,
			tram: m.icon_tram,
			directions_railway: m.icon_railway,
			directions_boat: m.icon_boat,
			flight: m.icon_flight,
			pedal_bike: m.icon_bike,
			electric_scooter: m.icon_scooter,
			local_taxi: m.icon_taxi,
			directions_car: m.icon_car,
			airline_seat_flat: m.icon_sleeper,
			directions_walk: m.icon_walk,
			downhill_skiing: m.icon_ski,
			cable: m.icon_cable
		};
		return labels[icon]?.() ?? icon;
	}

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
			await EditorService.reloadAll(editorState);
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-sm font-bold text-primary">{m.type_heading()}</h3>

	<TextField
		label={m.name()}
		bind:value={typeName}
		onchange={() => updateType({ name: typeName })}
	/>

	<div class="flex flex-col gap-2">
		<span class="text-sm text-on-surface-variant">{m.icon()}</span>
		<div class="grid grid-cols-5 gap-1">
			{#each ICON_OPTIONS as iconName}
				<Tooltip text={iconLabel(iconName)}>
					<button
						class="flex items-center justify-center rounded-md border p-2 text-lg transition-colors {typeIcon ===
						iconName
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => updateType({ icon: typeIcon === iconName ? '' : iconName })}
					>
						<span class="material-symbols-outlined">{iconName}</span>
					</button>
				</Tooltip>
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
		<p>{m.delete_type_confirm()}</p>
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

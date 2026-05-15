<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { EditorService } from '$lib/services/EditorService';

	import { Button, NumberInput, Dialog } from '$lib/components/ui';

	let anchorPosX = $state(0);
	let anchorPosY = $state(0);
	let deleteConfirmOpen = $state(false);

	let selectedAnchor = $derived(
		editorState.anchorPoints.find((a) => a.id === editorState.selectedAnchorId)
	);

	let anchorLine = $derived(
		selectedAnchor ? editorState.lines.find((l) => l.id === selectedAnchor.lineId) : null
	);

	$effect(() => {
		if (selectedAnchor) {
			anchorPosX = selectedAnchor.schematicX;
			anchorPosY = selectedAnchor.schematicY;
		}
	});

	async function setAnchorPosition(x: number, y: number) {
		anchorPosX = x;
		anchorPosY = y;
		if (selectedAnchor?.id) {
			await EditorService.updateAnchorPosition(editorState, selectedAnchor.id, x, y);
		}
	}

	async function handleDeleteAnchor() {
		await EditorService.deleteAnchor(editorState, selectedAnchor!.id!);
	}
</script>

<div class="flex flex-col gap-4">
	<h3 class="flex items-center gap-2 text-sm font-bold tracking-wider text-primary uppercase">
		<span class="material-symbols-outlined text-base">anchor</span>{m.anchor()}
	</h3>

	<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
		<span class="text-sm text-on-surface-variant">{m.position()}</span>
		<div class="flex gap-2">
			<NumberInput
				label="X"
				bind:value={anchorPosX}
				onchange={() => setAnchorPosition(anchorPosX, anchorPosY)}
				class="flex-1"
			/>
			<NumberInput
				label="Y"
				bind:value={anchorPosY}
				onchange={() => setAnchorPosition(anchorPosX, anchorPosY)}
				class="flex-1"
			/>
		</div>
	</div>

	{#if anchorLine}
		<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
			<span class="text-sm text-on-surface-variant">{m.line()}</span>
			<div class="flex items-center gap-2 rounded bg-surface-variant p-2 text-sm">
				<div
					class="h-3 w-3 shrink-0 rounded-full"
					style="background-color: {anchorLine.color}"
				></div>
				{anchorLine.name}
			</div>
		</div>
	{/if}

	<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
		<span class="material-symbols-outlined">delete</span>
		{m.delete_anchor()}
	</Button>

	<Dialog bind:open={deleteConfirmOpen}>
		{#snippet title()}{m.delete_anchor()}{/snippet}
		<p>{m.delete_anchor_confirm()}</p>
		{#snippet actions()}
			<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
			<Button
				variant="filled"
				onclick={async () => {
					await handleDeleteAnchor();
					deleteConfirmOpen = false;
				}}>{m.delete()}</Button
			>
		{/snippet}
	</Dialog>
</div>

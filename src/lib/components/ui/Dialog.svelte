<script lang="ts">
	let {
		open = $bindable(false),
		onclose,
		children,
		title,
		actions,
		class: className = '',
		...rest
	}: {
		open?: boolean;
		onclose?: () => void;
		children?: import('svelte').Snippet;
		title?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		if (open && !el.open) {
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	});

	function handleClose() {
		if (open) {
			open = false;
			onclose?.();
		}
	}
</script>

<dialog bind:this={dialogEl} onclose={handleClose} class="m3-dialog {className}" {...rest}>
	<div class="m3-dialog__content">
		{#if title}
			<div class="m3-dialog__title">
				{@render title()}
			</div>
		{/if}
		{@render children?.()}
	</div>
	{#if actions}
		<div class="m3-dialog__actions">
			{@render actions()}
		</div>
	{/if}
</dialog>

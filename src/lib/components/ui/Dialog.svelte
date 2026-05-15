<script lang="ts">
	let {
		open = $bindable(false),
		onclose,
		children,
		title,
		icon,
		actions,
		class: className = '',
		...rest
	}: {
		open?: boolean;
		onclose?: () => void;
		children?: import('svelte').Snippet;
		title?: import('svelte').Snippet;
		icon?: import('svelte').Snippet;
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
			requestAnimationFrame(() => {
				const auto = el.querySelector('[autofocus]') as HTMLElement | null;
				if (auto) auto.focus();
			});
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
	<div class="m3-dialog__header">
		{#if icon}
			<div class="m3-dialog__icon">
				{@render icon()}
			</div>
		{/if}
		{#if title}
			<div class="m3-dialog__title">
				{@render title()}
			</div>
		{/if}
	</div>
	{#if children}
		<div class="m3-dialog__body">
			{@render children()}
		</div>
	{/if}
	{#if actions}
		<div class="m3-dialog__actions">
			{@render actions()}
		</div>
	{/if}
</dialog>

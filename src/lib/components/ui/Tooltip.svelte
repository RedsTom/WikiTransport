<script lang="ts">
	let {
		text = '',
		children,
		class: className = ''
	}: {
		text: string;
		children?: import('svelte').Snippet;
		class?: string;
	} = $props();

	let wrapperEl: HTMLDivElement;
	let tooltipEl: HTMLDivElement;
	let tooltipStyle = $state('');

	function show() {
		if (!wrapperEl || !tooltipEl) return;
		const rect = wrapperEl.getBoundingClientRect();
		const tw = tooltipEl.offsetWidth;
		const vw = window.innerWidth;
		let left = rect.left + rect.width / 2 - tw / 2;
		left = Math.max(4, Math.min(left, vw - tw - 4));
		tooltipStyle = `left:${left}px;top:${rect.top - tooltipEl.offsetHeight - 6}px`;
		tooltipEl.showPopover();
	}

	function hide() {
		tooltipEl?.hidePopover();
	}
</script>

<div
	bind:this={wrapperEl}
	class="component-tooltip-wrapper {className}"
	onmouseenter={show}
	onmouseleave={hide}
	role="none"
>
	{@render children?.()}
	<div
		bind:this={tooltipEl}
		class="component-tooltip"
		popover="manual"
		role="tooltip"
		style={tooltipStyle}
	>
		{text}
	</div>
</div>

<style>
	.component-tooltip-wrapper {
		display: inline-flex;
	}
	.component-tooltip {
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-sm, 4px);
		background: var(--color-on-surface, #1a1a2e);
		color: var(--color-surface, #ffffff);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
		inset: auto;
		margin: 0;
		border: none;
	}
</style>

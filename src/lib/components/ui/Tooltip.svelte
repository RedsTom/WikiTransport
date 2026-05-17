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
	let left = $state(0);
	let top = $state(0);

	function show() {
		if (!wrapperEl || !tooltipEl) return;
		const rect = wrapperEl.getBoundingClientRect();
		const vw = window.innerWidth;
		tooltipEl.showPopover();
		const tw = tooltipEl.offsetWidth;
		const th = tooltipEl.offsetHeight;
		left = Math.max(4, Math.min(rect.left + rect.width / 2 - tw / 2, vw - tw - 4));
		top = rect.top - th - 6;
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
		style:left="{left}px"
		style:top="{top}px"
		style:right="auto"
		style:bottom="auto"
	>
		{text}
	</div>
</div>

<style>
	.component-tooltip-wrapper {
		position: relative;
		display: inline-flex;
	}
	.component-tooltip {
		position: fixed;
		inset: unset;
		margin: 0;
		z-index: 100;
		padding: 0.25rem 0.625rem;
		text-transform: none;
		border-radius: var(--radius-sm, 4px);
		background: var(--color-on-surface, #1a1a2e);
		color: var(--color-surface, #ffffff);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition:
			opacity 0.12s ease,
			display 0.12s ease allow-discrete;
	}
	.component-tooltip:popover-open {
		opacity: 1;
	}
	@starting-style {
		.component-tooltip:popover-open {
			opacity: 0;
		}
	}
</style>

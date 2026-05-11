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
	let visible = $state(false);
	let left = $state(0);
	let top = $state(0);

	function show() {
		if (!wrapperEl || !tooltipEl) return;
		const rect = wrapperEl.getBoundingClientRect();
		const tw = tooltipEl.offsetWidth;
		const vw = window.innerWidth;
		left = Math.max(4, Math.min(rect.left + rect.width / 2 - tw / 2, vw - tw - 4));
		top = rect.top - tooltipEl.offsetHeight - 6;
		visible = true;
	}

	function hide() {
		visible = false;
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
		class:visible
		role="tooltip"
		style:left="{left}px"
		style:top="{top}px"
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
		z-index: 100;
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-sm, 4px);
		background: var(--color-on-surface, #1a1a2e);
		color: var(--color-surface, #ffffff);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.12s ease;
	}
	.component-tooltip.visible {
		opacity: 1;
	}
</style>

<script lang="ts">
	let {
		value = $bindable(6),
		min = 1,
		max = 20,
		step = 1,
		...rest
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		[key: string]: unknown;
	} = $props();
</script>

<div class="component-slider">
	<input
		type="range"
		{min}
		{max}
		{step}
		bind:value
		class="component-slider__input"
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={value}
		{...rest}
	/>
</div>

<style>
	.component-slider {
		display: flex;
		align-items: center;
		width: 100%;
		height: 1.25rem;
	}
	.component-slider__input {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 0.25rem;
		border-radius: 9999px;
		background: var(--color-outline, #cbd5e1);
		outline: none;
		cursor: pointer;
	}
	.component-slider__input::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 9999px;
		background: var(--color-primary, #1e3a5f);
		border: 2px solid var(--color-surface, #ffffff);
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.15);
		cursor: pointer;
		transition: box-shadow 0.15s ease;
	}
	.component-slider__input::-moz-range-thumb {
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 9999px;
		background: var(--color-primary, #1e3a5f);
		border: 2px solid var(--color-surface, #ffffff);
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.15);
		cursor: pointer;
		border: none;
	}
	.component-slider__input:focus-visible {
		outline: 2px solid var(--color-primary, #1e3a5f);
		outline-offset: 2px;
	}
</style>

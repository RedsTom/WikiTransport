<script lang="ts">
	let {
		value = $bindable(0),
		min = undefined as number | undefined,
		max = undefined as number | undefined,
		step = 1,
		label = '',
		class: className = '',
		onchange
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		label?: string;
		class?: string;
		onchange?: () => void;
	} = $props();

	let inputEl: HTMLInputElement;
	let isDragging = $state(false);
	let didDrag = $state(false);
	let dragStartX = 0;
	let dragStartValue = 0;

	function clamp(v: number): number {
		if (min !== undefined) v = Math.max(min, v);
		if (max !== undefined) v = Math.min(max, v);
		return v;
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.target !== inputEl) return;
		didDrag = false;
		dragStartX = e.clientX;
		dragStartValue = value;
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function commit(v: number) {
		value = v;
		onchange?.();
	}

	function handleMouseMove(e: MouseEvent) {
		const delta = e.clientX - dragStartX;
		if (!didDrag && Math.abs(delta) > 3) {
			didDrag = true;
			isDragging = true;
		}
		if (!didDrag) return;
		const increment = Math.round(delta / 2) * step;
		const newValue = clamp(dragStartValue + increment);
		if (newValue !== value) {
			commit(newValue);
		}
	}

	function handleMouseUp() {
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
		if (!didDrag && inputEl) {
			inputEl.focus();
			inputEl.select();
		}
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const dir = e.deltaY > 0 ? -step : step;
		commit(clamp(value + dir));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			commit(clamp(value + step));
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			commit(clamp(value - step));
		}
	}

	function handleInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		const parsed = Number(raw);
		if (!isNaN(parsed)) {
			commit(clamp(parsed));
		}
	}
</script>

<div class="flex flex-col gap-0.5 {className}">
	{#if label}
		<span class="text-xs text-on-surface-variant">{label}</span>
	{/if}
	<input
		bind:this={inputEl}
		type="text"
		inputmode="numeric"
		value={value}
		oninput={handleInput}
		onmousedown={handleMouseDown}
		onwheel={handleWheel}
		onkeydown={handleKeydown}
		class="w-full cursor-ew-resize rounded-md border border-outline/20 bg-transparent px-2.5 py-1.5 text-sm tabular-nums outline-none transition-colors focus:border-primary {isDragging ? 'border-primary bg-primary-container/20' : ''}"
	/>
</div>



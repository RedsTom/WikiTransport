<script lang="ts" module>
	export interface ContextMenuItem {
		label: string;
		icon?: string;
		action?: () => void;
		separator?: boolean;
		disabled?: boolean;
		children?: ContextMenuItem[];
		searchable?: boolean;
		groupLabel?: boolean;
	}
</script>

<script lang="ts">
	import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom';
	import { tick, type Snippet } from 'svelte';

	let {
		x = 0,
		y = 0,
		items = [] as ContextMenuItem[],
		open = false,
		onclose = () => {},
		submenu = undefined
	}: {
		x: number;
		y: number;
		items: ContextMenuItem[];
		open: boolean;
		onclose: () => void;
		submenu?: Snippet<[item: ContextMenuItem, close: () => void]>;
	} = $props();

	let menuEl = $state<HTMLDivElement | null>(null);
	let activeSubmenu = $state<number | null>(null);
	let focusIndex = $state(-1);
	let submenuSearch = $state('');
	let cleanup: (() => void) | null = null;
	let closeTimeout: ReturnType<typeof setTimeout> | null = null;

	function scheduleClose() {
		closeTimeout = setTimeout(() => (activeSubmenu = null), 120);
	}

	function cancelClose() {
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
	}

	let visibleChildren = $derived(
		activeSubmenu !== null
			? (items[activeSubmenu]?.children ?? []).filter(
					(c) => !submenuSearch || c.label.toLowerCase().includes(submenuSearch.toLowerCase())
				)
			: []
	);

	function reposition() {
		if (!menuEl) return;
		computePosition(
			{
				getBoundingClientRect: () => ({
					width: 0,
					height: 0,
					x: x,
					y: y,
					top: y,
					left: x,
					right: x,
					bottom: y
				})
			} as Element,
			menuEl,
			{
				placement: 'right-start',
				middleware: [flip(), shift({ padding: 8 }), offset(4)]
			}
		).then(({ x: fx, y: fy }) => {
			menuEl!.style.left = `${fx}px`;
			menuEl!.style.top = `${fy}px`;
		});
	}

	$effect(() => {
		if (open && menuEl) {
			reposition();
			cleanup?.();
			cleanup = autoUpdate(
				{
					getBoundingClientRect: () => ({
						width: 0,
						height: 0,
						x: x,
						y: y,
						top: y,
						left: x,
						right: x,
						bottom: y
					})
				} as Element,
				menuEl,
				reposition
			);
			focusIndex = -1;
			activeSubmenu = null;
			cancelClose();
		} else {
			cleanup?.();
			cleanup = null;
		}
		return () => {
			cleanup?.();
			cancelClose();
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		const flat = flattenItems(items);
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusIndex = focusIndex < flat.length - 1 ? focusIndex + 1 : 0;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusIndex = focusIndex > 0 ? focusIndex - 1 : flat.length - 1;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const entry = flat[focusIndex];
			if (entry && !entry.disabled && !entry.separator) {
				if (entry.children) {
					activeSubmenu = activeSubmenu === focusIndex ? null : focusIndex;
				} else {
					entry.action?.();
					onclose();
				}
			}
		} else if (e.key === 'ArrowRight') {
			const entry = flat[focusIndex];
			if (entry?.children) {
				e.preventDefault();
				activeSubmenu = focusIndex;
			}
		} else if (e.key === 'ArrowLeft') {
			activeSubmenu = null;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (menuEl && !menuEl.contains(e.target as Node)) {
			onclose();
		}
	}

	function handleContextMenuOutside(e: MouseEvent) {
		if (menuEl && !menuEl.contains(e.target as Node)) {
			onclose();
		}
		e.preventDefault();
	}

	$effect(() => {
		if (open) {
			tick().then(() => {
				document.addEventListener('click', handleClickOutside, true);
				document.addEventListener('contextmenu', handleContextMenuOutside, true);
			});
		}
		return () => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('contextmenu', handleContextMenuOutside, true);
		};
	});

	function flattenItems(its: ContextMenuItem[]): ContextMenuItem[] {
		const result: ContextMenuItem[] = [];
		for (const item of its) {
			result.push(item);
			if (item.children && activeSubmenu === result.length - 1) {
				result.push(...item.children);
			}
		}
		return result;
	}

	function handleItemClick(entry: ContextMenuItem) {
		if (entry.disabled || entry.separator) return;
		if (entry.children) return;
		entry.action?.();
		onclose();
	}
</script>

{#if open}
	<div
		bind:this={menuEl}
		class="context-menu"
		role="menu"
		tabindex="-1"
		onkeydown={handleKeydown}
		oncontextmenu={(e) => e.preventDefault()}
		onmouseover={() => (focusIndex = -1)}
		onfocus={() => (focusIndex = -1)}
	>
		{#each items as entry, i (i)}
			{#if entry.separator}
				<div class="context-menu__separator" role="separator"></div>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="context-menu__item {entry.disabled
						? 'context-menu__item--disabled'
						: ''} {focusIndex === i ? 'context-menu__item--focused' : ''}"
					role="menuitem"
					tabindex={entry.disabled ? -1 : 0}
					class:context-menu__item--has-sub={entry.children}
					onclick={() => handleItemClick(entry)}
					onmouseenter={() => {
						focusIndex = i;
						if (entry.children) {
							submenuSearch = '';
							activeSubmenu = i;
							cancelClose();
						}
					}}
					onmouseleave={() => {
						if (entry.children && activeSubmenu === i) {
							scheduleClose();
						}
					}}
				>
					<div class="context-menu__item-content">
						{#if entry.icon}
							<span class="context-menu__icon material-symbols-outlined">{entry.icon}</span>
						{/if}
						<span class="context-menu__label">{entry.label}</span>
					</div>
					{#if entry.children}
						<span class="context-menu__chevron material-symbols-outlined">chevron_right</span>
					{/if}
				</div>

				{#if entry.children && activeSubmenu === i}
					<div
						class="context-menu__submenu"
						role="menu"
						tabindex="-1"
						oncontextmenu={(e) => e.preventDefault()}
						onmouseenter={cancelClose}
						onmouseleave={scheduleClose}
					>
						{#if submenu}
							{@render submenu(entry, () => onclose())}
						{:else}
							{#if entry.searchable}
								<div class="m3-menu__search">
									<span class="m3-menu__search-icon material-symbols-outlined">search</span>
									<input
										type="text"
										class="m3-menu__search-input"
										placeholder="Search lines…"
										bind:value={submenuSearch}
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => {
											e.stopPropagation();
											if (e.key === 'Escape') {
												activeSubmenu = null;
												submenuSearch = '';
											}
										}}
									/>
								</div>
							{/if}
							{#each visibleChildren as sub, j (j)}
								{#if sub.groupLabel}
									<div class="m3-menu__group-label">{sub.label}</div>
								{:else if sub.separator}
									<div class="m3-menu__separator" role="separator"></div>
								{:else}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div
										class="m3-menu__item {sub.disabled ? 'context-menu__item--disabled' : ''}"
										role="menuitem"
										tabindex={sub.disabled ? -1 : 0}
										onclick={() => handleItemClick(sub)}
										onmouseenter={() => (focusIndex = -1)}
									>
										{#if sub.icon}
											{#if sub.icon.startsWith('#')}
												<div
													class="h-3 w-3 shrink-0 rounded-full"
													style="background:{sub.icon}"
												></div>
											{:else}
												<span class="material-symbols-outlined" style="font-size:1rem"
													>{sub.icon}</span
												>
											{/if}
										{/if}
										<span>{sub.label}</span>
									</div>
								{/if}
							{/each}
						{/if}
					</div>
				{/if}
			{/if}
		{/each}
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: 9999;
		min-width: 180px;
		padding: 4px;
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-outline-variant, #cac4d0);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.3),
			0 1px 4px rgba(0, 0, 0, 0.2);
		animation: context-menu-enter 0.12s ease-out;
		transform-origin: top left;
		outline: none;
	}

	@keyframes context-menu-enter {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.context-menu__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 4px;
		cursor: pointer;
		color: var(--color-on-surface, #1a1a2e);
		font-size: 0.875rem;
		line-height: 1.25rem;
		transition: background 0.1s;
		user-select: none;
	}

	.context-menu__item:hover,
	.context-menu__item--focused {
		background: var(--color-surface-variant, #e0e0e0);
		outline: none;
	}

	.context-menu__item--disabled {
		opacity: 0.38;
		cursor: default;
		pointer-events: none;
	}

	.context-menu__item-content {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.context-menu__icon {
		font-size: 1.125rem;
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.context-menu__label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.context-menu__chevron {
		font-size: 1rem;
		margin-left: auto;
		flex-shrink: 0;
		opacity: 0.6;
	}

	.context-menu__separator {
		height: 1px;
		margin: 4px 12px;
		background: var(--color-outline-variant, #cac4d0);
	}

	.context-menu__submenu {
		position: absolute;
		left: 100%;
		top: 0;
		min-width: 160px;
		padding: 4px;
		margin-left: 4px;
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-outline-variant, #cac4d0);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		animation: context-menu-enter 0.1s ease-out;
		transform-origin: top left;
	}
</style>

import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';

export function useContextMenu() {
	let open = $state(false);
	let x = $state(0);
	let y = $state(0);
	let items = $state<ContextMenuItem[]>([]);

	function show(e: MouseEvent, menuItems: ContextMenuItem[]) {
		e.preventDefault();
		x = e.clientX;
		y = e.clientY;
		items = menuItems;
		open = true;
	}

	function close() {
		open = false;
		items = [];
	}

	return {
		get open() {
			return open;
		},
		set open(v: boolean) {
			open = v;
		},
		get x() {
			return x;
		},
		get y() {
			return y;
		},
		get items() {
			return items;
		},
		show,
		close
	};
}

<script lang="ts">
	import { Tooltip, IconButton } from '$lib/components/ui';

	let {
		active = false,
		onactive = () => {},
		oninactive = () => {},
		activeIcon = 'close',
		inactiveIcon = '',
		tooltipActive = '',
		tooltipInactive = '',
		iconStyle = ''
	}: {
		active?: boolean;
		onactive?: () => void;
		oninactive?: () => void;
		activeIcon?: string;
		inactiveIcon?: string;
		tooltipActive?: string;
		tooltipInactive?: string;
		iconStyle?: string;
	} = $props();
</script>

<Tooltip text={active ? tooltipActive : tooltipInactive}>
	<IconButton
		class="shrink-0 {active ? '!bg-error !text-on-error' : ''}"
		onclick={() => {
			if (active) oninactive();
			else onactive();
		}}
	>
		<span class="material-symbols-outlined text-sm" style={iconStyle}
			>{active ? activeIcon : inactiveIcon}</span
		>
	</IconButton>
</Tooltip>

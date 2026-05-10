<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const projectId = $derived(Number(page.params.id));

	onMount(() => {
		goto(resolve(`/project/${projectId}/global`));
	});
</script>

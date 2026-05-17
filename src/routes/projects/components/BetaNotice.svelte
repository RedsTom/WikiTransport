<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui';

	let {
		reportBugUrl = 'https://github.com/RedsTom/WikiTransport/issues/new/choose'
	}: {
		reportBugUrl?: string;
	} = $props();
</script>

<div class="mb-6 rounded-xl border border-outline/10 bg-surface-variant/30 p-4">
	<div class="flex items-center gap-4 text-on-surface-variant">
		<span class="material-symbols-outlined text-lg">info</span>
		<p class="flex-1 text-sm">
			{m.beta_notice()}
		</p>
		<Button variant="tonal" href={reportBugUrl} target="_blank" rel="noreferrer">
			<span class="material-symbols-outlined">bug_report</span>
			{m.report_bug()}
		</Button>
	</div>
</div>

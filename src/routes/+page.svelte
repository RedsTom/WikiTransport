<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { locales } from '$lib/paraglide/runtime';
	import { setLocale, useLocale } from '$lib/locale.svelte';
	import { Button } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { resolve, base } from '$app/paths';
</script>

<svelte:head>
	<title>{m.app_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="flex items-center justify-between px-6 py-4">
		<span class="flex items-center gap-2 text-xl font-bold text-on-surface">
			<img src="/assets/logo.svg" alt="WikiTransport" class="h-8 w-8" />
			{m.app_title()}
		</span>
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				{#each locales as l (l)}
					<button
						onclick={() => setLocale(l)}
						class="text-sm font-bold uppercase transition-colors hover:text-primary {useLocale() ===
						l
							? 'text-primary'
							: 'text-on-surface-variant opacity-70'}"
					>
						{l}
					</button>
				{/each}
			</div>
			<Button variant="filled" onclick={() => goto(resolve('/projects'))}>
				{m.landing_view_projects()}
			</Button>
		</div>
	</header>

	<main class="px-6">
		<section class="mx-auto mt-12 mb-24 flex max-w-6xl flex-col items-center gap-12 md:flex-row">
			<div class="flex-1 text-center md:text-left">
				<h2 class="mb-4 text-5xl font-bold text-on-surface">{m.app_title()}</h2>
				<p class="mb-2 text-xl text-on-surface-variant">{m.landing_subtitle()}</p>
				<p class="mb-8 text-lg text-on-surface-variant">{m.landing_tagline()}</p>
				<div class="flex flex-wrap items-center gap-4">
					<Button variant="filled" onclick={() => goto(resolve('/projects'))}>
						<span class="material-symbols-outlined">arrow_forward</span>
						{m.landing_get_started()}
					</Button>
					<a
						href="https://github.com/RedsTom/WikiTransport"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 rounded-lg border border-outline/20 px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
							/>
						</svg>
						GitHub
					</a>
				</div>
			</div>
			<div class="flex-1">
				<img
					src="/assets/Global View.png"
					alt="WikiTransport editor screenshot"
					class="w-full rounded-xl border border-outline/20 shadow-lg"
				/>
			</div>
		</section>

		<section class="mx-auto mb-24 max-w-6xl">
			<div class="grid gap-6 md:grid-cols-3">
				<div class="rounded-xl border border-outline/20 bg-surface-variant p-6 text-center">
					<span class="material-symbols-outlined mb-3 block text-3xl text-primary">route</span>
					<h3 class="mb-2 font-bold text-on-surface">{m.add_line()}</h3>
					<p class="text-sm text-on-surface-variant">{m.landing_feature_octilinear()}</p>
				</div>
				<div class="rounded-xl border border-outline/20 bg-surface-variant p-6 text-center">
					<span class="material-symbols-outlined mb-3 block text-3xl text-primary">palette</span>
					<h3 class="mb-2 font-bold text-on-surface">{m.line_types()}</h3>
					<p class="text-sm text-on-surface-variant">{m.landing_feature_types()}</p>
				</div>
				<div class="rounded-xl border border-outline/20 bg-surface-variant p-6 text-center">
					<span class="material-symbols-outlined mb-3 block text-3xl text-primary">download</span>
					<h3 class="mb-2 font-bold text-on-surface">{m.export()}</h3>
					<p class="text-sm text-on-surface-variant">{m.landing_feature_svg()}</p>
				</div>
			</div>
		</section>

		<section class="mx-auto mb-24 max-w-4xl">
			<h3 class="mb-8 text-center text-2xl font-bold text-on-surface">
				{m.landing_showcase()}
			</h3>
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href="{base}/assets/Marseille-Global.svg"
				target="_blank"
				class="block overflow-hidden rounded-xl border border-outline/20 transition-shadow hover:shadow-md"
			>
				<img
					src="/assets/Marseille-Global.svg"
					alt="Marseille global view"
					class="w-full bg-white"
				/>
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</section>

		<section class="mx-auto mb-24 max-w-4xl">
			<div class="grid gap-6 md:grid-cols-3">
				<div class="rounded-xl border border-outline/20 bg-surface-variant p-6 text-center">
					<span class="material-symbols-outlined mb-3 block text-3xl text-primary">code</span>
					<p class="mb-3 text-sm text-on-surface-variant">{m.landing_open_source()}</p>
					<a
						href="https://github.com/RedsTom/WikiTransport"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-on-surface"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
							/>
						</svg>
						{m.landing_view_github()}
					</a>
				</div>
				<div class="rounded-xl border border-outline/20 bg-surface-variant p-6 text-center">
					<span class="material-symbols-outlined mb-3 block text-3xl text-primary">flag</span>
					<p class="text-sm text-on-surface-variant">{m.landing_made_in_france()}</p>
				</div>
				<div class="rounded-xl border border-outline/20 bg-surface-variant p-6 text-center">
					<span class="material-symbols-outlined mb-3 block text-3xl text-primary">offline_pin</span
					>
					<p class="text-sm text-on-surface-variant">{m.landing_local()}</p>
				</div>
			</div>
		</section>
	</main>

	<footer class="px-6 py-4 text-center text-sm text-on-surface-variant opacity-60">
		{m.app_title()} &mdash; {m.landing_open_source()}
	</footer>
</div>

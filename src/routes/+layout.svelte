<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import ExportPanel from '$lib/components/ExportPanel.svelte';
	import SettingsMenu from '$lib/components/SettingsMenu.svelte';
	import { startClock } from '$lib/stores/clock.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	$effect(() => {
		startClock();
	});

	$effect(() => {
		const theme = data.settings.theme;
		if (theme === 'system') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = theme;
	});
</script>

<svelte:head>
	<title>TimeTracker</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10">
	<header class="flex items-center justify-between py-5">
		<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight">
			<span class="flex h-6 w-6 items-center justify-center">
				<span class="h-3 w-3 rounded-full bg-job"></span>
				<span class="-ml-1 h-3 w-3 rounded-full bg-phd"></span>
			</span>
			TimeTracker
		</a>
		<nav class="flex items-center gap-3 text-sm text-ink-2">
			{#if page.url.pathname !== '/'}
				<a href="/" class="rounded-md px-2 py-1 hover:bg-surface hover:text-ink">Tracker</a>
			{/if}
			<ExportPanel weekStartDay={data.settings.weekStartDay} phdEnabled={data.settings.phdEnabled} />
			<SettingsMenu />
		</nav>
	</header>
	{@render children()}
</div>

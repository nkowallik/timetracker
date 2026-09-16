<script lang="ts">
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import DayRangeDialog from './DayRangeDialog.svelte';
	import MonthOverview from './MonthOverview.svelte';
	import type { DayOffType } from '$lib/types';

	let open = $state(false);
	let panel = $state<HTMLElement | null>(null);
	let dialogType = $state<DayOffType | null>(null);
	let monthOpen = $state(false);
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	function showToast(message: string) {
		toast = message;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3000);
	}

	const RANGES: { type: DayOffType; label: string }[] = [
		{ type: 'vacation', label: 'Add vacation…' },
		{ type: 'sick', label: 'Add sick leave…' }
	];

	function openDialog(type: DayOffType) {
		open = false;
		dialogType = type;
	}

	function onWindowClick(e: MouseEvent) {
		if (open && panel && !panel.contains(e.target as Node)) open = false;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclickcapture={onWindowClick} {onkeydown} />

<div class="relative" bind:this={panel}>
	<button
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Settings menu"
		class="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-surface hover:text-ink"
		class:font-medium={page.url.pathname === '/settings'}
	>
		⚙ Settings <span class="text-xs opacity-70">▾</span>
	</button>

	{#if open}
		<div
			class="hairline absolute top-full right-0 z-10 mt-2 w-44 rounded-xl bg-surface p-1.5 shadow-lg"
			role="menu"
		>
			<a
				href="/settings"
				role="menuitem"
				onclick={() => (open = false)}
				class="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-ink hover:bg-line/50"
			>
				Settings
			</a>
			<button
				role="menuitem"
				onclick={() => {
					open = false;
					monthOpen = true;
				}}
				class="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-ink hover:bg-line/50"
			>
				Month overview…
			</button>
			<p class="mt-1 border-t border-line px-2.5 pt-2 pb-1 text-xs font-medium text-muted uppercase">
				Time off
			</p>
			{#each RANGES as r (r.type)}
				<button
					role="menuitem"
					onclick={() => openDialog(r.type)}
					class="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-ink hover:bg-line/50"
				>
					{r.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

{#if dialogType !== null}
	<DayRangeDialog type={dialogType} onclose={() => (dialogType = null)} onsuccess={showToast} />
{/if}

{#if monthOpen}
	<MonthOverview onclose={() => (monthOpen = false)} />
{/if}

{#if toast}
	<div
		role="status"
		out:fade={{ duration: 600 }}
		class="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page shadow-lg"
	>
		✓ {toast}
	</div>
{/if}

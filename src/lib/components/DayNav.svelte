<script lang="ts">
	import { goto } from '$app/navigation';
	import { addDaysKey, dayStart } from '$lib/time';

	let { day, today }: { day: string; today: string } = $props();

	let dateInput = $state<HTMLInputElement | null>(null);

	function openPicker() {
		try {
			dateInput?.showPicker();
		} catch {
			dateInput?.focus(); // fallback where showPicker is unsupported/blocked
		}
	}

	const label = $derived(
		dayStart(day).toLocaleDateString(undefined, {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	);

	function go(d: string) {
		goto(`/?day=${d}`, { keepFocus: true });
	}

	function onkeydown(e: KeyboardEvent) {
		const t = e.target as HTMLElement;
		if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
		if (e.key === 'ArrowLeft') go(addDaysKey(day, -1));
		else if (e.key === 'ArrowRight') go(addDaysKey(day, 1));
	}
</script>

<svelte:window {onkeydown} />

<div class="flex flex-wrap items-center justify-center gap-2">
	<button
		class="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink"
		onclick={() => go(addDaysKey(day, -1))}
		aria-label="Previous day">◀</button
	>
	<button
		class="hairline relative flex cursor-pointer items-center gap-2 rounded-md bg-surface px-3 py-1.5 hover:bg-line/40"
		onclick={openPicker}
		aria-label="Pick a date"
	>
		<span class="text-sm font-medium" class:text-ink-2={day !== today}>{label}</span>
		<span class="text-xs text-muted">▾</span>
		<input
			bind:this={dateInput}
			type="date"
			value={day}
			onchange={(e) => e.currentTarget.value && go(e.currentTarget.value)}
			class="pointer-events-none absolute inset-0 opacity-0"
			tabindex="-1"
			aria-hidden="true"
		/>
	</button>
	<button
		class="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface hover:text-ink"
		onclick={() => go(addDaysKey(day, 1))}
		aria-label="Next day">▶</button
	>
	{#if day !== today}
		<button
			class="rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-2 underline-offset-2 hover:underline"
			onclick={() => go(today)}>Today</button
		>
	{/if}
</div>

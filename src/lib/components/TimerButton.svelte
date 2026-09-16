<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/client';
	import { clock } from '$lib/stores/clock.svelte';
	import { fmtClock, fmtDurationSec } from '$lib/time';
	import { SIDE_LABELS, type Side, type Summary } from '$lib/types';

	let { side, running }: { side: Side; running: Summary['running'] } = $props();

	let busy = $state(false);

	const isRunning = $derived(running?.side === side);
	const otherRunning = $derived(running !== null && running.side !== side);
	const elapsed = $derived(isRunning && running ? Math.max(0, clock.now - running.startTs) : 0);

	async function toggle() {
		if (busy) return;
		busy = true;
		try {
			if (isRunning) await api('/api/timer/stop', 'POST');
			else await api('/api/timer/start', 'POST', { side });
			await invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<button
	onclick={toggle}
	disabled={busy}
	class="group flex w-full items-center justify-between rounded-2xl px-6 py-6 text-left transition-colors
		{isRunning ? 'text-white ' + (side === 'job' ? 'bg-job' : 'bg-phd') : 'hairline bg-surface hover:bg-line/40'}"
>
	{#if isRunning && running}
		<span class="flex items-center gap-3.5">
			<span class="relative flex h-4 w-4">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70"></span>
				<span class="relative inline-flex h-4 w-4 rounded-full bg-white"></span>
			</span>
			<span class="text-base font-medium opacity-90">since {fmtClock(running.startTs)}</span>
		</span>
		<span class="text-2xl font-semibold tabular-nums">{fmtDurationSec(elapsed)} ⏸</span>
	{:else}
		<span class="flex items-center gap-3.5 text-ink-2 group-hover:text-ink">
			<span class="h-4 w-4 rounded-full {side === 'job' ? 'bg-job' : 'bg-phd'}"></span>
			<span class="text-xl font-semibold">Start {SIDE_LABELS[side]}</span>
		</span>
		<span class="text-sm text-muted">
			{#if otherRunning && running}stops {SIDE_LABELS[running.side]}{:else}<span class="text-lg">▶</span>{/if}
		</span>
	{/if}
</button>

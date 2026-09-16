<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/client';
	import { clock } from '$lib/stores/clock.svelte';
	import { mergeNeighboring } from '$lib/split';
	import { fmtClock, fmtDuration } from '$lib/time';
	import { SIDE_LABELS, type Side, type Summary, type WorkWindow } from '$lib/types';
	import TimerButton from './TimerButton.svelte';
	import WindowRow from './WindowRow.svelte';
	import WindowEditor from './WindowEditor.svelte';

	let {
		side,
		day,
		today,
		windows,
		summary,
		allSides = false
	}: {
		side: Side;
		day: string;
		today: string;
		windows: WorkWindow[];
		summary: Summary;
		/** List every window of the day regardless of side. */
		allSides?: boolean;
	} = $props();

	let adding = $state(false);
	let deleted = $state<WorkWindow[] | null>(null);
	let deleteTimeout: ReturnType<typeof setTimeout> | undefined;

	const mine = $derived(mergeNeighboring(allSides ? windows : windows.filter((w) => w.side === side)));
	const dayTotal = $derived(
		mine.reduce((sum, w) => sum + Math.max(0, (w.endTs ?? clock.now) - w.startTs), 0)
	);

	async function ondelete(parts: WorkWindow[]) {
		clearTimeout(deleteTimeout);
		for (const w of parts) await api(`/api/windows/${w.id}`, 'DELETE');
		deleted = parts;
		deleteTimeout = setTimeout(() => (deleted = null), 6000);
		await invalidateAll();
	}

	async function undo() {
		if (!deleted) return;
		const parts = deleted;
		deleted = null;
		clearTimeout(deleteTimeout);
		for (const w of parts) {
			await api('/api/windows', 'POST', {
				side: w.side,
				day: w.day,
				start: fmtClock(w.startTs),
				end: fmtClock(w.endTs ?? Date.now()),
				note: w.note ?? undefined
			});
		}
		await invalidateAll();
	}
</script>

<section class="flex min-w-0 flex-col gap-2" aria-label={SIDE_LABELS[side]}>
	<div class="flex items-baseline justify-between px-1">
		<h2 class="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-ink-2">
			<span class="h-2.5 w-2.5 rounded-[3px] {side === 'job' ? 'bg-job' : 'bg-phd'}"></span>
			{SIDE_LABELS[side]}
		</h2>
		<span class="text-lg font-semibold tabular-nums">{fmtDuration(dayTotal)}</span>
	</div>

	{#if day === today}
		<TimerButton {side} running={summary.running} />
	{/if}

	<div class="flex flex-col gap-0.5">
		{#each mine as w (w.id)}
			<WindowRow window={w} {day} {ondelete} />
		{:else}
			{#if !adding}
				<p class="px-2 py-3 text-center text-sm text-muted">No {allSides ? '' : `${SIDE_LABELS[side]} `}time on this day.</p>
			{/if}
		{/each}
	</div>

	{#if adding}
		<WindowEditor {side} {day} onclose={() => (adding = false)} />
	{:else}
		<button
			class="rounded-xl border border-dashed border-baseline px-3 py-3.5 text-base text-muted hover:border-solid hover:bg-surface hover:text-ink"
			onclick={() => (adding = true)}>+ add window</button
		>
	{/if}

	{#if deleted}
		<div class="hairline flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
			<span class="text-ink-2">Deleted {fmtClock(deleted[0].startTs)}–{deleted.at(-1)!.endTs ? fmtClock(deleted.at(-1)!.endTs!) : 'now'}</span>
			<button class="font-medium underline underline-offset-2" onclick={undo}>Undo</button>
		</div>
	{/if}
</section>

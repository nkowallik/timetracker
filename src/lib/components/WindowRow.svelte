<script lang="ts">
	import { clock } from '$lib/stores/clock.svelte';
	import { fmtClock, fmtDuration } from '$lib/time';
	import type { WorkWindow } from '$lib/types';
	import WindowEditor from './WindowEditor.svelte';
	import WindowRow from './WindowRow.svelte';

	let {
		window: win,
		day,
		ondelete
	}: {
		window: WorkWindow & { parts?: WorkWindow[] };
		day: string;
		ondelete: (parts: WorkWindow[]) => void;
	} = $props();

	let editing = $state(false);
	let expanded = $state(false);

	const parts = $derived(win.parts ?? [win]);
	const isMerged = $derived(parts.length > 1);
	const isRunning = $derived(win.endTs === null);
	const duration = $derived((win.endTs ?? clock.now) - win.startTs);
</script>

{#if editing}
	<WindowEditor side={win.side} {day} window={win} onclose={() => (editing = false)} />
{:else}
	<div
		class="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
	>
		<span class="h-2 w-2 shrink-0 rounded-full {win.side === 'job' ? 'bg-job' : 'bg-phd'}"></span>
		<span class="tabular-nums text-ink-2">
			{fmtClock(win.startTs)}–{#if isRunning}<span class="font-medium text-ink">now</span
				>{:else}{fmtClock(win.endTs!)}{/if}
		</span>
		<span class="font-medium tabular-nums">{fmtDuration(Math.max(0, duration))}</span>
		{#if isMerged}
			<button
				class="rounded px-1 py-0.5 text-xs text-muted hover:bg-line hover:text-ink"
				onclick={() => (expanded = !expanded)}
				title={parts
					.map((p) => `${fmtClock(p.startTs)}–${p.endTs ? fmtClock(p.endTs) : 'now'}`)
					.join(', ')}
				aria-label={expanded ? 'Hide merged windows' : 'Show merged windows'}
				>{expanded ? '▾' : '▸'} {parts.length}</button
			>
		{/if}
		{#if win.note}
			<span class="min-w-0 flex-1 truncate text-muted" title={win.note}>{win.note}</span>
		{:else}
			<span class="flex-1"></span>
		{/if}
		<span class="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
			{#if !isMerged}
				<button
					class="rounded px-1.5 py-0.5 text-muted hover:bg-line hover:text-ink"
					onclick={() => (editing = true)}
					aria-label="Edit window">✎</button
				>
			{/if}
			{#if !isRunning}
				<button
					class="rounded px-1.5 py-0.5 text-muted hover:bg-line hover:text-critical"
					onclick={() => ondelete(parts)}
					aria-label="Delete window">✕</button
				>
			{/if}
		</span>
	</div>
	{#if isMerged && expanded}
		<div class="flex flex-col gap-0.5 pl-5">
			{#each parts as p (p.id)}
				<WindowRow window={p} {day} {ondelete} />
			{/each}
		</div>
	{/if}
{/if}

<script lang="ts">
	import { breakTotal, dayProgress, dayRuns } from '$lib/stats';
	import { clock } from '$lib/stores/clock.svelte';
	import { fmtDuration } from '$lib/time';
	import {
		isDayOff,
		SIDE_LABELS,
		type DayMark,
		type SideTotals,
		type WorkWindow
	} from '$lib/types';

	let {
		windows,
		dailyHourTarget,
		isToday,
		mark = null,
		phdEnabled = true
	}: {
		windows: WorkWindow[];
		dailyHourTarget: number | null;
		isToday: boolean;
		mark?: DayMark | null;
		phdEnabled?: boolean;
	} = $props();

	const runs = $derived(dayRuns(windows, clock.now));
	const totals = $derived(
		runs.reduce<SideTotals>(
			(t, r) => (r.side === null ? t : { ...t, [r.side]: t[r.side] + r.ms }),
			{ job: 0, phd: 0 }
		)
	);
	const breaks = $derived(breakTotal(runs));
	const worked = $derived(totals.job + totals.phd);
	const progress = $derived(
		dayProgress(worked, dailyHourTarget !== null ? dailyHourTarget * 3_600_000 : null)
	);
	// scaled to the maximum plus breaks, so the bar fills exactly when the maximum is reached
	const segments = $derived.by(() => {
		if (!progress) return [];
		const scale = progress.targetMs + breaks;
		let filled = 0;
		const out: { key: number; side: 'job' | 'phd' | null; pct: number }[] = [];
		for (const [i, r] of runs.entries()) {
			const pct = Math.min((r.ms / scale) * 100, 100 - filled);
			if (pct <= 0) break;
			out.push({ key: i, side: r.side, pct });
			filled += pct;
		}
		return out;
	});
	const dayOff = $derived(isDayOff(mark?.type));
</script>

{#if progress}
	<section
		class="hairline flex flex-col gap-2 rounded-xl bg-surface px-4 py-3"
		aria-label="Daily hours against the configured maximum"
	>
		<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<span class="text-sm text-ink-2">
				{isToday ? 'Today' : 'This day'}
				<span class="ml-1 font-semibold text-ink tabular-nums">
					{fmtDuration(progress.workedMs)} / {fmtDuration(progress.targetMs)} h
				</span>
				<span class="text-xs text-muted tabular-nums">({Math.round(progress.pct)}%)</span>
			</span>
			<span class="text-sm tabular-nums">
				{#if progress.reached}
					<span class="font-semibold text-critical">
						+{fmtDuration(progress.overMs)} h over
					</span>
				{:else}
					<span class="text-ink-2">{fmtDuration(progress.remainingMs)} h left</span>
				{/if}
			</span>
		</div>

		<div
			class="flex h-2.5 w-full overflow-hidden rounded-full bg-line"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(progress.pct)}
			aria-valuetext="{fmtDuration(progress.workedMs)} of {fmtDuration(progress.targetMs)} hours"
		>
			{#each segments as seg (seg.key)}
				<div
					class="h-full shrink-0 {seg.side === 'job'
						? 'bg-job'
						: seg.side === 'phd'
							? 'bg-phd'
							: 'break-hatch'}"
					style="width: {seg.pct}%"
					title="{seg.side === null ? 'Break' : SIDE_LABELS[seg.side]} {fmtDuration(
						runs[seg.key].ms
					)}"
				></div>
			{/each}
		</div>

		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
			<span class="tabular-nums">
				{SIDE_LABELS.job}
				{fmtDuration(totals.job)}{#if phdEnabled || totals.phd > 0}&nbsp;· {SIDE_LABELS.phd}
					{fmtDuration(totals.phd)}{/if}{#if breaks > 0}&nbsp;· Breaks {fmtDuration(breaks)}{/if}
			</span>
			{#if dayOff}
				<span>Marked as a day off — counted as a full day regardless.</span>
			{:else if progress.reached}
				<span>Daily maximum reached.</span>
			{/if}
		</div>
	</section>
{/if}

<style>
	.break-hatch {
		background: repeating-linear-gradient(
			-45deg,
			var(--baseline) 0 2px,
			var(--gridline) 2px 5px
		);
	}
</style>

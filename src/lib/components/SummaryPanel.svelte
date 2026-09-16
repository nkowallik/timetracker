<script lang="ts">
	import { fmtDuration, isWeekend, weekdaysThrough } from '$lib/time';
	import { isDayOff, type Settings, type Summary } from '$lib/types';
	import SplitBar from './SplitBar.svelte';

	let { summary, settings, day }: { summary: Summary; settings: Settings; day: string } = $props();

	const weekTotal = $derived(summary.week.job + summary.week.phd);
	const allTimeTotal = $derived(summary.allTime.job + summary.allTime.phd);
	const weekLabel = $derived(`${summary.week.from} – ${summary.week.to.slice(5)}`);
	// weekly target pro-rated to the weekdays elapsed; days marked off drop out of it
	const markedWeekdays = $derived(
		summary.week.marks.filter((m) => isDayOff(m.type) && !isWeekend(m.day) && m.day <= day).length
	);
	const markedWeekdaysFullWeek = $derived(
		summary.week.marks.filter((m) => isDayOff(m.type) && !isWeekend(m.day)).length
	);
	const weekTargetMs = $derived(
		settings.weeklyHourTarget
			? (settings.weeklyHourTarget / 5) *
					Math.max(0, Math.min(5, weekdaysThrough(summary.week.from, day)) - markedWeekdays) *
					3_600_000
			: 0
	);
	const fullWeekTargetMs = $derived(
		(settings.weeklyHourTarget ?? 0) * ((5 - Math.min(5, markedWeekdaysFullWeek)) / 5) * 3_600_000
	);

	function signed(ms: number): string {
		return `${ms < 0 ? '−' : '+'}${fmtDuration(Math.abs(ms))}`;
	}
</script>

<section class="hairline flex flex-col gap-4 rounded-xl bg-surface p-4" aria-label="Summary">
	{#if settings.phdEnabled}
		<div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
			<SplitBar
				title="This week"
				subtitle={weekLabel}
				totals={summary.week}
				split={summary.weekSplit}
			/>
			<SplitBar title="All time" totals={summary.allTime} split={summary.allTimeSplit} />
		</div>
	{:else}
		<div class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 text-sm">
			<span class="font-medium">
				This week <span class="font-normal text-muted">{weekLabel}</span>
				<span class="ml-2 font-semibold tabular-nums">{fmtDuration(weekTotal)} h</span>
			</span>
			<span class="font-medium">
				All time
				<span class="ml-2 font-semibold tabular-nums">{fmtDuration(allTimeTotal)} h</span>
			</span>
		</div>
	{/if}

	{#if settings.weeklyHourTarget || summary.overtime}
		<div
			class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t border-line pt-3 text-sm"
		>
			{#if settings.weeklyHourTarget}
				<span class="text-ink-2">
					Hours this week
					<span class="font-semibold text-ink tabular-nums">
						{fmtDuration(weekTotal)} / {fmtDuration(weekTargetMs)} h
					</span>
					<span class="text-xs text-muted tabular-nums">
						({weekTargetMs > 0 ? `${Math.round((weekTotal / weekTargetMs) * 100)}%` : '—'}{weekTargetMs <
						fullWeekTargetMs
							? ` · ${fmtDuration(fullWeekTargetMs)} h/wk`
							: ''}{markedWeekdaysFullWeek > 0
							? ` · ${markedWeekdaysFullWeek} ${markedWeekdaysFullWeek === 1 ? 'day' : 'days'} off`
							: ''})
					</span>
				</span>
			{/if}
			{#if summary.overtime}
				{@const hint = [
					summary.overtime.weeks > 0
						? `${summary.overtime.weeks} completed ${summary.overtime.weeks === 1 ? 'week' : 'weeks'}`
						: settings.weeklyHourTarget
							? 'no completed weeks yet'
							: '',
					summary.overtime.startMs !== 0 ? `${signed(summary.overtime.startMs)} start` : ''
				]
					.filter(Boolean)
					.join(' · ')}
				<span class="text-ink-2">
					Overtime balance
					<span
						class="font-semibold tabular-nums"
						class:text-good={summary.overtime.balanceMs > 0}
						class:text-critical={summary.overtime.balanceMs < 0}
						class:text-ink={summary.overtime.balanceMs === 0}
					>
						{signed(summary.overtime.balanceMs)} h
					</span>
					{#if hint}
						<span class="text-xs text-muted">({hint})</span>
					{/if}
				</span>
			{/if}
		</div>
	{/if}
</section>

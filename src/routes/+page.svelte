<script lang="ts">
	import DailyProgress from '$lib/components/DailyProgress.svelte';
	import DayMarkControl from '$lib/components/DayMarkControl.svelte';
	import DayNav from '$lib/components/DayNav.svelte';
	import Hourglass from '$lib/components/Hourglass.svelte';
	import OvertimeAlarm from '$lib/components/OvertimeAlarm.svelte';
	import SideColumn from '$lib/components/SideColumn.svelte';
	import SummaryPanel from '$lib/components/SummaryPanel.svelte';
	import TargetBalance from '$lib/components/TargetBalance.svelte';
	import { liveSummary } from '$lib/stats';
	import { clock } from '$lib/stores/clock.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// tick the summary while a timer runs
	const summary = $derived(liveSummary(data.summary, clock.now));
	const todayTotal = $derived(summary.today.job + summary.today.phd);
	const dayMark = $derived(summary.week.marks.find((m) => m.day === data.day) ?? null);
</script>

<OvertimeAlarm
	todayTotalMs={todayTotal}
	dailyTargetMs={data.settings.dailyHourTarget !== null
		? data.settings.dailyHourTarget * 3_600_000
		: null}
	today={data.today}
/>

<div class="flex flex-col gap-6">
	<SummaryPanel {summary} settings={data.settings} day={data.day} />

	<DayNav day={data.day} today={data.today} />

	<div class="-mt-4">
		<DayMarkControl day={data.day} mark={dayMark} />
	</div>

	<DailyProgress
		windows={data.windows}
		dailyHourTarget={data.settings.dailyHourTarget}
		isToday={data.day === data.today}
		mark={dayMark}
		phdEnabled={data.settings.phdEnabled}
	/>

	{#if data.settings.phdEnabled}
		<TargetBalance {summary} />

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-5">
			<SideColumn side="job" day={data.day} today={data.today} windows={data.windows} {summary} />
			<div class="hidden flex-col items-center gap-3 sm:flex" aria-hidden="true">
				<Hourglass running={summary.running !== null} />
				<div class="w-px flex-1 bg-line"></div>
			</div>
			<SideColumn side="phd" day={data.day} today={data.today} windows={data.windows} {summary} />
		</div>
	{:else}
		<div class="mx-auto flex w-full max-w-2xl flex-col gap-4">
			<div class="flex justify-center" aria-hidden="true">
				<Hourglass running={summary.running !== null} />
			</div>
			<SideColumn
				side="job"
				day={data.day}
				today={data.today}
				windows={data.windows}
				{summary}
				allSides
			/>
		</div>
	{/if}
</div>

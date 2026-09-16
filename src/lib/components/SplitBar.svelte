<script lang="ts">
	import { balanceDelta } from '$lib/stats';
	import { fmtDuration } from '$lib/time';
	import { SIDE_LABELS, type SideTotals, type SplitStats } from '$lib/types';

	let {
		title,
		totals,
		split,
		subtitle = ''
	}: { title: string; totals: SideTotals; split: SplitStats; subtitle?: string } = $props();

	const hasData = $derived(split.actualJobPct !== null);
	const jobPct = $derived(split.actualJobPct ?? 0);
	const deltaText = $derived.by(() => {
		if (split.deltaPct === null) return 'no tracked time yet';
		const balance = balanceDelta(totals, split.targetJobPct);
		if (!balance || balance.ms < 60_000) return '✓ on target';
		const d = split.deltaPct;
		return `${SIDE_LABELS[balance.side]} needs +${fmtDuration(balance.ms)} to balance (${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pp Job)`;
	});
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
		<span class="font-medium">{title} {#if subtitle}<span class="font-normal text-muted">{subtitle}</span>{/if}</span>
		<span class="flex items-center gap-3 tabular-nums text-ink-2">
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-[2px] bg-job"></span>
				Job {fmtDuration(totals.job)}{#if hasData}&nbsp;· {jobPct.toFixed(0)}%{/if}
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-[2px] bg-phd"></span>
				PhD {fmtDuration(totals.phd)}{#if hasData}&nbsp;· {(100 - jobPct).toFixed(0)}%{/if}
			</span>
		</span>
	</div>
	<div class="relative py-1">
		{#if hasData}
			<div class="flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
				{#if jobPct > 0}<div class="bg-job" style="width: {jobPct}%"></div>{/if}
				{#if jobPct < 100}<div class="flex-1 bg-phd"></div>{/if}
			</div>
		{:else}
			<div class="h-3 rounded-[4px] bg-line"></div>
		{/if}
		<!-- target split marker -->
		<div
			class="absolute top-0 bottom-0 w-[2px] -translate-x-1/2 rounded-full bg-ink"
			style="left: {split.targetJobPct}%"
			title="Target: {split.targetJobPct}% Job / {100 - split.targetJobPct}% PhD"
		></div>
	</div>
	<div class="flex justify-between text-xs text-muted">
		<span>target {split.targetJobPct}/{100 - split.targetJobPct}</span>
		<span>{deltaText}</span>
	</div>
</div>

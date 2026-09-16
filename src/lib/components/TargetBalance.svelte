<script lang="ts">
	import { balanceDelta } from '$lib/stats';
	import { fmtDuration } from '$lib/time';
	import { SIDE_LABELS, type Summary } from '$lib/types';

	let { summary }: { summary: Summary } = $props();

	const target = $derived(summary.allTimeSplit.targetJobPct);
	const balance = $derived(balanceDelta(summary.allTime, target));
	const hasData = $derived(summary.allTime.job + summary.allTime.phd > 0);
</script>

<div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
	<span class="text-muted">target {target}/{100 - target}</span>
	{#if balance && balance.ms >= 60_000}
		<span
			class="flex items-center gap-2 rounded-lg border-l-4 py-1 pr-3 pl-2 {balance.side === 'job'
				? 'border-job bg-job/10'
				: 'border-phd bg-phd/10'}"
		>
			<span class="font-semibold tabular-nums">{SIDE_LABELS[balance.side]} +{fmtDuration(balance.ms)}</span>
			<span class="text-ink-2">to balance</span>
		</span>
	{:else if hasData}
		<span class="text-muted">✓ balanced</span>
	{/if}
</div>

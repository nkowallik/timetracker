<script lang="ts">
	import { addDaysKey, dayKey, weekBounds } from '$lib/time';

	let { weekStartDay = 1, phdEnabled = true }: { weekStartDay?: number; phdEnabled?: boolean } =
		$props();

	type Format = 'csv' | 'json' | 'pdf';
	type Range = 'all' | 'week' | 'month' | '30d';

	const FORMATS: { id: Format; label: string; hint: string }[] = [
		{ id: 'csv', label: 'CSV', hint: 'spreadsheet-friendly' },
		{ id: 'json', label: 'JSON', hint: 'data + settings · backup' },
		{ id: 'pdf', label: 'PDF', hint: 'printable report' }
	];

	const RANGES: { id: Range; label: string }[] = [
		{ id: 'all', label: 'All time' },
		{ id: 'week', label: 'This week' },
		{ id: 'month', label: 'This month' },
		{ id: '30d', label: 'Last 30 days' }
	];

	let open = $state(false);
	let format = $state<Format | null>(null);
	let range = $state<Range>('all');
	let panel = $state<HTMLElement | null>(null);

	function toggle() {
		open = !open;
		format = null;
	}

	function close() {
		open = false;
		format = null;
	}

	function rangeParams(): string {
		const today = dayKey(Date.now());
		switch (range) {
			case 'week': {
				const { from, to } = weekBounds(today, weekStartDay);
				return `from=${from}&to=${addDaysKey(to, -1)}`;
			}
			case 'month':
				return `from=${today.slice(0, 8)}01&to=${today}`;
			case '30d':
				return `from=${addDaysKey(today, -29)}&to=${today}`;
			default:
				return ''; // server defaults to first entry … today
		}
	}

	function download(side: 'both' | 'job' | 'phd') {
		if (!format) return;
		const params = [rangeParams(), `side=${side}`].filter(Boolean).join('&');
		window.location.href = `/api/export/${format}?${params}`;
		close();
	}

	function onWindowClick(e: MouseEvent) {
		if (open && panel && !panel.contains(e.target as Node)) close();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onclickcapture={onWindowClick} {onkeydown} />

<div class="relative" bind:this={panel}>
	<button
		onclick={toggle}
		aria-haspopup="menu"
		aria-expanded={open}
		class="flex items-center gap-2 rounded-lg bg-ink px-3.5 py-1.5 text-sm font-medium text-page transition-opacity hover:opacity-85"
	>
			<svg viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M8 2.5v7.5m0 0L5 7m3 3 3-3M3 12.5h10" />
			</svg>
			Export
			<span class="text-xs opacity-70">▾</span>
		</button>

	{#if open}
		<div
			class="hairline absolute top-full right-0 z-10 mt-2 w-56 rounded-xl bg-surface p-1.5 shadow-lg"
			role="menu"
		>
				{#if format === null}
					<p class="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted">Export as…</p>
					{#each FORMATS as f (f.id)}
						<button
							role="menuitem"
							onclick={() => (format = f.id)}
							class="flex w-full items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-line/50"
						>
							<span class="font-medium">{f.label}</span>
							<span class="text-xs text-muted">{f.hint}</span>
						</button>
					{/each}
				{:else}
					<div class="flex items-center justify-between px-2.5 pt-1 pb-1.5">
						<p class="text-xs font-medium text-muted">
							{format.toUpperCase()}{phdEnabled ? ' — include what?' : ''}
						</p>
						<button
							class="text-xs text-muted hover:text-ink"
							onclick={() => (format = null)}
							aria-label="Back to format choice">←</button
						>
					</div>
					{#if phdEnabled}
						<button
							role="menuitem"
							onclick={() => download('both')}
							class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium hover:bg-line/50"
						>
							<span class="flex h-2 w-3.5">
								<span class="h-2 w-2 rounded-l-[3px] bg-job"></span>
								<span class="h-2 w-2 rounded-r-[3px] bg-phd"></span>
							</span>
							Complete (Job + PhD)
						</button>
						<button
							role="menuitem"
							onclick={() => download('job')}
							class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-line/50"
						>
							<span class="h-2 w-2 rounded-[3px] bg-job"></span>
							Job only
						</button>
						<button
							role="menuitem"
							onclick={() => download('phd')}
							class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-line/50"
						>
							<span class="h-2 w-2 rounded-[3px] bg-phd"></span>
							PhD only
						</button>
					{:else}
						<!-- single track: everything, so old PhD entries stay in the backup -->
						<button
							role="menuitem"
							onclick={() => download('both')}
							class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium hover:bg-line/50"
						>
							<span class="h-2 w-2 rounded-[3px] bg-job"></span>
							Download
						</button>
					{/if}
					<div class="mt-1 flex items-center justify-between gap-2 border-t border-line px-2.5 pt-2 pb-1">
						<span class="text-xs text-muted">Range</span>
						<select bind:value={range} class="hairline rounded-md bg-page px-1.5 py-0.5 text-xs">
							{#each RANGES as r (r.id)}
								<option value={r.id}>{r.label}</option>
							{/each}
						</select>
					</div>
			{/if}
		</div>
	{/if}
</div>

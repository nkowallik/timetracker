<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/client';
	import { isWeekend } from '$lib/time';
	import {
		DAY_MARK_LABELS,
		DAY_OFF_TYPES,
		WORK_LOCATION_TYPES,
		isDayOff,
		type DayMark,
		type DayMarkType
	} from '$lib/types';

	let { day, mark }: { day: string; mark: DayMark | null } = $props();

	let open = $state(false);
	let panel = $state<HTMLElement | null>(null);
	let busy = $state(false);

	const HINTS: Record<DayMarkType, string> = {
		sick: 'illness',
		vacation: 'planned time off',
		holiday: 'public holiday',
		home_office: 'worked from home'
	};

	const GROUPS: { label: string; types: DayMarkType[] }[] = [
		{ label: 'Day off', types: DAY_OFF_TYPES },
		{ label: 'Where you worked', types: WORK_LOCATION_TYPES }
	];

	async function set(type: DayMarkType) {
		if (busy) return;
		busy = true;
		open = false;
		try {
			await api(`/api/days/${day}/mark`, 'PUT', { type });
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function clear() {
		if (busy) return;
		busy = true;
		try {
			await api(`/api/days/${day}/mark`, 'DELETE');
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	function onWindowClick(e: MouseEvent) {
		if (open && panel && !panel.contains(e.target as Node)) open = false;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclickcapture={onWindowClick} {onkeydown} />

<div class="flex justify-center">
	{#if mark}
		<span
			class="hairline flex items-center gap-2 rounded-lg bg-surface py-1 pr-1.5 pl-3 text-sm"
		>
			<span class="font-semibold">{DAY_MARK_LABELS[mark.type]}</span>
			<span class="text-ink-2">
				{#if isDayOff(mark.type)}
					— day off{isWeekend(day) ? '' : ', counts as full working time'}
				{:else}
					— worked from home
				{/if}
			</span>
			{#if mark.note}
				<span class="text-xs text-muted">({mark.note})</span>
			{/if}
			<button
				class="rounded-md px-1.5 py-0.5 text-muted hover:bg-line/50 hover:text-ink"
				onclick={clear}
				disabled={busy}
				aria-label="Remove day mark">✕</button
			>
		</span>
	{:else}
		<div class="relative" bind:this={panel}>
			<button
				class="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface hover:text-ink"
				onclick={() => (open = !open)}
				aria-haspopup="menu"
				aria-expanded={open}
			>
				mark this day <span class="opacity-70">▾</span>
			</button>
			{#if open}
				<div
					class="hairline absolute top-full left-1/2 z-10 mt-1.5 w-60 -translate-x-1/2 rounded-xl bg-surface p-1.5 shadow-lg"
					role="menu"
				>
					{#each GROUPS as group, i (group.label)}
						<p
							class="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted uppercase {i > 0
								? 'mt-1 border-t border-line'
								: ''}"
						>
							{group.label}
						</p>
						{#each group.types as t (t)}
							<button
								role="menuitem"
								onclick={() => set(t)}
								class="flex w-full items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-line/50"
							>
								<span class="font-medium">{DAY_MARK_LABELS[t]}</span>
								<span class="text-xs text-muted">{HINTS[t]}</span>
							</button>
						{/each}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/client';
	import { addDaysKey, dayKey, dayStart, isWeekend } from '$lib/time';
	import { DAY_MARK_LABELS, type DayOffType, type MarkRangeResult } from '$lib/types';

	let {
		type,
		onclose,
		onsuccess
	}: { type: DayOffType; onclose: () => void; onsuccess: (message: string) => void } = $props();

	const today = dayKey(Date.now());
	let dialog = $state<HTMLDialogElement | null>(null);
	let from = $state(today);
	let to = $state(today);
	let note = $state('');
	let busy = $state(false);
	let error = $state('');

	const TITLES: Record<DayOffType, string> = {
		vacation: 'Add vacation',
		sick: 'Add sick leave',
		holiday: 'Add holidays'
	};

	const valid = $derived(/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to));
	const ordered = $derived(valid && from <= to);
	// public holidays are only known server-side and reported afterwards
	const workdays = $derived.by(() => {
		if (!ordered) return 0;
		let n = 0;
		for (let d = from, i = 0; d <= to && i < 400; d = addDaysKey(d, 1), i++) if (!isWeekend(d)) n++;
		return n;
	});

	$effect(() => {
		dialog?.showModal();
	});

	function fmt(day: string): string {
		return dayStart(day).toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (busy || !ordered) return;
		busy = true;
		error = '';
		try {
			const result = await api<MarkRangeResult>('/api/days/mark-range', 'POST', {
				from,
				to,
				type,
				note: note.trim() || null
			});
			await invalidateAll();
			onsuccess(summary(result));
			dialog?.close();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to mark the days';
		} finally {
			busy = false;
		}
	}

	function summary(result: MarkRangeResult): string {
		const n = result.marked.length;
		const holidays = result.skipped.filter((s) => s.reason === 'holiday');
		const parts = [`${n} ${n === 1 ? 'day' : 'days'} flagged as ${DAY_MARK_LABELS[type]}`];
		if (n > 0)
			parts[0] += ` (${fmt(result.marked[0])}${n > 1 ? ` – ${fmt(result.marked[n - 1])}` : ''})`;
		if (holidays.length > 0)
			parts.push(`${holidays.length} public ${holidays.length === 1 ? 'holiday' : 'holidays'} skipped`);
		return parts.join(' · ');
	}
</script>

<dialog
	bind:this={dialog}
	onclose={onclose}
	class="m-auto w-[min(92vw,26rem)] rounded-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40"
>
	<form onsubmit={submit} class="flex flex-col gap-4 p-5">
		<h2 class="text-base font-semibold">{TITLES[type]}</h2>

		<div class="grid grid-cols-2 gap-3 text-sm">
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-ink-2">From</span>
				<input
					type="date"
					bind:value={from}
					required
					class="hairline rounded-md bg-page px-2 py-1.5 tabular-nums"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-ink-2">To</span>
				<input
					type="date"
					bind:value={to}
					min={from}
					required
					class="hairline rounded-md bg-page px-2 py-1.5 tabular-nums"
				/>
			</label>
		</div>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-xs font-medium text-ink-2">Note <span class="font-normal text-muted">(optional)</span></span>
			<input
				type="text"
				bind:value={note}
				maxlength="200"
				placeholder={type === 'vacation' ? 'e.g. Italy' : 'e.g. flu'}
				class="hairline rounded-md bg-page px-2 py-1.5"
			/>
		</label>

		<p class="text-xs text-muted" aria-live="polite">
			{#if !ordered}
				The end date must not be before the start date.
			{:else if workdays === 0}
				No working days in this range.
			{:else}
				<span class="font-medium text-ink">{workdays} working {workdays === 1 ? 'day' : 'days'}</span>
				({fmt(from)}{from !== to ? ` – ${fmt(to)}` : ''})
			{/if}
		</p>

		{#if error}<p class="text-sm text-critical">{error}</p>{/if}

		<div class="flex items-center justify-end gap-2 border-t border-line pt-3">
			<button
				type="button"
				onclick={() => dialog?.close()}
				class="rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-line/50 hover:text-ink">Cancel</button
			>
			<button
				type="submit"
				disabled={busy || !ordered || workdays === 0}
				class="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-page hover:opacity-85 disabled:opacity-40"
			>
				{busy ? 'Saving…' : TITLES[type]}
			</button>
		</div>
	</form>
</dialog>

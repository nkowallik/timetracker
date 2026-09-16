<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/client';
	import { addDaysKey, dayKey, dayStart, fmtDuration, isWeekend } from '$lib/time';
	import { DAY_MARK_LABELS, isDayOff, type DayMark, type MonthOverview } from '$lib/types';

	let { onclose }: { onclose: () => void } = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let month = $state(dayKey(Date.now()).slice(0, 7));
	let data = $state<MonthOverview | null>(null);
	let error = $state('');

	$effect(() => {
		dialog?.showModal();
	});

	$effect(() => {
		const m = month;
		api<MonthOverview>(`/api/month?month=${m}`)
			.then((d) => {
				if (m === month) data = d;
			})
			.catch((e) => (error = e instanceof Error ? e.message : 'Failed to load'));
	});

	function shiftMonth(n: number) {
		const [y, m] = month.split('-').map(Number);
		const d = new Date(y, m - 1 + n, 1);
		month = dayKey(d).slice(0, 7);
	}

	const title = $derived(
		dayStart(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
	);

	const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const weekdayNames = $derived.by(() => {
		const start = data?.weekStartDay ?? 1;
		return Array.from({ length: 7 }, (_, i) => WEEKDAYS[(start + i) % 7]);
	});

	type Cell = { day: string; inMonth: boolean; mark: DayMark | null; worked: number; delta: number | null };
	type Bar = { start: number; span: number; label: string; type: DayMark['type'] };
	type Week = { cells: Cell[]; bars: Bar[] };

	// delta vs the scheduled time, as in the overtime balance; today shows its worked time
	function cellFor(day: string, inMonth: boolean, d: MonthOverview): Cell {
		const totals = d.days[day];
		const worked = totals ? totals.job + totals.phd : 0;
		const mark = d.marks.find((m) => m.day === day) ?? null;
		let delta: number | null = null;
		if (inMonth && day !== d.today && (worked > 0 || mark) && d.dayTargetMs !== null) {
			const expected = !isWeekend(day) && !isDayOff(mark?.type) ? d.dayTargetMs : 0;
			if (worked > 0 || expected > 0) delta = worked - expected;
		}
		return { day, inMonth, mark, worked, delta };
	}

	function barLabel(m: DayMark): string {
		if (m.type === 'holiday') return m.note ?? DAY_MARK_LABELS.holiday;
		return m.note ? `${DAY_MARK_LABELS[m.type]} · ${m.note}` : DAY_MARK_LABELS[m.type];
	}

	const weeks = $derived.by((): Week[] => {
		if (!data) return [];
		const first = dayStart(`${data.month}-01`);
		const offset = (first.getDay() - data.weekStartDay + 7) % 7;
		let day = addDaysKey(dayKey(first), -offset);
		const result: Week[] = [];
		while (result.length < 6) {
			const cells: Cell[] = [];
			for (let i = 0; i < 7; i++, day = addDaysKey(day, 1))
				cells.push(cellFor(day, day.startsWith(data.month), data));
			const bars: Bar[] = [];
			for (let i = 0; i < 7; i++) {
				const m = cells[i].inMonth ? cells[i].mark : null;
				if (!m) continue;
				let span = 1;
				while (i + span < 7) {
					const next = cells[i + span].inMonth ? cells[i + span].mark : null;
					if (!next || next.type !== m.type || barLabel(next) !== barLabel(m)) break;
					span++;
				}
				bars.push({ start: i + 1, span, label: barLabel(m), type: m.type });
				i += span - 1;
			}
			result.push({ cells, bars });
			if (!day.startsWith(data.month)) break;
		}
		return result;
	});

	const totals = $derived.by(() => {
		let worked = 0;
		let delta = 0;
		let hasDelta = false;
		for (const w of weeks)
			for (const c of w.cells) {
				if (!c.inMonth) continue;
				worked += c.worked;
				if (c.delta !== null) {
					delta += c.delta;
					hasDelta = true;
				}
			}
		return { worked, delta: hasDelta ? delta : null };
	});

	function signed(ms: number): string {
		const rounded = Math.round(ms / 60000) * 60000;
		if (rounded === 0) return '±0:00';
		return `${rounded > 0 ? '+' : '−'}${fmtDuration(Math.abs(rounded))}`;
	}

	function pick(day: string) {
		dialog?.close();
		goto(`/?day=${day}`);
	}

	function onkeydown(e: KeyboardEvent) {
		// ←/→ switch months, not the day behind the modal
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			e.stopPropagation();
			e.preventDefault();
			shiftMonth(e.key === 'ArrowLeft' ? -1 : 1);
		}
	}

	const BAR_CLASS: Record<DayMark['type'], string> = {
		vacation: 'bg-phd/15 text-ink',
		sick: 'bg-critical/15 text-ink',
		holiday: 'bg-job/15 text-ink',
		home_office: 'hairline bg-surface text-ink-2'
	};
</script>

<dialog
	bind:this={dialog}
	onclose={onclose}
	{onkeydown}
	class="m-auto w-[min(96vw,58rem)] rounded-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40"
>
	<div class="flex flex-col gap-3 p-5">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-1">
				<button
					class="rounded-md px-2 py-1 text-ink-2 hover:bg-line/50 hover:text-ink"
					onclick={() => shiftMonth(-1)}
					aria-label="Previous month">◀</button
				>
				<h2 class="min-w-40 text-center text-base font-semibold">{title}</h2>
				<button
					class="rounded-md px-2 py-1 text-ink-2 hover:bg-line/50 hover:text-ink"
					onclick={() => shiftMonth(1)}
					aria-label="Next month">▶</button
				>
				{#if month !== dayKey(Date.now()).slice(0, 7)}
					<button
						class="ml-2 rounded-md px-2 py-1 text-sm text-ink-2 underline-offset-2 hover:underline"
						onclick={() => (month = dayKey(Date.now()).slice(0, 7))}>This month</button
					>
				{/if}
			</div>
			<button
				class="rounded-md px-2 py-1 text-muted hover:bg-line/50 hover:text-ink"
				onclick={() => dialog?.close()}
				aria-label="Close">✕</button
			>
		</div>

		{#if error}
			<p class="text-sm text-critical">{error}</p>
		{:else if data}
			<div class="grid grid-cols-7 text-center text-xs font-medium text-muted uppercase">
				{#each weekdayNames as name (name)}
					<div class="py-1">{name}</div>
				{/each}
			</div>
			<div class="flex flex-col gap-1">
				{#each weeks as week, wi (wi)}
					<div class="grid grid-cols-7 grid-rows-[auto_1.35rem] gap-x-1">
						{#each week.cells as c, i (c.day)}
							{#if c.inMonth}
								<button
									class="hairline flex flex-col justify-between rounded-lg bg-page px-2 py-1.5 text-left hover:bg-line/40"
									style="grid-column: {i + 1}; grid-row: 1 / span 2"
									onclick={() => pick(c.day)}
									aria-label={c.day}
								>
									<span
										class="text-xs tabular-nums {isWeekend(c.day) ? 'text-muted' : 'text-ink-2'}"
										class:font-semibold={c.day === data.today}
										class:text-ink={c.day === data.today}
									>
										{Number(c.day.slice(8))}
									</span>
									<span class="mb-5 text-sm font-medium tabular-nums">
										{#if c.delta !== null}
											<span class={c.delta > 0 ? 'text-good' : c.delta < 0 ? 'text-critical' : 'text-ink-2'}>
												{signed(c.delta)}
											</span>
										{:else if c.worked > 0}
											{fmtDuration(c.worked)}
										{:else}
											&nbsp;
										{/if}
									</span>
								</button>
							{:else}
								<div style="grid-column: {i + 1}; grid-row: 1 / span 2"></div>
							{/if}
						{/each}
						{#each week.bars as bar (bar.start)}
							<div
								class="pointer-events-none z-10 mx-1 mb-1 self-end truncate rounded-md px-1.5 py-0.5 text-xs font-medium {BAR_CLASS[bar.type]}"
								style="grid-column: {bar.start} / span {bar.span}; grid-row: 2"
								title={bar.label}
							>
								{bar.label}
							</div>
						{/each}
					</div>
				{/each}
			</div>
			<div class="flex items-center justify-end gap-4 border-t border-line pt-3 text-sm tabular-nums">
				<span><span class="text-muted">Worked</span> <span class="font-medium">{fmtDuration(totals.worked)} h</span></span>
				{#if totals.delta !== null}
					<span class="font-medium {totals.delta > 0 ? 'text-good' : totals.delta < 0 ? 'text-critical' : 'text-ink-2'}">
						{signed(totals.delta)} h
					</span>
				{/if}
			</div>
		{:else}
			<p class="py-10 text-center text-sm text-muted">Loading…</p>
		{/if}
	</div>
</dialog>

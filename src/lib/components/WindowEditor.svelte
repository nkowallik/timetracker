<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/client';
	import { fmtClock, parseClock } from '$lib/time';
	import type { Side, WorkWindow } from '$lib/types';

	let {
		side,
		day,
		window: win = null,
		onclose
	}: {
		side: Side;
		day: string;
		window?: WorkWindow | null;
		onclose: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let start = $state(win ? fmtClock(win.startTs) : '');
	// svelte-ignore state_referenced_locally
	let end = $state(win?.endTs ? fmtClock(win.endTs) : '');
	// svelte-ignore state_referenced_locally
	let note = $state(win?.note ?? '');
	let error = $state('');
	let busy = $state(false);
	const isRunning = $derived(win !== null && win.endTs === null);

	function normalize() {
		start = start.trim() ? (parseClock(start) ?? start) : '';
		end = end.trim() ? (parseClock(end) ?? end) : '';
	}

	async function save() {
		if (busy) return;
		error = '';
		if (!start.trim() || (!end.trim() && !isRunning)) {
			error = 'Start and end times are required.';
			return;
		}
		const startHm = parseClock(start);
		const endHm = end.trim() ? parseClock(end) : null;
		if (!startHm || (end.trim() && !endHm)) {
			error = 'Times must be 24h — e.g. 900 or 9:00 for 09:00.';
			return;
		}
		start = startHm;
		if (endHm) end = endHm;
		busy = true;
		try {
			if (win) {
				const patch: Record<string, unknown> = { day, start: startHm, note };
				if (!isRunning || endHm) patch.end = endHm ?? undefined;
				await api(`/api/windows/${win.id}`, 'PATCH', patch);
			} else {
				await api('/api/windows', 'POST', { side, day, start: startHm, end: endHm, note });
			}
			await invalidateAll();
			onclose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			busy = false;
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') save();
		else if (e.key === 'Escape') onclose();
	}
</script>

<div class="hairline rounded-lg bg-surface p-2.5" role="form">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="flex items-center gap-1.5" {onkeydown}>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			inputmode="numeric"
			bind:value={start}
			onblur={normalize}
			autofocus
			aria-label="Start time (24h)"
			placeholder="9:00"
			class="hairline w-16 rounded-md bg-page px-1.5 py-1 text-center text-sm tabular-nums"
		/>
		<span class="text-muted">–</span>
		<input
			type="text"
			inputmode="numeric"
			bind:value={end}
			onblur={normalize}
			aria-label="End time (24h)"
			placeholder={isRunning ? 'now' : '17:00'}
			class="hairline w-16 rounded-md bg-page px-1.5 py-1 text-center text-sm tabular-nums"
		/>
		<input
			type="text"
			bind:value={note}
			placeholder="note"
			aria-label="Note"
			class="hairline min-w-0 flex-1 rounded-md bg-page px-2 py-1 text-sm"
		/>
		<button
			onclick={save}
			disabled={busy}
			class="rounded-md bg-ink px-2.5 py-1 text-sm font-medium text-page hover:opacity-85"
			>✓</button
		>
		<button onclick={onclose} class="rounded-md px-1.5 py-1 text-sm text-muted hover:text-ink"
			>✕</button
		>
	</div>
	{#if isRunning}
		<p class="mt-1.5 text-xs text-muted">Running timer — leave end empty to keep it running.</p>
	{/if}
	{#if error}
		<p class="mt-1.5 text-xs text-critical">{error}</p>
	{/if}
</div>

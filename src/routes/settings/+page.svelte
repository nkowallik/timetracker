<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/client';
	import type { Settings } from '$lib/types';
	import { GERMAN_STATES, type GermanState } from '$lib/holidays';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let targetJobPct = $state(data.settings.targetJobPct);
	// svelte-ignore state_referenced_locally
	let weekStartDay = $state(data.settings.weekStartDay);
	// svelte-ignore state_referenced_locally
	const initialWt = data.settings.weeklyHourTarget;
	let wtHours = $state<number | null>(initialWt !== null ? Math.floor(initialWt) : null);
	let wtMinutes = $state<number | null>(initialWt !== null ? Math.round((initialWt % 1) * 60) : null);
	// svelte-ignore state_referenced_locally
	const initialDt = data.settings.dailyHourTarget;
	let dtHours = $state<number | null>(initialDt !== null ? Math.floor(initialDt) : null);
	let dtMinutes = $state<number | null>(initialDt !== null ? Math.round((initialDt % 1) * 60) : null);
	// svelte-ignore state_referenced_locally
	const initialOt = data.settings.initialOvertimeHours;
	let otSign = $state<1 | -1>(initialOt < 0 ? -1 : 1);
	let otHours = $state(Math.floor(Math.abs(initialOt)));
	let otMinutes = $state(Math.round((Math.abs(initialOt) % 1) * 60));
	// svelte-ignore state_referenced_locally
	let theme = $state(data.settings.theme);
	// svelte-ignore state_referenced_locally
	let holidayState = $state<GermanState | ''>(data.settings.holidayState ?? '');
	// svelte-ignore state_referenced_locally
	let phdEnabled = $state(data.settings.phdEnabled);
	let saved = $state(false);
	let error = $state('');

	const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	async function save() {
		error = '';
		saved = false;
		const weeklyTarget = (Number(wtHours) || 0) + (Number(wtMinutes) || 0) / 60;
		const dailyTarget = (Number(dtHours) || 0) + (Number(dtMinutes) || 0) / 60;
		try {
			await api<Settings>('/api/settings', 'PUT', {
				targetJobPct: Number(targetJobPct),
				weekStartDay: Number(weekStartDay),
				weeklyHourTarget: weeklyTarget > 0 ? weeklyTarget : null,
				dailyHourTarget: dailyTarget > 0 ? dailyTarget : null,
				initialOvertimeHours: otSign * ((Number(otHours) || 0) + (Number(otMinutes) || 0) / 60),
				theme,
				holidayState: holidayState || null,
				phdEnabled
			});
			await invalidateAll();
			saved = true;
			setTimeout(() => (saved = false), 2500);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		}
	}
</script>

<svelte:head><title>Settings · TimeTracker</title></svelte:head>

<div class="mx-auto flex w-full max-w-md flex-col gap-6">
	<h1 class="text-xl font-semibold">Settings</h1>

	<section class="hairline flex flex-col gap-4 rounded-xl bg-surface p-4">
		<label class="flex items-center justify-between gap-3 text-sm">
			<span class="font-medium">PhD tracking</span>
			<input type="checkbox" bind:checked={phdEnabled} class="h-4 w-4 accent-[var(--series-phd)]" />
		</label>

		{#if phdEnabled}
		<label class="flex flex-col gap-2">
			<span class="flex justify-between text-sm">
				<span class="font-medium">Target split</span>
				<span class="tabular-nums text-ink-2">
					<span class="font-medium text-ink">{targetJobPct}%</span> Job /
					<span class="font-medium text-ink">{100 - targetJobPct}%</span> PhD
				</span>
			</span>
			<input type="range" min="0" max="100" step="5" bind:value={targetJobPct} class="accent-[var(--series-job)]" />
			<span class="text-xs text-muted">Informational only — nothing is enforced. The summary compares your actual split against this.</span>
		</label>
		{/if}

		<label class="flex items-center justify-between gap-3 text-sm">
			<span class="font-medium">Week starts on</span>
			<select bind:value={weekStartDay} class="hairline rounded-md bg-page px-2 py-1">
				{#each WEEKDAYS as name, i (i)}
					<option value={i}>{name}</option>
				{/each}
			</select>
		</label>

		<div class="flex items-center justify-between gap-3 text-sm">
			<span class="font-medium">Weekly hour target <span class="font-normal text-muted">(optional)</span></span>
			<span class="flex items-center gap-1.5">
				<input
					type="number"
					min="0"
					max="168"
					step="1"
					bind:value={wtHours}
					placeholder="—"
					aria-label="Target hours"
					class="hairline w-16 rounded-md bg-page px-2 py-1 text-right tabular-nums"
				/>
				<span class="text-muted">h</span>
				<input
					type="number"
					min="0"
					max="59"
					step="1"
					bind:value={wtMinutes}
					placeholder="0"
					aria-label="Target minutes"
					class="hairline w-14 rounded-md bg-page px-2 py-1 text-right tabular-nums"
				/>
				<span class="text-muted">m</span>
			</span>
		</div>

		<div class="flex flex-col gap-1.5 text-sm">
			<div class="flex items-center justify-between gap-3">
				<span class="font-medium">Daily hour target <span class="font-normal text-muted">(optional)</span></span>
				<span class="flex items-center gap-1.5">
					<input
						type="number"
						min="0"
						max="24"
						step="1"
						bind:value={dtHours}
						placeholder="—"
						aria-label="Daily target hours"
						class="hairline w-16 rounded-md bg-page px-2 py-1 text-right tabular-nums"
					/>
					<span class="text-muted">h</span>
					<input
						type="number"
						min="0"
						max="59"
						step="1"
						bind:value={dtMinutes}
						placeholder="0"
						aria-label="Daily target minutes"
						class="hairline w-14 rounded-md bg-page px-2 py-1 text-right tabular-nums"
					/>
					<span class="text-muted">m</span>
				</span>
			</div>
			<span class="text-xs text-muted">
				The tracker shows the day's hours against this maximum, and rings an alarm you have to
				dismiss once it is crossed.
			</span>
		</div>

		<div class="flex flex-col gap-1.5 text-sm">
			<div class="flex items-center justify-between gap-3">
				<span class="font-medium">Starting overtime</span>
				<span class="flex items-center gap-1.5">
					<select bind:value={otSign} aria-label="Sign" class="hairline rounded-md bg-page px-1.5 py-1">
						<option value={1}>+</option>
						<option value={-1}>−</option>
					</select>
					<input
						type="number"
						min="0"
						max="10000"
						step="1"
						bind:value={otHours}
						placeholder="0"
						aria-label="Hours"
						class="hairline w-16 rounded-md bg-page px-2 py-1 text-right tabular-nums"
					/>
					<span class="text-muted">h</span>
					<input
						type="number"
						min="0"
						max="59"
						step="1"
						bind:value={otMinutes}
						placeholder="0"
						aria-label="Minutes"
						class="hairline w-14 rounded-md bg-page px-2 py-1 text-right tabular-nums"
					/>
					<span class="text-muted">m</span>
				</span>
			</div>
			<span class="text-xs text-muted">
				Overtime you bring along from before using this app — counted into the balance.
			</span>
		</div>

		<label class="flex items-center justify-between gap-3 text-sm">
			<span class="font-medium">Public holidays</span>
			<select bind:value={holidayState} class="hairline rounded-md bg-page px-2 py-1">
				<option value="">None</option>
				{#each GERMAN_STATES as s (s.code)}
					<option value={s.code}>{s.name}</option>
				{/each}
			</select>
		</label>

		<label class="flex items-center justify-between gap-3 text-sm">
			<span class="font-medium">Theme</span>
			<select bind:value={theme} class="hairline rounded-md bg-page px-2 py-1">
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</label>

		<div class="flex items-center gap-3 border-t border-line pt-3">
			<button
				onclick={save}
				class="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-page hover:opacity-85">Save</button
			>
			{#if saved}<span class="text-sm text-good">Saved ✓</span>{/if}
			{#if error}<span class="text-sm text-critical">{error}</span>{/if}
		</div>
	</section>
</div>

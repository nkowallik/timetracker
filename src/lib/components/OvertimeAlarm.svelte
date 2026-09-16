<script lang="ts">
	import { fmtDuration } from '$lib/time';

	let {
		todayTotalMs,
		dailyTargetMs,
		today
	}: { todayTotalMs: number; dailyTargetMs: number | null; today: string } = $props();

	// dismissed once per day
	let dismissedDay = $state<string | null>(null);

	$effect(() => {
		dismissedDay = localStorage.getItem('overtime-alarm-dismissed');
	});

	const over = $derived(dailyTargetMs !== null && todayTotalMs >= dailyTargetMs);
	const visible = $derived(over && dismissedDay !== today);
	const overtimeMs = $derived(dailyTargetMs !== null ? todayTotalMs - dailyTargetMs : 0);

	function dismiss() {
		localStorage.setItem('overtime-alarm-dismissed', today);
		dismissedDay = today;
	}

	// soft bell arpeggio in a phone-ring pattern: two phrases, then a pause
	$effect(() => {
		if (!visible) return;
		let ctx: AudioContext | null = null;
		try {
			ctx = new AudioContext();
		} catch {
			return;
		}

		const out = ctx.createGain();
		out.gain.value = 0.5;
		const tone = ctx.createBiquadFilter();
		tone.type = 'lowpass';
		tone.frequency.value = 2600;
		tone.Q.value = 0.7;
		tone.connect(out).connect(ctx.destination);

		const PARTIALS = [
			{ ratio: 1, gain: 0.26 },
			{ ratio: 2, gain: 0.09 },
			{ ratio: 3, gain: 0.03 }
		];

		const bell = (freq: number, at: number, dur = 0.9) => {
			if (!ctx) return;
			for (const { ratio, gain: peak } of PARTIALS) {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.value = freq * ratio;
				gain.gain.setValueAtTime(0.0001, at);
				gain.gain.exponentialRampToValueAtTime(peak, at + 0.03);
				gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
				osc.connect(gain).connect(tone);
				osc.start(at);
				osc.stop(at + dur + 0.05);
			}
		};

		// E5 G#5 B5 G#5
		const PHRASE = [
			{ freq: 659.25, at: 0 },
			{ freq: 830.61, at: 0.19 },
			{ freq: 987.77, at: 0.38 },
			{ freq: 830.61, at: 0.57 }
		];
		const PHRASE_GAP = 0.95;
		const CYCLE_MS = 4200;

		const ring = () => {
			if (!ctx) return;
			void ctx.resume(); // may need a prior user gesture
			const t = ctx.currentTime + 0.05;
			for (const { freq, at } of PHRASE) {
				bell(freq, t + at);
				bell(freq, t + PHRASE_GAP + at);
			}
		};
		ring();
		const interval = setInterval(ring, CYCLE_MS);
		return () => {
			clearInterval(interval);
			void ctx?.close();
		};
	});
</script>

{#if visible}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="alarm-title"
	>
		<div class="hairline flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-surface p-8 text-center shadow-2xl">
			<span class="animate-bounce text-5xl" aria-hidden="true">⏰</span>
			<h2 id="alarm-title" class="text-xl font-semibold">Daily target reached</h2>
			<p class="text-ink-2">
				You've tracked
				<span class="font-semibold tabular-nums">{fmtDuration(todayTotalMs)} h</span>
				today — that's
				<span class="font-semibold text-critical tabular-nums">+{fmtDuration(Math.max(0, overtimeMs))} h</span>
				past your daily {fmtDuration(dailyTargetMs ?? 0)} h. You're going into overtime.
			</p>
			<button
				onclick={dismiss}
				class="mt-1 w-full rounded-xl bg-ink px-6 py-3.5 text-lg font-semibold text-page hover:opacity-85"
			>
				OK, I know
			</button>
		</div>
	</div>
{/if}

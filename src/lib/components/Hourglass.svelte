<script lang="ts">
	let { running = false }: { running?: boolean } = $props();
</script>

<div class="hourglass text-baseline" class:running title={running ? 'Timer running' : 'TimeTracker'}>
	<svg viewBox="0 0 24 24" class="h-10 w-10" role="img" aria-label="Hourglass">
		<defs>
			<!-- bulb interiors; the sand rects are clipped to these -->
			<clipPath id="hg-bulb-top">
				<path d="M7.9 4.4 h8.2 v1.4 c0 2.8 -3.7 3.6 -4.1 5.6 c-0.4 -2 -4.1 -2.8 -4.1 -5.6 v-1.4 z" />
			</clipPath>
			<clipPath id="hg-bulb-bottom">
				<path d="M12 12.6 c0 1.9 3.3 2.4 4.1 4.9 v2.4 h-8.2 v-2.4 c0.8 -2.5 4.1 -3 4.1 -4.9 z" />
			</clipPath>
		</defs>
		<!-- sand streams, visible while running -->
		<rect class="stream stream-down" x="11.6" y="12.2" width="0.8" height="6.4" rx="0.4" fill="var(--series-job)" />
		<rect class="stream stream-up" x="11.6" y="5.4" width="0.8" height="6.4" rx="0.4" fill="var(--series-phd)" />
		<!-- sand: Job on top, PhD below; the clip wrapper must stay untransformed -->
		<g clip-path="url(#hg-bulb-top)">
			<rect class="sand sand-top fill-job" x="7.5" y="4.2" width="9" height="7.6" />
		</g>
		<g clip-path="url(#hg-bulb-bottom)">
			<rect class="sand sand-bottom fill-phd" x="7.5" y="12.2" width="9" height="7.9" />
		</g>
		<!-- glass -->
		<path
			d="M7 3.8 v2 c0 3 4 3.8 4 6.2 c0 2.4 -4 3.2 -4 6.2 v2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
		<path
			d="M17 3.8 v2 c0 3 -4 3.8 -4 6.2 c0 2.4 4 3.2 4 6.2 v2"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
		<!-- caps -->
		<line x1="5.2" y1="3.2" x2="18.8" y2="3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
		<line x1="5.2" y1="20.8" x2="18.8" y2="20.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
	</svg>
</div>

<style>
	.hourglass svg {
		transition: transform 0.6s ease-in-out;
	}
	/* rest state: both bulbs partly filled */
	.sand {
		transform-box: fill-box;
		transform: scaleY(0.75);
		transform-origin: 50% 100%;
		transition: transform 0.4s ease;
	}
	.stream {
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	/* 9s cycle: 0–40% upright, top drains and bottom fills; 40–50% flip;
	   50–90% inverted, the sand runs back; 90–100% flip back.
	   transform-origin only changes while a rect is at scaleY(0) or scaleY(1). */
	.running svg {
		animation: hg-flip 9s ease-in-out infinite;
	}
	.running .sand-top {
		animation: hg-sand-top 9s linear infinite;
	}
	.running .sand-bottom {
		animation: hg-sand-bottom 9s linear infinite;
	}
	.running .stream-down {
		animation: hg-stream-down 9s linear infinite;
	}
	.running .stream-up {
		animation: hg-stream-up 9s linear infinite;
	}

	@keyframes hg-flip {
		0%,
		40% {
			transform: rotate(0deg);
		}
		50%,
		90% {
			transform: rotate(180deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes hg-sand-top {
		0% {
			transform: scaleY(1);
			transform-origin: 50% 100%;
		}
		40%,
		45% {
			transform: scaleY(0);
			transform-origin: 50% 100%;
		}
		46%,
		50% {
			transform: scaleY(0);
			transform-origin: 50% 0%;
		}
		90% {
			transform: scaleY(1);
			transform-origin: 50% 0%;
		}
		100% {
			transform: scaleY(1);
			transform-origin: 50% 100%;
		}
	}

	@keyframes hg-sand-bottom {
		0% {
			transform: scaleY(0);
			transform-origin: 50% 100%;
		}
		40%,
		50% {
			transform: scaleY(1);
			transform-origin: 50% 100%;
		}
		51% {
			transform: scaleY(1);
			transform-origin: 50% 0%;
		}
		90%,
		99% {
			transform: scaleY(0);
			transform-origin: 50% 0%;
		}
		100% {
			transform: scaleY(0);
			transform-origin: 50% 100%;
		}
	}

	@keyframes hg-stream-down {
		0%,
		36% {
			opacity: 0.9;
		}
		40%,
		100% {
			opacity: 0;
		}
	}

	@keyframes hg-stream-up {
		0%,
		50% {
			opacity: 0;
		}
		52%,
		86% {
			opacity: 0.9;
		}
		90%,
		100% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.running svg,
		.running .sand,
		.running .stream {
			animation: none;
		}
	}
</style>

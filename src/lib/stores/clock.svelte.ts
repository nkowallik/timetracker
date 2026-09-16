export const clock = $state({ now: Date.now() });

let started = false;

export function startClock() {
	if (started) return;
	started = true;
	setInterval(() => {
		clock.now = Date.now();
	}, 1000);
}

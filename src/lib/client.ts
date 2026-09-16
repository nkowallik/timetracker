/** JSON fetch wrapper; throws with the server's error message on failure. */
export async function api<T = unknown>(
	path: string,
	method: string = 'GET',
	body?: unknown
): Promise<T> {
	const res = await fetch(path, {
		method,
		headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
	return data as T;
}

export const API_URL = 'https://cowork-booking-backend.onrender.com';

export async function apiFetch(path: string, options: RequestInit = {}) {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {})
		}
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err?.error?.message || 'API error');
	}

	// 204 No Content
	if (res.status === 204) {
		return null;
	}

	return res.json();
}

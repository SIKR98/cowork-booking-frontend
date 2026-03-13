<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api/api';
	import { resolve } from '$app/paths';

	let health = 'Checking backend...';

	onMount(async () => {
		try {
			const res = await apiFetch('/health');
			health = res.ok ? 'Online' : 'Unavailable';
		} catch (err) {
			if (err instanceof Error) {
				health = 'Unavailable';
			} else {
				health = 'Unavailable';
			}
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-8">
	<div class="w-full max-w-5xl">
		<div class="rounded-2xl bg-white p-10 shadow md:p-14">
			<div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
				<div class="space-y-6">
					<div class="space-y-4">
						<h1 class="text-4xl leading-tight font-bold text-gray-900 md:text-5xl">
							Book, Schedule, Organize.
						</h1>

						<p class="text-lg leading-relaxed text-gray-600">
							Cowork Booking helps reserve meeting rooms, manage bookings, and keep track of
							workspace availability in one simple platform. Users can create and manage their own
							bookings, while administrators can manage rooms, users, and all bookings from a single
							dashboard.
						</p>
					</div>

					<div class="flex flex-col gap-4 sm:flex-row">
						<a
							href={resolve('/register')}
							class="rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-medium text-gray-900 transition hover:bg-gray-50"
						>
							Register
						</a>

						<a
							href={resolve('/login')}
							class="rounded-lg bg-black px-6 py-3 text-center font-medium text-white transition hover:opacity-90"
						>
							Login
						</a>
					</div>

					<div class="border-t border-gray-200 pt-4">
						<p class="text-sm text-gray-500">
							Backend status:
							<span
								class:text-green-600={health === 'Online'}
								class:text-red-600={health !== 'Online'}
								class="font-semibold"
							>
								{health}
							</span>
						</p>
					</div>
				</div>

				<div class="rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
					<div class="space-y-5">
						<h2 class="text-center text-2xl font-semibold text-gray-900">What you can do</h2>

						<div class="grid gap-4">
							<div class="rounded-xl border border-gray-200 bg-white p-4">
								<h3 class="font-semibold text-gray-900">For users</h3>
								<p class="mt-1 text-sm text-gray-600">
									Register an account, log in, book rooms, update bookings, and cancel reservations
									when plans change.
								</p>
							</div>

							<div class="rounded-xl border border-gray-200 bg-white p-4">
								<h3 class="font-semibold text-gray-900">For administrators</h3>
								<p class="mt-1 text-sm text-gray-600">
									Create, update, and delete rooms, manage users, and get a full overview of all
									bookings in the system.
								</p>
							</div>

							<div class="rounded-xl border border-gray-200 bg-white p-4">
								<h3 class="font-semibold text-gray-900">For teams</h3>
								<p class="mt-1 text-sm text-gray-600">
									Reduce scheduling conflicts and make room availability easy to understand at a
									glance.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { apiFetch } from '$lib/api/api';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let username = '';
	let password = '';
	let error = '';
	let loading = false;

	async function register() {
		error = '';
		loading = true;

		try {
			await apiFetch('/register', {
				method: 'POST',
				body: JSON.stringify({
					username,
					password
				})
			});

			alert('Account created successfully!');
			goto(resolve('/login'));
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Registration failed';
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
	<div class="w-full max-w-md rounded-xl bg-white p-6 shadow">
		<h1 class="mb-6 text-2xl font-bold">Register</h1>

		<form on:submit|preventDefault={register} class="space-y-4">
			<div>
				<label for="username" class="mb-1 block text-sm font-medium">Username</label>
				<input
					id="username"
					bind:value={username}
					type="text"
					class="w-full rounded-lg border px-3 py-2"
					placeholder="Enter username"
					required
				/>
			</div>

			<div>
				<label for="password" class="mb-1 block text-sm font-medium">Password</label>
				<input
					id="password"
					bind:value={password}
					type="password"
					class="w-full rounded-lg border px-3 py-2"
					placeholder="Enter password"
					required
				/>
			</div>

			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}

			<button
				type="submit"
				class="w-full cursor-pointer rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
				disabled={loading}
			>
				{#if loading}Creating account...{:else}Register{/if}
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-600">
			Already have an account?
			<a href={resolve('/login')} class="text-blue-600 underline"> Login </a>
		</p>
	</div>
</div>

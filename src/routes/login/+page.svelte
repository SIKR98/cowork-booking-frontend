<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { apiFetch } from '$lib/api/api';

  let username = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));

      goto(resolve('/dashboard'));
    } catch (err) {
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'Login failed';
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-100">
  <div class="w-full max-w-md bg-white rounded-xl shadow p-6">
    <h1 class="text-2xl font-bold mb-6">Login</h1>

    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <div>
        <label for="username" class="block text-sm font-medium mb-1">Username</label>
        <input
          id="username"
          bind:value={username}
          type="text"
          class="w-full border rounded-lg px-3 py-2"
          placeholder="Enter username"
          required
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium mb-1">Password</label>
        <input
          id="password"
          bind:value={password}
          type="password"
          class="w-full border rounded-lg px-3 py-2"
          placeholder="Enter password"
          required
        />
      </div>

      {#if error}
        <p class="text-red-600 text-sm">{error}</p>
      {/if}

      <button
        type="submit"
        class="w-full bg-black text-white rounded-lg px-4 py-2 disabled:opacity-50 cursor-pointer"
        disabled={loading}
      >
        {#if loading}Logging in...{:else}Login{/if}
      </button>
    </form>
      <p class="text-sm text-center text-gray-600 mt-4">
  Don't have an account?
  <a href={resolve("/register")} class="text-blue-600 underline">
    Register
  </a>
</p>
  </div>
</div>
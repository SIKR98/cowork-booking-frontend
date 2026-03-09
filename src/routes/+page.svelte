<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { apiFetch } from "$lib/api/api";

  let health = "Loading...";

  onMount(async () => {
    try {
      const res = await apiFetch("/health");
      health = JSON.stringify(res);
    } catch (err) {
      if (err instanceof Error) {
        health = err.message;
      } else {
        health = "Unknown error";
      }
    }
  });
</script>

<div class="min-h-screen flex flex-col items-center justify-center gap-6">
  <h1 class="text-3xl font-bold">Cowork Booking</h1>

  <p class="text-gray-600">
    Backend status: {health}
  </p>

  <a
    href={resolve('/login')}
    class="bg-black text-white px-6 py-3 rounded-lg"
  >
    Login
  </a>
</div>
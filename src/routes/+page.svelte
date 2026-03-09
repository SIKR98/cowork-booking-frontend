<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api/api";
  import { resolve } from "$app/paths";

  let health = "Checking backend...";

  onMount(async () => {
    try {
      const res = await apiFetch("/health");
      health = res.ok ? "Online" : "Unavailable";
    } catch (err) {
      if (err instanceof Error) {
        health = "Unavailable";
      } else {
        health = "Unavailable";
      }
    }
  });
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center p-8">
  <div class="w-full max-w-5xl">
    <div class="bg-white rounded-2xl shadow p-10 md:p-14">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div class="space-y-6">

          <div class="space-y-4">
            <h1 class="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
              Book, Schedule, Organize.
            </h1>

            <p class="text-lg text-gray-600 leading-relaxed">
              Cowork Booking helps reserve meeting rooms, manage bookings,
              and keep track of workspace availability in one simple platform.
              Users can create and manage their own bookings, while
              administrators can manage rooms, users, and all bookings from a
              single dashboard.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 ">
            <a
              href={resolve("/register")}
              class="bg-white border border-gray-300 text-gray-900 px-6 py-3 rounded-lg text-center font-medium hover:bg-gray-50 transition"
            >
              Register
            </a>

            <a
              href={resolve("/login")}
              class="bg-black text-white px-6 py-3 rounded-lg text-center font-medium hover:opacity-90 transition"
            >
              Login
            </a>
          </div>

          <div class="pt-4 border-t border-gray-200">
            <p class="text-sm text-gray-500">
              Backend status:
              <span
                class:text-green-600={health === "Online"}
                class:text-red-600={health !== "Online"}
                class="font-semibold"
              >
                {health}
              </span>
            </p>
          </div>
        </div>

        <div class="bg-gray-50 rounded-2xl border border-gray-200 p-6 md:p-8">
          <div class="space-y-5">
            <h2 class="text-2xl font-semibold text-gray-900 text-center">
              What you can do
            </h2>

            <div class="grid gap-4">
              <div class="bg-white border border-gray-200 rounded-xl p-4">
                <h3 class="font-semibold text-gray-900">For users</h3>
                <p class="text-sm text-gray-600 mt-1">
                  Register an account, log in, book rooms, update bookings, and
                  cancel reservations when plans change.
                </p>
              </div>

              <div class="bg-white border border-gray-200 rounded-xl p-4">
                <h3 class="font-semibold text-gray-900">For administrators</h3>
                <p class="text-sm text-gray-600 mt-1">
                  Create, update, and delete rooms, manage users, and get a full
                  overview of all bookings in the system.
                </p>
              </div>

              <div class="bg-white border border-gray-200 rounded-xl p-4">
                <h3 class="font-semibold text-gray-900">For teams</h3>
                <p class="text-sm text-gray-600 mt-1">
                  Reduce scheduling conflicts and make room availability easy to
                  understand at a glance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
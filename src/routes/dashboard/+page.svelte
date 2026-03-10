<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api/api";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { PUBLIC_API_BASE_URL } from "$env/static/public";
  import { io, type Socket } from "socket.io-client";

  type User = {
    id?: string;
    _id?: string;
    username: string;
    role: string;
  };

  type AdminUser = {
    _id: string;
    username: string;
    role: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type Room = {
    _id: string;
    name: string;
    capacity: number;
    type: string;
  };

  type Booking = {
    _id: string;
    roomId:
      | {
          _id: string;
          name: string;
          capacity: number;
          type: string;
        }
      | string;
    userId?:
      | {
          _id?: string;
          username: string;
          role: string;
        }
      | string;
    startTime: string;
    endTime: string;
  };

  type Notification = {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  };

  let user: User | null = null;
  let users: AdminUser[] = [];
  let rooms: Room[] = [];
  let bookings: Booking[] = [];
  let notifications: Notification[] = [];
  let loading = true;

  let bookingDate = "2026-03-09";
  let startTime = "09:00";
  let endTime = "10:00";

  let roomName = "";
  let roomCapacity = 1;
  let roomType = "conference";

  let bookingLoading = false;
  let createRoomLoading = false;
  let deletingUserId: string | null = null;

  let editingRoomId: string | null = null;
  let editRoomName = "";
  let editRoomCapacity = 1;
  let editRoomType = "conference";
  let updatingRoomLoading = false;

  let editingBookingId: string | null = null;
  let editBookingDate = "";
  let editStartTime = "";
  let editEndTime = "";
  let updatingBookingLoading = false;

  let notificationsOpen = false;
  let notificationsLoading = false;

  let socket: Socket | null = null;

  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("user");
    if (stored) {
      user = JSON.parse(stored) as User;
    }
  }

  async function loadDashboardData() {
    const token = localStorage.getItem("token") || "";

    const requests = [
      apiFetch("/rooms", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      apiFetch("/bookings", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      apiFetch("/notifications", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    ];

    if (user?.role === "Admin") {
      requests.push(
        apiFetch("/users", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      );
    }

    const results = await Promise.all(requests);

    const roomsRes = results[0] as { rooms: Room[] };
    const bookingsRes = results[1] as { bookings: Booking[] };
    const notificationsRes = results[2] as { notifications: Notification[] };

    rooms = roomsRes.rooms;
    bookings = bookingsRes.bookings;
    notifications = notificationsRes.notifications;

    if (user?.role === "Admin" && results[3]) {
      const usersRes = results[3] as { users: AdminUser[] };
      users = usersRes.users;
    } else {
      users = [];
    }
  }

  async function loadNotifications() {
    try {
      notificationsLoading = true;

      const token = localStorage.getItem("token") || "";
      const res = await apiFetch("/notifications", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      notifications = (res.notifications || []) as Notification[];
    } catch (err) {
      console.error(err);
    } finally {
      notificationsLoading = false;
    }
  }

  function unreadNotificationsCount() {
    return notifications.filter((n) => !n.isRead).length;
  }

  async function markAllNotificationsAsRead() {
    const unreadCount = unreadNotificationsCount();
    if (unreadCount === 0) return;

    try {
      const token = localStorage.getItem("token") || "";

      await apiFetch("/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      notifications = notifications.map((notification) => ({
        ...notification,
        isRead: true
      }));
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleNotifications() {
    notificationsOpen = !notificationsOpen;

    if (notificationsOpen) {
      await loadNotifications();
      await markAllNotificationsAsRead();
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} h ago`;
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function connectSocket() {
    const token = localStorage.getItem("token");
    if (!token) return;

    socket = io(PUBLIC_API_BASE_URL, {
      transports: ["websocket"],
      auth: {
        token
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socket.on("notification", async (incoming: Notification) => {
      const exists = notifications.some((n) => n._id === incoming._id);
      if (exists) return;

      notifications = [
        {
          ...incoming,
          isRead: notificationsOpen ? true : incoming.isRead
        },
        ...notifications
      ];

      if (notificationsOpen) {
        await markAllNotificationsAsRead();
      }
    });
  }

  onMount(() => {
    (async () => {
      try {
        await loadDashboardData();
        connectSocket();
      } catch (err) {
        console.error(err);
      } finally {
        loading = false;
      }
    })();

    return () => {
      socket?.disconnect();
      socket = null;
    };
  });

  async function handleBook(roomId: string) {
    try {
      if (!validateBookingInput()) return;

      bookingLoading = true;

      const token = localStorage.getItem("token") || "";

      await apiFetch("/bookings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId,
          startTime: buildIsoDateTime(bookingDate, startTime),
          endTime: buildIsoDateTime(bookingDate, endTime)
        })
      });

      await loadDashboardData();
      alert("Booking created successfully!");
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Booking failed");
      }
    } finally {
      bookingLoading = false;
    }
  }

  function startEditBooking(booking: Booking) {
    editingBookingId = booking._id;

    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    editBookingDate = formatDateForInput(start);
    editStartTime = formatTimeForInput(start);
    editEndTime = formatTimeForInput(end);
  }

  function cancelEditBooking() {
    editingBookingId = null;
    editBookingDate = "";
    editStartTime = "";
    editEndTime = "";
  }

  async function updateBooking(bookingId: string) {
    try {
      if (!validateBookingValues(editBookingDate, editStartTime, editEndTime)) {
        return;
      }

      updatingBookingLoading = true;

      const token = localStorage.getItem("token") || "";

      await apiFetch(`/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          startTime: buildIsoDateTime(editBookingDate, editStartTime),
          endTime: buildIsoDateTime(editBookingDate, editEndTime)
        })
      });

      await loadDashboardData();
      cancelEditBooking();
      alert("Booking updated successfully!");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to update booking");
      }
    } finally {
      updatingBookingLoading = false;
    }
  }

  async function cancelBooking(id: string) {
    try {
      const token = localStorage.getItem("token") || "";

      await apiFetch(`/bookings/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await loadDashboardData();
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to cancel booking");
      }
    }
  }

  async function createRoom() {
    try {
      createRoomLoading = true;

      const token = localStorage.getItem("token") || "";

      await apiFetch("/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: roomName,
          capacity: roomCapacity,
          type: roomType
        })
      });

      roomName = "";
      roomCapacity = 1;
      roomType = "conference";

      await loadDashboardData();
      alert("Room created successfully!");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to create room");
      }
    } finally {
      createRoomLoading = false;
    }
  }

  function startEditRoom(room: Room) {
    editingRoomId = room._id;
    editRoomName = room.name;
    editRoomCapacity = room.capacity;
    editRoomType = room.type;
  }

  function cancelEditRoom() {
    editingRoomId = null;
    editRoomName = "";
    editRoomCapacity = 1;
    editRoomType = "conference";
  }

  async function updateRoom(roomId: string) {
    try {
      updatingRoomLoading = true;

      const token = localStorage.getItem("token") || "";

      await apiFetch(`/rooms/${roomId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editRoomName,
          capacity: editRoomCapacity,
          type: editRoomType
        })
      });

      await loadDashboardData();
      cancelEditRoom();
      alert("Room updated successfully!");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to update room");
      }
    } finally {
      updatingRoomLoading = false;
    }
  }

  async function deleteRoom(id: string) {
    const confirmed = confirm(
      "Are you sure you want to delete this room? All bookings for this room will also be deleted."
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token") || "";

      await apiFetch(`/rooms/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await loadDashboardData();
      alert("Room deleted successfully!");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to delete room");
      }
    }
  }

  async function deleteUser(userId: string, username: string) {
    const currentUserId = user?.id || user?._id;

    if (currentUserId && currentUserId === userId) {
      alert("You cannot delete your own account while logged in.");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete user "${username}"?`
    );

    if (!confirmed) return;

    try {
      deletingUserId = userId;

      const token = localStorage.getItem("token") || "";

      await apiFetch(`/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      await loadDashboardData();
      alert("User deleted successfully!");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to delete user");
      }
    } finally {
      deletingUserId = null;
    }
  }

  function buildIsoDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  function formatDateForInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTimeForInput(date: Date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    goto(resolve("/login"));
  }

  function getBookingsForRoom(roomId: string) {
    return bookings.filter((b) => {
      if (typeof b.roomId === "string") {
        return b.roomId === roomId;
      }

      return b.roomId._id === roomId;
    });
  }

  function getBookingUserLabel(booking: Booking) {
    if (!booking.userId) return "Unknown user";
    if (typeof booking.userId === "string") return booking.userId;
    return `${booking.userId.username} (${booking.userId.role})`;
  }

  function validateBookingValues(
    selectedDateValue: string,
    startTimeValue: string,
    endTimeValue: string
  ) {
    const selectedDate = new Date(selectedDateValue);
    const today = new Date();

    const todayDateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    if (selectedDate < todayDateOnly) {
      alert("You cannot book a date in the past.");
      return false;
    }

    const now = new Date();
    const startDateTime = new Date(`${selectedDateValue}T${startTimeValue}:00`);

    if (startDateTime < now) {
      alert("You cannot book a time that has already passed.");
      return false;
    }

    if (endTimeValue <= startTimeValue) {
      alert("End time must be later than start time.");
      return false;
    }

    return true;
  }

  function validateBookingInput() {
    return validateBookingValues(bookingDate, startTime, endTime);
  }
</script>

<div class="min-h-screen bg-gray-100 p-8">
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="bg-white rounded-xl shadow p-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold mb-2">Dashboard</h1>

        {#if user}
          <p class="text-gray-700">
            Welcome, <span class="font-semibold">{user.username}</span>
            ({user.role})
          </p>
        {/if}
      </div>

      <div class="flex items-center gap-3 relative">
        <button
          class="relative bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50"
          on:click={toggleNotifications}
        >
          <span class="text-lg">🔔</span>

          {#if unreadNotificationsCount() > 0}
            <span class="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
              {unreadNotificationsCount()}
            </span>
          {/if}
        </button>

        <button
          class="bg-black text-white px-4 py-2 rounded-lg cursor-pointer"
          on:click={logout}
        >
          Logout
        </button>

        {#if notificationsOpen}
          <div class="absolute right-0 top-14 w-96 max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Notifications</h2>
              <button
                class="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                on:click={() => (notificationsOpen = false)}
              >
                Close
              </button>
            </div>

            {#if notificationsLoading}
              <p class="text-sm text-gray-500">Loading notifications...</p>
            {:else if notifications.length === 0}
              <p class="text-sm text-gray-500">No notifications yet.</p>
            {:else}
              <div class="max-h-96 overflow-y-auto space-y-3">
                {#each notifications as notification (notification._id)}
                  <div
                    class={`border rounded-lg p-3 ${
                      notification.isRead ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h3 class="font-medium text-sm">{notification.title}</h3>
                        <p class="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>

                      <span class="text-xs text-gray-400 shrink-0">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    {#if user?.role === "Admin"}
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div class="xl:col-span-5 space-y-6">
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Create Room</h2>

            <div class="flex flex-wrap gap-4 items-end">
              <div class="flex flex-col">
                <label for="roomName" class="text-sm text-gray-600">Room name</label>
                <input
                  id="roomName"
                  type="text"
                  bind:value={roomName}
                  class="border rounded px-3 py-2"
                />
              </div>

              <div class="flex flex-col">
                <label for="roomCapacity" class="text-sm text-gray-600">Capacity</label>
                <input
                  id="roomCapacity"
                  type="number"
                  bind:value={roomCapacity}
                  class="border rounded px-3 py-2 w-24"
                />
              </div>

              <div class="flex flex-col">
                <label for="roomType" class="text-sm text-gray-600">Type</label>
                <select
                  id="roomType"
                  bind:value={roomType}
                  class="border rounded px-3 py-2"
                >
                  <option value="conference">Conference</option>
                  <option value="workspace">Workspace</option>
                </select>
              </div>

              <button
                class="bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={createRoom}
                disabled={createRoomLoading}
              >
                {#if createRoomLoading}
                  Creating...
                {:else}
                  Create
                {/if}
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Rooms</h2>

            <div class="flex flex-wrap gap-4 mb-6">
              <div class="flex flex-col">
                <label for="bookingDate" class="text-sm text-gray-600">Date</label>
                <input
                  id="bookingDate"
                  type="date"
                  bind:value={bookingDate}
                  class="border rounded px-3 py-2"
                />
              </div>

              <div class="flex flex-col">
                <label for="startTime" class="text-sm text-gray-600">Start time</label>
                <input
                  id="startTime"
                  type="time"
                  bind:value={startTime}
                  class="border rounded px-3 py-2"
                />
              </div>

              <div class="flex flex-col">
                <label for="endTime" class="text-sm text-gray-600">End time</label>
                <input
                  id="endTime"
                  type="time"
                  bind:value={endTime}
                  class="border rounded px-3 py-2"
                />
              </div>
            </div>

            {#if loading}
              <p>Loading rooms...</p>
            {:else if rooms.length === 0}
              <p>No rooms found.</p>
            {:else}
              <div class="grid gap-4">
                {#each rooms as room (room._id)}
                  <div class="border rounded-lg p-4 flex justify-between items-start gap-4">
                    <div class="flex-1">
                      {#if editingRoomId === room._id}
                        <div class="space-y-3">
                          <div class="flex flex-col">
                            <label for={`edit-room-name-${room._id}`} class="text-sm text-gray-600">Room name</label>
                            <input
                              id={`edit-room-name-${room._id}`}
                              type="text"
                              bind:value={editRoomName}
                              class="border rounded px-3 py-2"
                            />
                          </div>

                          <div class="flex flex-col">
                            <label for={`edit-room-capacity-${room._id}`} class="text-sm text-gray-600">Capacity</label>
                            <input
                              id={`edit-room-capacity-${room._id}`}
                              type="number"
                              bind:value={editRoomCapacity}
                              class="border rounded px-3 py-2 w-24"
                            />
                          </div>

                          <div class="flex flex-col">
                            <label for={`edit-room-type-${room._id}`} class="text-sm text-gray-600">Type</label>
                            <select
                              id={`edit-room-type-${room._id}`}
                              bind:value={editRoomType}
                              class="border rounded px-3 py-2"
                            >
                              <option value="conference">Conference</option>
                              <option value="workspace">Workspace</option>
                            </select>
                          </div>
                        </div>
                      {:else}
                        <div>
                          <h3 class="font-semibold">{room.name}</h3>
                          <p class="text-sm text-gray-600">Capacity: {room.capacity}</p>
                          <p class="text-sm text-gray-600">Type: {room.type}</p>

                          <div class="mt-3">
                            <p class="text-sm font-medium text-gray-700">Booked:</p>

                            {#if getBookingsForRoom(room._id).length === 0}
                              <p class="text-sm text-gray-500">No bookings for this room.</p>
                            {:else}
                              <ul class="text-sm text-gray-600 list-disc ml-5">
                                {#each getBookingsForRoom(room._id) as booking (booking._id)}
                                  <li>
                                    {new Date(booking.startTime).toLocaleString()} –
                                    {new Date(booking.endTime).toLocaleString()}
                                  </li>
                                {/each}
                              </ul>
                            {/if}
                          </div>
                        </div>
                      {/if}
                    </div>

                    <div class="flex flex-col gap-2 shrink-0">
                      <button
                        class="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        on:click={() => handleBook(room._id)}
                        disabled={bookingLoading || editingRoomId === room._id}
                      >
                        {#if bookingLoading}
                          Booking...
                        {:else}
                          Book
                        {/if}
                      </button>

                      {#if editingRoomId === room._id}
                        <button
                          class="bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50"
                          on:click={() => updateRoom(room._id)}
                          disabled={updatingRoomLoading}
                        >
                          {#if updatingRoomLoading}
                            Saving...
                          {:else}
                            Save
                          {/if}
                        </button>

                        <button
                          class="bg-gray-500 text-white px-4 py-2 rounded-lg cursor-pointer"
                          on:click={cancelEditRoom}
                          disabled={updatingRoomLoading}
                        >
                          Cancel Edit
                        </button>
                      {:else}
                        <button
                          class="bg-amber-500 text-white px-4 py-2 rounded-lg cursor-pointer"
                          on:click={() => startEditRoom(room)}
                        >
                          Edit
                        </button>

                        <button
                          class="bg-red-600 text-white px-4 py-2 rounded-lg cursor-pointer"
                          on:click={() => deleteRoom(room._id)}
                        >
                          Delete
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="xl:col-span-4">
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">All Bookings</h2>

            {#if loading}
              <p>Loading bookings...</p>
            {:else if bookings.length === 0}
              <p>No bookings found.</p>
            {:else}
              <div class="grid gap-4">
                {#each bookings as booking (booking._id)}
                  <div class="border rounded-lg p-4 flex justify-between items-center gap-4">
                    <div class="flex-1">
                      {#if editingBookingId === booking._id}
                        <div class="space-y-3">
                          <p class="font-semibold">
                            {typeof booking.roomId === "string"
                              ? booking.roomId
                              : booking.roomId.name}
                          </p>

                          <p class="text-sm text-gray-600">
                            Booked by: {getBookingUserLabel(booking)}
                          </p>

                          <div class="flex flex-wrap gap-4">
                            <div class="flex flex-col">
                              <label for={`edit-booking-date-${booking._id}`} class="text-sm text-gray-600">Date</label>
                              <input
                                id={`edit-booking-date-${booking._id}`}
                                type="date"
                                bind:value={editBookingDate}
                                class="border rounded px-3 py-2"
                              />
                            </div>

                            <div class="flex flex-col">
                              <label for={`edit-booking-start-${booking._id}`} class="text-sm text-gray-600">Start</label>
                              <input
                                id={`edit-booking-start-${booking._id}`}
                                type="time"
                                bind:value={editStartTime}
                                class="border rounded px-3 py-2"
                              />
                            </div>

                            <div class="flex flex-col">
                              <label for={`edit-booking-end-${booking._id}`} class="text-sm text-gray-600">End</label>
                              <input
                                id={`edit-booking-end-${booking._id}`}
                                type="time"
                                bind:value={editEndTime}
                                class="border rounded px-3 py-2"
                              />
                            </div>
                          </div>
                        </div>
                      {:else}
                        <div>
                          <h3 class="font-semibold">
                            {typeof booking.roomId === "string"
                              ? booking.roomId
                              : booking.roomId.name}
                          </h3>

                          <p class="text-sm text-gray-600">
                            Booked by: {getBookingUserLabel(booking)}
                          </p>

                          <p class="text-sm text-gray-600">
                            Start: {new Date(booking.startTime).toLocaleString()}
                          </p>

                          <p class="text-sm text-gray-600">
                            End: {new Date(booking.endTime).toLocaleString()}
                          </p>
                        </div>
                      {/if}
                    </div>

                    <div class="flex flex-col gap-2 shrink-0">
                      {#if editingBookingId === booking._id}
                        <button
                          class="bg-green-600 text-white px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50"
                          on:click={() => updateBooking(booking._id)}
                          disabled={updatingBookingLoading}
                        >
                          {#if updatingBookingLoading}
                            Saving...
                          {:else}
                            Save
                          {/if}
                        </button>

                        <button
                          class="bg-gray-500 text-white px-3 py-2 rounded-lg cursor-pointer"
                          on:click={cancelEditBooking}
                          disabled={updatingBookingLoading}
                        >
                          Cancel Edit
                        </button>
                      {:else}
                        <button
                          class="bg-amber-500 text-white px-3 py-2 rounded-lg cursor-pointer"
                          on:click={() => startEditBooking(booking)}
                        >
                          Edit
                        </button>

                        <button
                          class="bg-red-500 text-white px-3 py-2 rounded-lg cursor-pointer"
                          on:click={() => cancelBooking(booking._id)}
                        >
                          Cancel
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="xl:col-span-3">
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Users</h2>

            {#if loading}
              <p>Loading users...</p>
            {:else if users.length === 0}
              <p>No users found.</p>
            {:else}
              <div class="grid gap-4">
                {#each users as listedUser (listedUser._id)}
                  <div class="border rounded-lg p-4 flex justify-between items-center gap-4">
                    <div>
                      <h3 class="font-semibold">{listedUser.username}</h3>
                      <p class="text-sm text-gray-600">Role: {listedUser.role}</p>
                    </div>

                    <button
                      class="bg-red-600 text-white px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      on:click={() => deleteUser(listedUser._id, listedUser.username)}
                      disabled={deletingUserId === listedUser._id || (user?.id === listedUser._id || user?._id === listedUser._id)}
                    >
                      {#if deletingUserId === listedUser._id}
                        Deleting...
                      {:else if user?.id === listedUser._id || user?._id === listedUser._id}
                        Current User
                      {:else}
                        Delete
                      {/if}
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Rooms</h2>

            <div class="flex flex-wrap gap-4 mb-6">
              <div class="flex flex-col">
                <label for="bookingDate" class="text-sm text-gray-600">Date</label>
                <input
                  id="bookingDate"
                  type="date"
                  bind:value={bookingDate}
                  class="border rounded px-3 py-2"
                />
              </div>

              <div class="flex flex-col">
                <label for="startTime" class="text-sm text-gray-600">Start time</label>
                <input
                  id="startTime"
                  type="time"
                  bind:value={startTime}
                  class="border rounded px-3 py-2"
                />
              </div>

              <div class="flex flex-col">
                <label for="endTime" class="text-sm text-gray-600">End time</label>
                <input
                  id="endTime"
                  type="time"
                  bind:value={endTime}
                  class="border rounded px-3 py-2"
                />
              </div>
            </div>

            {#if loading}
              <p>Loading rooms...</p>
            {:else if rooms.length === 0}
              <p>No rooms found.</p>
            {:else}
              <div class="grid gap-4">
                {#each rooms as room (room._id)}
                  <div class="border rounded-lg p-4 flex justify-between items-start gap-4">
                    <div class="flex-1">
                      <div>
                        <h3 class="font-semibold">{room.name}</h3>
                        <p class="text-sm text-gray-600">Capacity: {room.capacity}</p>
                        <p class="text-sm text-gray-600">Type: {room.type}</p>

                        <div class="mt-3">
                          <p class="text-sm font-medium text-gray-700">Booked:</p>

                          {#if getBookingsForRoom(room._id).length === 0}
                            <p class="text-sm text-gray-500">No bookings for this room.</p>
                          {:else}
                            <ul class="text-sm text-gray-600 list-disc ml-5">
                              {#each getBookingsForRoom(room._id) as booking (booking._id)}
                                <li>
                                  {new Date(booking.startTime).toLocaleString()} –
                                  {new Date(booking.endTime).toLocaleString()}
                                </li>
                              {/each}
                            </ul>
                          {/if}
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-col gap-2 shrink-0">
                      <button
                        class="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        on:click={() => handleBook(room._id)}
                        disabled={bookingLoading}
                      >
                        {#if bookingLoading}
                          Booking...
                        {:else}
                          Book
                        {/if}
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">My Bookings</h2>

          {#if loading}
            <p>Loading bookings...</p>
          {:else if bookings.length === 0}
            <p>No bookings found.</p>
          {:else}
            <div class="grid gap-4">
              {#each bookings as booking (booking._id)}
                <div class="border rounded-lg p-4 flex justify-between items-center gap-4">
                  <div class="flex-1">
                    {#if editingBookingId === booking._id}
                      <div class="space-y-3">
                        <p class="font-semibold">
                          {typeof booking.roomId === "string"
                            ? booking.roomId
                            : booking.roomId.name}
                        </p>

                        <div class="flex flex-wrap gap-4">
                          <div class="flex flex-col">
                            <label for={`user-edit-booking-date-${booking._id}`} class="text-sm text-gray-600">Date</label>
                            <input
                              id={`user-edit-booking-date-${booking._id}`}
                              type="date"
                              bind:value={editBookingDate}
                              class="border rounded px-3 py-2"
                            />
                          </div>

                          <div class="flex flex-col">
                            <label for={`user-edit-booking-start-${booking._id}`} class="text-sm text-gray-600">Start</label>
                            <input
                              id={`user-edit-booking-start-${booking._id}`}
                              type="time"
                              bind:value={editStartTime}
                              class="border rounded px-3 py-2"
                            />
                          </div>

                          <div class="flex flex-col">
                            <label for={`user-edit-booking-end-${booking._id}`} class="text-sm text-gray-600">End</label>
                            <input
                              id={`user-edit-booking-end-${booking._id}`}
                              type="time"
                              bind:value={editEndTime}
                              class="border rounded px-3 py-2"
                            />
                          </div>
                        </div>
                      </div>
                    {:else}
                      <div>
                        <h3 class="font-semibold">
                          {typeof booking.roomId === "string"
                            ? booking.roomId
                            : booking.roomId.name}
                        </h3>

                        <p class="text-sm text-gray-600">
                          Start: {new Date(booking.startTime).toLocaleString()}
                        </p>

                        <p class="text-sm text-gray-600">
                          End: {new Date(booking.endTime).toLocaleString()}
                        </p>
                      </div>
                    {/if}
                  </div>

                  <div class="flex flex-col gap-2 shrink-0">
                    {#if editingBookingId === booking._id}
                      <button
                        class="bg-green-600 text-white px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50"
                        on:click={() => updateBooking(booking._id)}
                        disabled={updatingBookingLoading}
                      >
                        {#if updatingBookingLoading}
                          Saving...
                        {:else}
                          Save
                        {/if}
                      </button>

                      <button
                        class="bg-gray-500 text-white px-3 py-2 rounded-lg cursor-pointer"
                        on:click={cancelEditBooking}
                        disabled={updatingBookingLoading}
                      >
                        Cancel Edit
                      </button>
                    {:else}
                      <button
                        class="bg-amber-500 text-white px-3 py-2 rounded-lg cursor-pointer"
                        on:click={() => startEditBooking(booking)}
                      >
                        Edit
                      </button>

                      <button
                        class="bg-red-500 text-white px-3 py-2 rounded-lg cursor-pointer"
                        on:click={() => cancelBooking(booking._id)}
                      >
                        Cancel
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
Frontend – README

This is the frontend for the cowork booking system, built with SvelteKit and TypeScript. It provides a user interface where users can log in, view rooms, create and manage bookings, and receive real-time notifications. Admin users have access to additional features such as managing rooms and users.

The application communicates with a Node.js backend through a REST API and uses Socket.IO to receive live updates without needing to refresh the page. Notifications are shown instantly when bookings or rooms are changed, and the interface updates automatically to reflect the latest data.

The frontend is deployed on Vercel and connects to the backend using an environment variable for the API base URL. To run locally, install dependencies and start the development server, making sure the correct backend URL is set in the environment configuration.

This project fulfills the course requirements including authentication, role-based access, CRUD operations, real-time notifications, caching with Redis, and logging/error handling.

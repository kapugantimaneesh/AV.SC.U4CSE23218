# Stage 1

The notification system is designed to help students receive updates related to placements, events, and results in real time. The backend provides REST APIs for fetching notifications, viewing unread notifications, marking notifications as read, and sending notifications to multiple students.

Some important APIs used in the system are:

- GET /api/notifications
- GET /api/notifications/unread
- PATCH /api/notifications/:id/read
- POST /api/notifications/broadcast

All APIs use JSON data and require an Authorization Bearer Token in the request headers for security.

For real-time notification delivery, Socket.IO WebSockets are used so that students can instantly receive updates without refreshing the page.

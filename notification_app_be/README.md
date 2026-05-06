# Campus Notifications Backend

This backend fetches notifications from the protected test server and implements the Stage 6 Priority Inbox. The full written design for Stages 1 to 6 is in `notification_system_design.md` at the repository root.

## What Is Covered

- Stage 1: REST API contract and real-time notification mechanism.
- Stage 2: PostgreSQL schema, storage choice, scaling issues, and queries.
- Stage 3: slow unread notification query analysis and indexing strategy.
- Stage 4: performance improvements for repeated notification fetching.
- Stage 5: reliable bulk notify-all design with queue, retries, and outbox pattern.
- Stage 6: working code for top 10 priority notifications.

## Local APIs

```http
GET http://localhost:3002/health
```

Checks whether the service is running.

```http
GET http://localhost:3002/notifications
```

Fetches notifications from the protected test server.

```http
GET http://localhost:3002/notifications/priority?limit=10
```

Returns the top priority unread notifications.

## External API Used

```http
GET http://20.207.122.201/evaluation-service/notifications
```

This route is protected. The backend first calls the auth API using `.env`, then sends the returned bearer token to fetch notifications.

## Priority Rule

Priority is calculated using:

- Notification type weight: `Placement > Result > Event`.
- Recency: newer notifications rank higher within the same type.

The implementation keeps only the top `n` notifications in a min-heap, so it can handle new notifications efficiently.

## Run

```bash
npm.cmd run notification
```

Then test with Postman:

```http
GET http://localhost:3002/notifications/priority?limit=10
```

For sample output without calling the test server:

```bash
npm.cmd run priority -- sample 10
```

For live CLI output:

```bash
npm.cmd run priority
```

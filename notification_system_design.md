# Stage 1

## Core Actions

The notification platform should support listing notifications, unread counts, marking one or all notifications as read, admin notification creation, bulk broadcast, and real-time delivery to logged-in students.

## Common Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

## REST API Contract

### List Notifications

```http
GET /api/v1/notifications?status=unread&type=Placement&page=1&limit=20
```

Response:

```json
{
  "page": 1,
  "limit": 20,
  "total": 125,
  "unreadCount": 7,
  "notifications": [
    {
      "id": "4b6e22ee-b4ed-45a4-a6af-5294b0d69f37",
      "type": "Placement",
      "title": "Campus Drive",
      "message": "New placement opportunity is available",
      "isRead": false,
      "createdAt": "2026-05-06T10:30:00Z"
    }
  ]
}
```

### Get Unread Count

```http
GET /api/v1/notifications/unread-count
```

Response:

```json
{
  "studentId": 1042,
  "unreadCount": 7
}
```

### Mark Notification As Read

```http
PATCH /api/v1/notifications/{notificationId}/read
```

Response:

```json
{
  "id": "4b6e22ee-b4ed-45a4-a6af-5294b0d69f37",
  "isRead": true,
  "readAt": "2026-05-06T10:35:00Z"
}
```

### Mark All As Read

```http
PATCH /api/v1/notifications/read-all
```

Request:

```json
{
  "type": "Placement"
}
```

Response:

```json
{
  "updatedCount": 12
}
```

### Create Notification

```http
POST /api/v1/admin/notifications
```

Request:

```json
{
  "type": "Placement",
  "title": "Campus Drive",
  "message": "A new company is hiring",
  "target": {
    "mode": "all_students"
  },
  "channels": ["in_app", "email"]
}
```

Response:

```json
{
  "notificationBatchId": "batch-20260506-001",
  "status": "queued",
  "targetCount": 50000
}
```

## Real-Time Mechanism

Use Server-Sent Events for real-time notification delivery:

```http
GET /api/v1/notifications/stream
```

SSE is suitable because notifications are mostly one-way server-to-client updates. If two-way communication is later needed, WebSockets can be added.

# Stage 2

## Database Choice

PostgreSQL is a good fit because the system needs reliable persistence, relationships between students and notifications, transactions, pagination, indexing, enum support, and efficient queries.

## Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE students (
  id BIGSERIAL PRIMARY KEY,
  roll_no VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id),
  notification_type notification_type NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE TABLE notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id),
  channel notification_channel NOT NULL,
  status delivery_status NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Indexes

```sql
CREATE INDEX idx_notifications_student_created
ON notifications (student_id, created_at DESC);

CREATE INDEX idx_notifications_unread_student_created
ON notifications (student_id, created_at DESC)
WHERE is_read = false;

CREATE INDEX idx_notifications_type_created_student
ON notifications (notification_type, created_at DESC, student_id);
```

## Queries

List notifications:

```sql
SELECT id, notification_type, title, message, is_read, created_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

Unread count:

```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = false;
```

Mark one notification as read:

```sql
UPDATE notifications
SET is_read = true, read_at = now()
WHERE id = $1 AND student_id = $2
RETURNING id, is_read, read_at;
```

As volume grows, problems include slow reads, large unread counts, expensive broadcasts, and bigger indexes. Solutions include pagination, partial indexes, Redis caching for unread counts, queues for broadcasts, and partitioning old notification data by date.

# Stage 3

The given query is not ideal:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

It is inaccurate because the column names should match the schema, such as `student_id`, `is_read`, and `created_at`. It is also slow because it uses `SELECT *`, has no `LIMIT`, and may require scanning and sorting many rows if there is no matching index.

Improved query:

```sql
SELECT id, notification_type, title, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```

Best index:

```sql
CREATE INDEX idx_notifications_unread_student_created
ON notifications (student_id, created_at DESC)
WHERE is_read = false;
```

With this index, cost is close to `O(log n + k)`, where `k` is the number of returned rows. Without it, the query can approach `O(n log n)` because of scanning and sorting.

Adding indexes on every column is not effective because indexes consume storage, slow down inserts and updates, and single-column indexes may not help real multi-condition query patterns.

Students who got a placement notification in the last 7 days:

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= now() - INTERVAL '7 days';
```

# Stage 4

Fetching notifications on every page load overloads the database. I would improve this with:

- Cursor pagination: fetch only the latest page first.
- Redis unread-count cache: avoid repeated count queries.
- SSE real-time push: send new notifications to logged-in users instead of repeated polling.
- Conditional fetching: fetch only notifications newer than the last seen timestamp.
- Read replicas: move read-heavy traffic away from the primary DB.

Tradeoffs:

- Pagination needs frontend cursor handling.
- Redis improves speed but needs cache invalidation.
- SSE reduces polling but requires connection management.
- Conditional fetching requires reliable client-side state.
- Read replicas can have slight replication lag.

# Stage 5

The proposed implementation is slow and unreliable because it sends email, saves DB records, and pushes in-app notifications sequentially for every student. A failure midway creates partial delivery, and retrying can cause duplicates.

If `send_email` failed for 200 students, retry only those failed delivery jobs with exponential backoff. If retries continue failing, move them to a dead-letter queue for inspection.

DB saving and email sending should not happen together as one blocking operation. The DB should store notification and delivery jobs in one transaction, then background workers should send email and push messages asynchronously.

Revised pseudocode:

```text
function notify_all(student_ids, message, type):
  batch_id = create_batch_id()

  begin_transaction()
  for student_id in student_ids:
    notification_id = create_notification(student_id, type, message, batch_id)
    create_delivery_job(notification_id, student_id, "email", "pending")
    create_delivery_job(notification_id, student_id, "in_app", "pending")
  commit_transaction()

  publish_batch_to_queue(batch_id)

  return {
    "batchId": batch_id,
    "status": "queued",
    "targetCount": len(student_ids)
  }

function worker_process_delivery_job(job):
  if job.status == "sent":
    return

  try:
    if job.channel == "email":
      send_email(job.student_id, job.message)

    if job.channel == "in_app":
      push_to_app(job.student_id, job.message)

    mark_job_sent(job.id)

  catch error:
    increment_attempt_count(job.id)

    if job.attempt_count < MAX_RETRIES:
      retry_later(job.id)
    else:
      move_to_dead_letter_queue(job.id, error)
```

# Stage 6

## Priority Inbox Approach

The Priority Inbox displays the top `n` most important unread notifications first. For the required implementation, `n` is set to 10 by default.

Priority is calculated using:

- Type weight: `Placement > Result > Event`.
- Recency: newer notifications rank higher within the same type.

Weights:

```text
Placement = 3
Result = 2
Event = 1
```

Priority score:

```text
priorityScore = typeWeight * 1,000,000,000,000 + timestampInMilliseconds
```

Code file:

```text
notification_app_be/priorityInbox.js
```

Run with sample data:

```bash
npm.cmd run priority -- sample 10
```

Run with live protected API:

```bash
npm.cmd run priority
```

Local backend endpoint:

```http
GET http://localhost:3002/notifications/priority?limit=10
```

To maintain top 10 efficiently as new notifications arrive, use a min-heap of size `n`. Each new unread notification is compared against the lowest-priority item in the heap. If it is better, replace the heap root.

Complexity:

```text
Time: O(total_notifications * log n)
Space: O(n)
```

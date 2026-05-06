# Backend Evaluation Projects

This repository contains two backend deliverables:

- Vehicle Maintenance Scheduler Microservice
- Campus Notifications Microservice

Both services use Node.js and Express. Protected evaluation-server APIs are accessed using credentials from `.env`.

## Folder Structure

```text
.
+-- vehicle_maintenance_scheduler/
|   +-- index.js
|   +-- scheduler.js
|   +-- server.js
|   +-- README.md
|   +-- outputs/
+-- notification_app_be/
|   +-- apiClient.js
|   +-- priorityInbox.js
|   +-- server.js
|   +-- README.md
|   +-- outputs/
+-- notification_system_design.md
+-- .env.example
+-- package.json
+-- README.md
```

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and fill in the registered values:

```env
EMAIL=registered_email
NAME=registered_name
MOBILE_NO=registered_mobile_number
GITHUB_USERNAME=github_username
ROLL_NO=registered_roll_number
ACCESS_CODE=access_code
CLIENT_ID=client_id_from_registration
CLIENT_SECRET=client_secret_from_registration
```

Do not commit `.env`.

## Project 1: Vehicle Maintenance Scheduler

The vehicle scheduler fetches depots and vehicle tasks from the protected test server, then chooses the best set of tasks for each depot.

Problem type:

```text
0/1 Knapsack
```

Mapping:

- `MechanicHours` = capacity
- `Duration` = cost
- `Impact` = value

Run:

```bash
npm.cmd run vehicle
```

Local APIs:

```http
GET http://localhost:3001/health
GET http://localhost:3001/schedule
POST http://localhost:3001/register
```

Main output API:

```http
GET http://localhost:3001/schedule
```

Expected output contains:

- Depot ID
- Available mechanic hours
- Used hours
- Remaining hours
- Maximum total impact
- Selected vehicle tasks

Code:

```text
vehicle_maintenance_scheduler/scheduler.js
vehicle_maintenance_scheduler/index.js
vehicle_maintenance_scheduler/server.js
```

Screenshots:

```text
vehicle_maintenance_scheduler/outputs/
```

Detailed project notes:

```text
vehicle_maintenance_scheduler/README.md
```

## Project 2: Campus Notifications Microservice

The notifications deliverable contains design answers for Stages 1 to 5 and working code for Stage 6 Priority Inbox.

Stage coverage:

- Stage 1: REST API design and real-time notification mechanism.
- Stage 2: PostgreSQL schema, DB choice, scaling issues, and queries.
- Stage 3: slow unread query analysis and indexing strategy.
- Stage 4: performance improvements and tradeoffs.
- Stage 5: reliable bulk notification design with retries and queue-based processing.
- Stage 6: working top-10 priority notification code.

Run:

```bash
npm.cmd run notification
```

Local APIs:

```http
GET http://localhost:3002/health
GET http://localhost:3002/notifications
GET http://localhost:3002/notifications/priority?limit=10
```

Main output API:

```http
GET http://localhost:3002/notifications/priority?limit=10
```

Priority rule:

```text
Placement > Result > Event
```

Within the same type, newer notifications are ranked higher.

Run sample output without calling the protected API:

```bash
npm.cmd run priority -- sample 10
```

Code:

```text
notification_app_be/apiClient.js
notification_app_be/priorityInbox.js
notification_app_be/server.js
```

Design document:

```text
notification_system_design.md
```

Screenshots:

```text
notification_app_be/outputs/
```

Detailed project notes:

```text
notification_app_be/README.md
```

## External Evaluation APIs Used

Registration:

```http
POST http://20.207.122.201/evaluation-service/register
```

Authentication:

```http
POST http://20.207.122.201/evaluation-service/auth
```

Vehicle Scheduler:

```http
GET http://20.207.122.201/evaluation-service/depots
GET http://20.207.122.201/evaluation-service/vehicles
```

Notifications:

```http
GET http://20.207.122.201/evaluation-service/notifications
```

All protected routes require a bearer token generated from the auth API.

## Submission Notes

For backend screenshots, use Postman or Insomnia against the local backend APIs:

```http
GET http://localhost:3001/schedule
GET http://localhost:3002/notifications/priority?limit=10
```

Screenshots should show:

- Request URL
- Response body
- Response time

The `.env` file contains secrets and should not be pushed.

# Vehicle Maintenance Scheduler

This backend service fetches depot mechanic-hour limits and vehicle maintenance tasks from the protected test APIs, then chooses the highest-impact set of tasks that fit each depot's available mechanic hours.

## What The Project Asks

The assignment asks us to build a backend microservice for daily vehicle maintenance planning.

Each vehicle task has:

- `Duration`: how many mechanic-hours the task needs.
- `Impact`: how important it is to complete that task.

Each depot has:

- `MechanicHours`: the maximum number of mechanic-hours available for the day.

The service must select a subset of vehicle tasks where:

- Total selected duration does not exceed the depot's `MechanicHours`.
- Total selected impact is as high as possible.
- Depot and vehicle data must be fetched from the provided APIs.
- The tasks should not be hard-coded or stored in a database.

## Expected Output

The expected output is a schedule for each depot showing:

- Depot ID.
- Available mechanic hours.
- Used mechanic hours.
- Remaining mechanic hours.
- Maximum total impact achieved.
- Number of selected tasks.
- Selected vehicle maintenance task IDs with their duration and impact.

Example response shape:

```json
{
  "depotCount": 5,
  "vehicleCount": 30,
  "schedules": [
    {
      "depotId": 1,
      "mechanicHours": 60,
      "usedHours": 58,
      "remainingHours": 2,
      "totalImpact": 95,
      "selectedCount": 12,
      "selectedTasks": [
        {
          "taskId": "example-task-id",
          "duration": 5,
          "impact": 9
        }
      ]
    }
  ]
}
```

For submission, capture screenshots from Postman or Insomnia showing:

- Request URL: `GET http://localhost:3001/schedule`
- Response body.
- Response time.

The screenshot should be from this local backend app, not directly from the test server.

## External Test Server APIs Used

These APIs are provided by the evaluation server. The local backend calls them internally.

### Register

```http
POST http://20.207.122.201/evaluation-service/register
```

Use:

Registers the candidate once and returns `clientID` and `clientSecret`.

When to call:

Call this only one time. If registration is already done, the server returns a conflict such as `roll no already exists`.

Required fields:

```json
{
  "email": "college_email",
  "name": "full_name",
  "mobileNo": "mobile_number",
  "githubUsername": "github_username",
  "rollNo": "roll_number",
  "accessCode": "access_code"
}
```

### Auth

```http
POST http://20.207.122.201/evaluation-service/auth
```

Use:

Generates the authorization token required for protected APIs.

When to call:

The local backend calls this before fetching depots and vehicles.

Required fields:

```json
{
  "email": "registered_email",
  "name": "registered_name",
  "rollNo": "registered_roll_number",
  "accessCode": "registered_access_code",
  "clientID": "client_id_from_registration",
  "clientSecret": "client_secret_from_registration"
}
```

### Depots

```http
GET http://20.207.122.201/evaluation-service/depots
```

Use:

Fetches the list of depots and their daily mechanic-hour limits.

Authorization:

Requires a bearer token from the Auth API.

Response data used:

```json
{
  "depots": [
    {
      "ID": 1,
      "MechanicHours": 60
    }
  ]
}
```

### Vehicles

```http
GET http://20.207.122.201/evaluation-service/vehicles
```

Use:

Fetches the vehicle maintenance tasks that need to be scheduled.

Authorization:

Requires a bearer token from the Auth API.

Response data used:

```json
{
  "vehicles": [
    {
      "TaskID": "vehicle-task-id",
      "Duration": 5,
      "Impact": 9
    }
  ]
}
```

## Local Backend APIs

These are the APIs exposed by this project.

### Health Check

```http
GET http://localhost:3001/health
```

Use:

Checks whether the local backend server is running.

### Local Register Wrapper

```http
POST http://localhost:3001/register
```

Use:

Calls the external registration API using values from `.env`.

Note:

This is optional after registration is complete.

### Generate Schedule

```http
GET http://localhost:3001/schedule
```

Use:

This is the main API for the assignment.

It performs the complete flow:

1. Authenticates with the test server.
2. Fetches depots.
3. Fetches vehicles.
4. Runs the optimization algorithm.
5. Returns the best maintenance schedule for every depot.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in registration details.
3. Run registration once:

```bash
npm.cmd run vehicle:cli -- register
```

4. Save `clientID` and `clientSecret` from the response into `.env`.
5. Run the scheduler:

```bash
npm.cmd run vehicle
```

Then call:

```http
GET http://localhost:3001/schedule
```

For offline verification:

```bash
npm.cmd run vehicle:cli -- sample
```

## Algorithm

The task is a 0/1 knapsack problem.

- `Duration` is the task cost.
- `Impact` is the task value.
- `MechanicHours` is the capacity.

The implementation uses dynamic programming with `O(number_of_tasks * mechanic_hours)` time.

This is suitable here because the number of depots is small and mechanic-hour capacity is an integer value.

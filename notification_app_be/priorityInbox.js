const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const { authenticate, fetchNotifications } = require("./apiClient");

const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

class MinHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(value) {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(value) {
    this.items[0] = value;
    this.bubbleDown(0);
  }

  toArray() {
    return [...this.items];
  }

  bubbleUp(index) {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);

      if (this.compare(this.items[current], this.items[parent]) >= 0) {
        break;
      }

      [this.items[current], this.items[parent]] = [this.items[parent], this.items[current]];
      current = parent;
    }
  }

  bubbleDown(index) {
    let current = index;

    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let smallest = current;

      if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }

      if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === current) {
        break;
      }

      [this.items[current], this.items[smallest]] = [this.items[smallest], this.items[current]];
      current = smallest;
    }
  }
}

function timestampValue(notification) {
  const timestamp = notification.Timestamp || notification.timestamp || notification.createdAt;
  const parsed = Date.parse(timestamp);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeNotification(notification) {
  const type = notification.Type || notification.type || "Event";
  const message = notification.Message || notification.message || "";
  const id = notification.ID || notification.id;
  const timestamp = notification.Timestamp || notification.timestamp || notification.createdAt;
  const typeWeight = TYPE_WEIGHTS[type] || 0;
  const createdAtMs = timestampValue(notification);

  return {
    id,
    type,
    message,
    timestamp,
    typeWeight,
    priorityScore: typeWeight * 1_000_000_000_000 + createdAtMs,
  };
}

function comparePriorityAscending(a, b) {
  if (a.priorityScore !== b.priorityScore) {
    return a.priorityScore - b.priorityScore;
  }

  return String(a.id).localeCompare(String(b.id));
}

function comparePriorityDescending(a, b) {
  return comparePriorityAscending(b, a);
}

function isUnread(notification) {
  return notification.isRead !== true && notification.IsRead !== true && notification.readAt == null;
}

function topPriorityNotifications(notifications, limit = 10) {
  const maxItems = Math.max(1, Number(limit) || 10);
  const heap = new MinHeap(comparePriorityAscending);

  for (const rawNotification of notifications) {
    if (!isUnread(rawNotification)) {
      continue;
    }

    const notification = normalizeNotification(rawNotification);

    if (!notification.id) {
      continue;
    }

    if (heap.size() < maxItems) {
      heap.push(notification);
      continue;
    }

    if (comparePriorityAscending(notification, heap.peek()) > 0) {
      heap.replaceRoot(notification);
    }
  }

  return heap.toArray().sort(comparePriorityDescending);
}

function sampleNotifications() {
  return [
    {
      ID: "result-old",
      Type: "Result",
      Message: "mid-sem",
      Timestamp: "2026-04-22 17:51:30",
    },
    {
      ID: "placement-new",
      Type: "Placement",
      Message: "campus hiring update",
      Timestamp: "2026-04-22 18:01:30",
    },
    {
      ID: "event-new",
      Type: "Event",
      Message: "tech fest",
      Timestamp: "2026-04-22 18:05:30",
    },
    {
      ID: "placement-old",
      Type: "Placement",
      Message: "company drive",
      Timestamp: "2026-04-22 17:49:30",
    },
    {
      ID: "result-new",
      Type: "Result",
      Message: "external marks",
      Timestamp: "2026-04-22 18:04:30",
    },
  ];
}

async function main() {
  const command = process.argv[2] || "live";
  const limit = Number(process.argv[3] || 10);

  if (command === "sample") {
    console.log(JSON.stringify({ priorityNotifications: topPriorityNotifications(sampleNotifications(), limit) }, null, 2));
    return;
  }

  if (command !== "live") {
    throw new Error("Usage: node notification_app_be/priorityInbox.js [live|sample] [limit]");
  }

  const token = await authenticate();
  const notifications = await fetchNotifications(token);
  const priorityNotifications = topPriorityNotifications(notifications, limit);

  console.log(JSON.stringify({ count: priorityNotifications.length, priorityNotifications }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    const responseBody = error.response ? JSON.stringify(error.response.data) : "";
    console.error(`Priority inbox failed: ${error.message}`);

    if (responseBody) {
      console.error(responseBody);
    }

    process.exitCode = 1;
  });
}

module.exports = {
  topPriorityNotifications,
};

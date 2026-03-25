# MongoDB and application logging

You usually see **`NETWORK`** lines in **`docker logs doc-hub-mongo`** because the default server log level emphasizes connections (including short-lived **mongosh** sessions). That is normal.

To get **clearer, more useful** visibility you can use **three layers** (pick what fits):

---

## 1. MongoDB server: more than network noise

MongoDB logs **per component**. At runtime (as admin in `mongosh`):

```javascript
// Dev only — increases log volume
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: {
    command: { verbosity: 1 },
    write: { verbosity: 1 },
    accessControl: { verbosity: 0 },
  },
})
```

Or set **`systemLog.component.*.verbosity`** in a **`mongod.conf`** and start `mongod` with `-f /path/mongod.conf` (see [MongoDB: Log Messages](https://www.mongodb.com/docs/manual/reference/log-messages/)).

**Trade-off:** `command` / `write` verbosity produces **many** lines under load. Use on **dev/staging**, not busy production, unless you filter externally.

**Slow operations** (often more valuable than full command spam):

```javascript
db.setProfilingLevel(1, { slowms: 100 })  // log ops > 100ms to system.profile
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

Reset when done: `db.setProfilingLevel(0)`.

---

## Interactive tuner (dev stack)

From the repo root:

```bash
./build/sh_scripts/configure_dev_logs.sh
```

- Pick a **level** (1=DEBUG … 4=ERROR).
- Pick **targets**: API (Uvicorn + `APP_LOG_LEVEL`), PyMongo (`MONGO_LOG_COMMANDS`), MongoDB server verbosity (`docker logs doc-hub-mongo`), profiler (`system.profile`).
- Writes keys into **`cfgs/.env`** and **recreates `doc-hub-api`** when API-related targets are chosen.

Non-interactive examples:

```bash
./build/sh_scripts/configure_dev_logs.sh --level 2 --targets all
./build/sh_scripts/configure_dev_logs.sh --level 1 --targets 1,2 --restart-api
./build/sh_scripts/configure_dev_logs.sh --reset
```

`dev_run.sh` can prompt for this right after the stack is up; answering **yes** runs the same preset as `--level 2 --targets all` (non-interactive). For level/target menus, run `configure_dev_logs.sh` with no flags. If you skip the prompt, run the script anytime against **running** containers.

---

## 2. API process: PyMongo command listener (this repo)

The FastAPI app uses **PyMongo**. PyMongo can emit **events for every command** without changing each call site.

This project registers a listener when **`MONGO_LOG_COMMANDS=1`** (or `true` / `yes`) is set in the **API** container environment:

- **Logger name:** `pymongo.commands`
- **INFO:** `command` name + database (noise like `hello` / `ping` is filtered)
- **DEBUG:** success + **duration_ms**
- **WARNING:** failed commands

Implementation: [db/mongo_monitoring.py](/db/mongo_monitoring.py), wired from [db/db.py](/db/db.py).

**Example (Compose):** add under `doc-hub-api` → `environment`:

```yaml
MONGO_LOG_COMMANDS: "1"
```

Then watch API logs, not MongoDB’s:

```bash
docker logs -f doc-hub-api 2>&1 | grep -E 'pymongo|mongo command'
```

Unset or set to `0` in production if you do not want the extra volume.

---

## 3. Application-level business logs

Mutations and audit are already expressed in Python (e.g. `logger.info` in routes, `audit insert failed` in [audit_service.py](/src/audit/audit_service.py)). For **domain** events (“who did what”), prefer **structured app logs** and the **audit collection** over turning MongoDB global verbosity to 2 everywhere.

---

## Summary

| Goal | Where to look |
|------|----------------|
| See **TCP / mongosh** churn | Mongo `NETWORK` logs (keep as-is) |
| See **actual commands** on the server | Mongo `logComponentVerbosity` or profiling |
| See **what the API asked Mongo to do** | **`MONGO_LOG_COMMANDS=1`** → API log `pymongo.commands` |
| See **business / compliance** trail | **`audit_events`** + app loggers |

There is no need for a custom “connector hook” beyond PyMongo’s **`monitoring`** API unless you want to push events to an external system (OpenTelemetry, etc.).

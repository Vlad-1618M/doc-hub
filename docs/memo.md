# Memo / follow-ups

## Bulk remove & realtime (deferred)

- **Idea:** Add a **batch delete** API (or make `live_data_control.py` `remove --all` use parallel deletes with a sane cap) so large cleanups finish faster than one HTTP DELETE per document.
- **Context:** Serial deletes each trigger a WebSocket refresh; the dashboard already **debounces** WS refetches (500 ms) to avoid refetch storms, but **total wall time** is still dominated by the script’s loop.
- **When:** Pick up when returning to timing / manual live-data workflow work.

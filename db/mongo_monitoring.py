"""
Optional PyMongo command tracing into the API logger (not MongoDB server logs).

Set MONGO_LOG_COMMANDS=1 in the API environment to log each command name, database,
and duration. Register runs once per process before clients are created.
"""

from __future__ import annotations

import logging
import os
from typing import ClassVar

_registered = False

def register_command_listener_once() -> None:
    global _registered
    if _registered:
        return
    if os.getenv("MONGO_LOG_COMMANDS", "").lower() not in ("1", "true", "yes"):
        return

    from pymongo import monitoring

    from logger import logger_main

    log = logger_main.get_logger("pymongo.commands")
    log.setLevel(logging.DEBUG)

    class _CommandLogger(monitoring.CommandListener):
        _noise: ClassVar[frozenset[str]] = frozenset(
            {
                "hello",
                "ismaster",
                "ping",
                "buildInfo",
                "saslStart",
                "saslContinue",
                "endSessions",
                "getMore",
            }
        )

        def started(self, event: monitoring.CommandStartedEvent) -> None:
            if event.command_name in self._noise:
                return
            log.info("mongo command=%s db=%s", event.command_name, event.database_name)

        def succeeded(self, event: monitoring.CommandSucceededEvent) -> None:
            if event.command_name in self._noise:
                return
            ms = event.duration_micros / 1000.0
            log.debug("mongo command=%s ok duration_ms=%.2f", event.command_name, ms)

        def failed(self, event: monitoring.CommandFailedEvent) -> None:
            log.warning("mongo command=%s failed: %s", event.command_name, event.failure)

    monitoring.register(_CommandLogger())
    _registered = True
    log.info("MONGO_LOG_COMMANDS enabled: PyMongo command listener registered")

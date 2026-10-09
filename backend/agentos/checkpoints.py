"""Official PostgreSQL saver with an async thread bridge.

Windows needs Proactor for stdio subprocesses, while psycopg async connections
require Selector. The sync saver in worker threads supports both OS families.
"""

import asyncio

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import settings


class DurableSaver(BaseCheckpointSaver):
    def __init__(self):
        super().__init__()
        self.pool = ConnectionPool(
            make_conninfo(settings().psycopg_url, options="-c search_path=checkpoints"),
            min_size=1,
            max_size=2,
            open=True,
            kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        )
        self.saver = PostgresSaver(self.pool)
        self.saver.setup()

    async def aget_tuple(self, config):
        return await asyncio.to_thread(self.saver.get_tuple, config)

    async def alist(self, config, *, filter=None, before=None, limit=None):
        rows = await asyncio.to_thread(
            lambda: list(self.saver.list(config, filter=filter, before=before, limit=limit))
        )
        for row in rows:
            yield row

    async def aput(self, config, checkpoint, metadata, new_versions):
        return await asyncio.to_thread(self.saver.put, config, checkpoint, metadata, new_versions)

    async def aput_writes(self, config, writes, task_id, task_path=""):
        return await asyncio.to_thread(self.saver.put_writes, config, writes, task_id, task_path)

    async def adelete_thread(self, thread_id):
        return await asyncio.to_thread(self.saver.delete_thread, thread_id)

    def get_next_version(self, current, channel):
        return self.saver.get_next_version(current, channel)

    def close(self):
        self.pool.close()

from alembic import context
from agentos.db import engine
from agentos.models import Base


def run():
    with engine().connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()


run()

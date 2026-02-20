import pytest
import generate_link


@pytest.fixture(autouse=True)
def reset_store():
    generate_link._store.clear()
    yield
    generate_link._store.clear()

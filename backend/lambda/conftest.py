import pytest
import generate_link


@pytest.fixture(autouse=True)
def reset_table():
    generate_link._table = None
    yield
    generate_link._table = None

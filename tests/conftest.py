"""
Pytest configuration and fixtures for Athena Agent tests
"""
import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app


# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client():
    """Create an async test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_nodes():
    """Sample Multipass VM node configurations for testing."""
    return [
        {"name": "primary", "hostname": "192.168.2.6", "username": "ubuntu"},
        {"name": "agent-vm", "hostname": "192.168.2.5", "username": "ubuntu"}
    ]


@pytest.fixture
def sample_commands():
    """Sample commands for testing."""
    return ["uptime", "df -h", "free -m", "cat /etc/hostname"]

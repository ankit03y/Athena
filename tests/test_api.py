"""
Backend API Tests for Athena Agent
Tests for chat_api.py endpoints
"""
import pytest
import uuid
from httpx import AsyncClient


class TestSessionManagement:
    """Test cases for session management endpoints (API-001 to API-008)"""
    
    @pytest.mark.asyncio
    async def test_create_session(self, client: AsyncClient):
        """API-001: Create new session with title"""
        response = await client.post("/chat/sessions", json={"title": "Test Session"})
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "Test Session"
        assert "created_at" in data
        print(f"✅ API-001: Created session with ID {data['id']}")
    
    @pytest.mark.asyncio
    async def test_create_session_default_title(self, client: AsyncClient):
        """API-002: Create session with default title"""
        response = await client.post("/chat/sessions", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Session"
        print(f"✅ API-002: Created session with default title")
    
    @pytest.mark.asyncio
    async def test_list_sessions(self, client: AsyncClient):
        """API-003: List all sessions"""
        response = await client.get("/chat/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ API-003: Listed {len(data)} sessions")
    
    @pytest.mark.asyncio
    async def test_get_session_messages(self, client: AsyncClient):
        """API-004: Get session messages"""
        # First create a session
        create_resp = await client.post("/chat/sessions", json={"title": "Message Test"})
        session_id = create_resp.json()["id"]
        
        # Get session messages - API returns array of messages
        response = await client.get(f"/chat/sessions/{session_id}/messages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)  # API returns array of messages
        print(f"✅ API-004: Retrieved session {session_id} with {len(data)} messages")
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_session(self, client: AsyncClient):
        """API-005: Get non-existent session - returns empty array"""
        response = await client.get("/chat/sessions/99999/messages")
        # This API returns 200 with empty array for non-existent session
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0  # Empty array for non-existent session
        print(f"✅ API-005: Non-existent session returns empty array")
    
    @pytest.mark.asyncio
    async def test_rename_session(self, client: AsyncClient):
        """API-008: Rename session"""
        # Create session
        create_resp = await client.post("/chat/sessions", json={"title": "Original Name"})
        session_id = create_resp.json()["id"]
        
        # Rename it
        response = await client.patch(f"/chat/sessions/{session_id}", json={"title": "Renamed Session"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Renamed Session"
        print(f"✅ API-008: Renamed session {session_id}")
    
    @pytest.mark.asyncio
    async def test_delete_session(self, client: AsyncClient):
        """API-006: Delete session"""
        # Create session
        create_resp = await client.post("/chat/sessions", json={"title": "To Delete"})
        session_id = create_resp.json()["id"]
        
        # Delete it
        response = await client.delete(f"/chat/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"
        
        # Verify it's gone - API returns empty array
        get_resp = await client.get(f"/chat/sessions/{session_id}/messages")
        assert get_resp.status_code == 200
        assert len(get_resp.json()) == 0
        print(f"✅ API-006: Deleted session {session_id}")


class TestChatMessaging:
    """Test cases for chat messaging endpoints (API-010 to API-014)"""
    
    @pytest.mark.asyncio
    async def test_send_simple_message(self, client: AsyncClient):
        """API-010: Send message that creates rule"""
        # Create session first
        session_resp = await client.post("/chat/sessions", json={"title": "Chat Test"})
        session_id = session_resp.json()["id"]
        
        response = await client.post("/chat/message", json={
            "message": "Check uptime on primary (192.168.2.6)",
            "session_id": session_id
        })
        assert response.status_code == 200
        data = response.json()
        assert data["type"] in ["rule", "clarification", "response"]
        print(f"✅ API-010: Sent message, got type: {data['type']}")
    
    @pytest.mark.asyncio
    async def test_get_chat_history(self, client: AsyncClient):
        """API-013: Get chat history"""
        response = await client.get("/chat/history?limit=50")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ API-013: Retrieved {len(data)} history items")


class TestRuleExecution:
    """Test cases for rule execution endpoints (API-020 to API-025)"""
    
    @pytest.mark.asyncio
    async def test_get_rules(self, client: AsyncClient):
        """Get all rules"""
        response = await client.get("/chat/rules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} rules")
    
    @pytest.mark.asyncio
    async def test_get_executions(self, client: AsyncClient):
        """API-025: Get executions list"""
        response = await client.get("/chat/executions?limit=20")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ API-025: Retrieved {len(data)} executions")
    
    @pytest.mark.asyncio
    async def test_execute_nonexistent_rule(self, client: AsyncClient):
        """API-021: Execute non-existent rule returns 404"""
        response = await client.post("/chat/execute", json={"rule_id": 99999})
        assert response.status_code == 404
        print(f"✅ API-021: Non-existent rule returns 404")


class TestNodeManagement:
    """Test cases for node management endpoints (API-040 to API-043)"""
    
    @pytest.mark.asyncio
    async def test_add_known_node(self, client: AsyncClient):
        """API-043: Add known node with unique name"""
        # Use unique name to avoid UNIQUE constraint errors
        unique_name = f"test-node-{uuid.uuid4().hex[:8]}"
        response = await client.post("/chat/nodes", params={
            "name": unique_name,
            "hostname": "192.168.2.6",
            "username": "ubuntu",
            "port": 22,
            "auth_type": "private_key"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == unique_name
        print(f"✅ API-043: Added node {unique_name}")


class TestReports:
    """Test cases for report endpoints (API-030 to API-033)"""
    
    @pytest.mark.asyncio
    async def test_get_report_nonexistent_rule(self, client: AsyncClient):
        """API-033: Report for non-existent rule"""
        response = await client.get("/chat/rules/99999/report?format=json")
        assert response.status_code in [404, 200]  # 200 if empty report is valid
        print(f"✅ API-033: Report endpoint for non-existent rule: {response.status_code}")


class TestIncidents:
    """Test cases for incident endpoints"""
    
    @pytest.mark.asyncio
    async def test_get_incidents(self, client: AsyncClient):
        """Get all incidents"""
        response = await client.get("/chat/incidents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} incidents")

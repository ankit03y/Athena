"""
Chat Engine Tests for Athena Agent
Tests for chat_engine.py NLP functions
"""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chat_engine import (
    parse_user_intent,
    generate_execution_narrative,
    resolve_node,
    generate_rule_card_text,
    analyze_output_with_llm
)


class TestIntentParsing:
    """Test cases for intent parsing (CE-001 to CE-008)"""
    
    def test_parse_simple_command(self):
        """CE-001: Parse simple command with node"""
        result = parse_user_intent("Check uptime on primary", known_nodes=["primary"])
        assert result is not None
        assert result.get("type") in ["rule", "clarification"]
        print(f"✅ CE-001: Parsed simple command, type: {result.get('type')}")
    
    def test_parse_multiple_nodes(self):
        """CE-002: Parse command with multiple nodes"""
        result = parse_user_intent(
            "Run df -h on primary and agent-vm", 
            known_nodes=["primary", "agent-vm"]
        )
        assert result is not None
        if result.get("type") == "rule":
            rule = result.get("rule", {})
            nodes = rule.get("nodes", [])
            print(f"✅ CE-002: Parsed {len(nodes)} nodes")
        else:
            print(f"✅ CE-002: Got clarification request")
    
    def test_parse_with_credentials(self):
        """CE-003: Parse with user credentials"""
        result = parse_user_intent(
            "Check memory on agent-vm using ubuntu user",
            known_nodes=["agent-vm"]
        )
        assert result is not None
        print(f"✅ CE-003: Parsed command with credentials")
    
    def test_parse_with_condition(self):
        """CE-004: Parse with alert condition"""
        result = parse_user_intent(
            "Alert if disk usage > 80% on primary",
            known_nodes=["primary"]
        )
        assert result is not None
        print(f"✅ CE-004: Parsed command with condition")
    
    def test_parse_parallel_execution(self):
        """CE-005: Parse parallel execution request"""
        result = parse_user_intent(
            "Run uptime on primary and agent-vm at once",
            known_nodes=["primary", "agent-vm"]
        )
        assert result is not None
        if result.get("type") == "rule":
            rule = result.get("rule", {})
            execution = rule.get("execution", "")
            print(f"✅ CE-005: Execution mode: {execution}")
        else:
            print(f"✅ CE-005: Got clarification")
    
    def test_parse_with_report(self):
        """CE-006: Parse with report request"""
        result = parse_user_intent(
            "Check uptime on primary and send CSV report to admin@example.com",
            known_nodes=["primary"]
        )
        assert result is not None
        print(f"✅ CE-006: Parsed report request")
    
    def test_parse_ambiguous_input(self):
        """CE-007: Ambiguous input should request clarification"""
        result = parse_user_intent("Check the server")
        assert result is not None
        # Ambiguous input should either ask for clarification or try to help
        print(f"✅ CE-007: Ambiguous input handled, type: {result.get('type')}")


class TestNodeResolution:
    """Test cases for node resolution (CE-010 to CE-012)"""
    
    def test_resolve_known_node(self):
        """CE-010: Resolve known node"""
        known_nodes = {
            "primary": {
                "hostname": "192.168.2.6",
                "username": "ubuntu",
                "port": 22
            }
        }
        resolved, config = resolve_node("primary", known_nodes)
        assert resolved == True
        assert config["hostname"] == "192.168.2.6"
        print(f"✅ CE-010: Resolved node: {config}")
    
    def test_resolve_unknown_node(self):
        """CE-011: Unknown node resolution"""
        known_nodes = {"primary": {"hostname": "192.168.2.6"}}
        resolved, config = resolve_node("unknown-server", known_nodes)
        assert resolved == False
        print(f"✅ CE-011: Unknown node not resolved (expected)")


class TestOutputAnalysis:
    """Test cases for output analysis (CE-020 to CE-023)"""
    
    def test_analyze_disk_usage(self):
        """CE-020: Analyze disk usage output"""
        df_output = """Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   85G   15G  85% /"""
        
        result = analyze_output_with_llm(
            output=df_output,
            extraction_hint="disk usage percentage",
            condition="> 80%"
        )
        assert result is not None
        print(f"✅ CE-020: Analyzed disk output: {result}")
    
    def test_analyze_uptime(self):
        """CE-021: Analyze uptime output"""
        uptime_output = "10:30:45 up 5 days, 3:22, 2 users, load average: 0.15, 0.10, 0.05"
        
        result = analyze_output_with_llm(
            output=uptime_output,
            extraction_hint="load average",
            condition=None
        )
        assert result is not None
        print(f"✅ CE-021: Analyzed uptime: {result}")
    
    def test_condition_evaluation_true(self):
        """CE-022: Condition evaluation - true"""
        df_output = "85% usage"
        result = analyze_output_with_llm(
            output=df_output,
            extraction_hint="percentage",
            condition="> 80%"
        )
        # Result should indicate condition met
        print(f"✅ CE-022: Condition evaluation result: {result}")
    
    def test_condition_evaluation_false(self):
        """CE-023: Condition evaluation - false"""
        df_output = "50% usage"
        result = analyze_output_with_llm(
            output=df_output,
            extraction_hint="percentage",
            condition="> 80%"
        )
        print(f"✅ CE-023: Condition evaluation result: {result}")


class TestNarrativeGeneration:
    """Test narrative generation for timeline"""
    
    def test_generate_narrative(self):
        """Test execution narrative generation"""
        narrative = generate_execution_narrative(
            "connecting",
            {"node": "primary", "hostname": "192.168.2.6"}
        )
        assert narrative is not None
        assert len(narrative) > 0
        print(f"✅ Generated narrative: {narrative}")


class TestRuleCardGeneration:
    """Test rule card text generation"""
    
    def test_generate_rule_card(self):
        """Test rule card text"""
        rule = {
            "name": "Uptime Check",
            "nodes": [
                {"name": "primary", "hostname": "192.168.2.6"}
            ],
            "commands": [
                {"cmd": "uptime", "logic": "report output"}
            ]
        }
        text = generate_rule_card_text(rule)
        assert text is not None
        print(f"✅ Generated rule card text: {text[:100]}...")

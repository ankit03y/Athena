import requests
import json
import time
import sseclient

BASE_URL = "http://localhost:8000/chat"

def verify_flow():
    # 1. New Session
    print("1. Creating Session...")
    res = requests.post(f"{BASE_URL}/sessions", json={"title": "Verification Session"})
    print(f"   Status: {res.status_code}")
    print(f"   Body: {res.text}")
    
    if res.status_code != 200:
        print("   FAILED: Session creation failed.")
        return

    data = res.json()
    session_id = data.get("id")
    if not session_id:
        print("   FAILED: No ID in response")
        return
        
    print(f"   Session ID: {session_id}")

    # 2. Send Message (Multi-Node)
    print("\n2. Sending Message...")
    msg = "Run 'hostname' on Primary and 192.168.1.5 with user 'admin' password 'secret'"
    res = requests.post(f"{BASE_URL}/message", json={"message": msg, "session_id": session_id})
    data = res.json()
    
    if data["type"] != "rule":
        print("   FAILED: Expected 'rule' type response.")
        print(data)
        return

    rule_id = data["rule_id"]
    rule = data["rule"]
    print(f"   Rule ID: {rule_id}")
    print(f"   Nodes: {len(rule['nodes'])}")
    print(f"   Commands: {len(rule['commands'])}")
    
    # 3. Execute
    print("\n3. Triggering Execution...")
    res = requests.post(f"{BASE_URL}/execute/{rule_id}")
    execution_id = res.json()["execution_id"]
    print(f"   Execution ID: {execution_id}")

    # 4. Stream Events
    print("\n4. Streaming Events...")
    url = f"{BASE_URL}/execute/{execution_id}/stream"
    headers = {'Accept': 'text/event-stream'}
    
    response = requests.get(url, stream=True, headers=headers)
    
    for event in response.iter_lines():
        if event:
            decoded = event.decode('utf-8')
            if decoded.startswith("data: "):
                payload = json.loads(decoded[6:])
                print(f"   [EVENT] {payload.get('type')} - {payload.get('message')} (Node: {payload.get('node', 'N/A')})")
                
                if payload.get("type") in ["complete", "error"]:
                    print("   Stream finished.")
                    break

if __name__ == "__main__":
    verify_flow()

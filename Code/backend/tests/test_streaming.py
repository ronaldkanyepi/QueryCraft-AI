import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_chat_streaming():
    test_input = {"messages": ["What is the capital of France?"], "thread_id": str(uuid.uuid4())}

    with client.stream("POST", "/api/v1/chat", json=test_input) as response:
        assert response.status_code == 200
        events_received = []

        for line in response.iter_lines():
            if line and line.startswith("data: "):
                event_data = line[6:]
                print(event_data)
                events_received.append(event_data)

    assert len(events_received) > 0
    assert '"status": "running"' in events_received[0]
    assert '"status": "completed"' in events_received[-1]

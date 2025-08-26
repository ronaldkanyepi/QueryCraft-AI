import uuid

from langchain_core.messages import AIMessage, HumanMessage
from rich.console import Console

from app.agent.graph import builder

console = Console()


if __name__ == "__main__":
    graph = builder()
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    print("AI Assistant is ready. Type 'quit' to exit.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == "quit":
            break

        events = graph.stream(
            {"messages": [HumanMessage(content=user_input)]}, config=config, version="v1"
        )
        for event in events:
            for value in event.values():
                if isinstance(value, dict) and "messages" in value:
                    last_message = value["messages"][-1]
                    if isinstance(last_message, AIMessage):
                        print(f"AI: {last_message.content}")

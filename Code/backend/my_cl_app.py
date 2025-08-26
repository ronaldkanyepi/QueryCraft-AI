import chainlit as cl
from langchain_core.messages import AIMessage, HumanMessage
from loguru import logger

from app.agent.graph import builder


@cl.set_starters
async def set_starters():
    return [
        cl.Starter(
            label="Top-performing films?",
            message="Which films are rented most often? Show me the top 10 and their rental counts.",
            icon="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/trophy.svg",
        ),
        cl.Starter(
            label="Compare Stores Revenue?",
            message="Can you compare the total monthly revenue for Store 1 and Store 2?",
            icon="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/chart-bar.svg",
        ),
        cl.Starter(
            label="Loyal Customers",
            message="Identify our top 5 most valuable customers based on their total spending. I'd like to see their names and lifetime value.",
            icon="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/award.svg",
        ),
        cl.Starter(
            label="Month-on-month revenue Store 1?",
            message="What is the month on month revenue percentage change for Store 1 any numbers should be rounded to 2 decimal places preserve the order of months and calculations in their natural order.",
            icon="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/alert-triangle.svg",
        ),
    ]


async def display_node_activity(node_name: str, decision: str = None):
    """Display what the agent is thinking/doing"""
    node_messages = {
        "triage": "🤔 **Analyzing your question...**\nDetermining how best to help you with your data query.",
        "clarification": "❓ **Need more details...**\nAsking for clarification to better understand your request.",
        "main_logic": "🔍 **Processing your data question...**\nWorking on your SQL query and analysis.",
        "follow_up": "💬 **Providing guidance...**\nOffering help with data analysis questions.",
        "handle_modification": "🛡️ **Data protection mode...**\nExplaining read-only data access policy.",
    }

    message = node_messages.get(node_name, f"⚙️ **Processing: {node_name}**")

    if decision and node_name == "triage":
        decision_messages = {
            "handle_main_logic": "✅ **Ready to analyze!** - Processing your data question",
            "need_clarification": "❓ **Need clarification** - Asking for more specific details",
            "handle_follow_up": "💡 **Providing guidance** - Helping you ask better data questions",
            "handle_modification_intent": "🛡️ **Data protection** - Explaining read-only access",
        }
        decision_msg = decision_messages.get(decision, f"➡️ **Decision: {decision}**")
        message += f"\n{decision_msg}"

    status_msg = cl.Message(content=message)
    await status_msg.send()


@cl.on_message
async def on_message(msg: cl.Message):
    graph = builder()  # Use your actual builder function
    config = {"configurable": {"thread_id": cl.context.session.id}}

    # Track all AI messages - we'll determine the final one dynamically
    all_ai_messages = []
    has_streamed_response = False
    chunks_processed = 0
    total_chunks = []

    # Collect all chunks first to understand the full flow
    async for chunk in graph.astream(
        {"messages": [HumanMessage(content=msg.content)]}, config=config
    ):
        total_chunks.append(chunk)
        chunks_processed += 1

        for node_name, output in chunk.items():
            logger.debug(f"Processing node: {node_name}, Output: {output}")

            # Show what the agent is doing
            decision = output.get("decision") if isinstance(output, dict) else None
            await display_node_activity(node_name, decision)

            # Collect any AI messages
            if isinstance(output, dict) and "messages" in output and output["messages"]:
                for message in output["messages"]:
                    if isinstance(message, AIMessage) and message.content:
                        all_ai_messages.append(
                            {
                                "message": message,
                                "node": node_name,
                                "chunk_index": chunks_processed - 1,
                                "content": message.content.strip(),
                            }
                        )

    # Now determine and stream the final response
    if all_ai_messages:
        # Get the last substantial AI message (this will be our final response)
        final_message_data = None

        # Look for the last message with substantial content
        for msg_data in reversed(all_ai_messages):
            if len(msg_data["content"]) > 10:  # Substantial content
                final_message_data = msg_data
                break

        # If no substantial message, just take the last one
        if not final_message_data and all_ai_messages:
            final_message_data = all_ai_messages[-1]

        if final_message_data:
            content = final_message_data["content"]
            node_name = final_message_data["node"]

            # Add context about which path was taken
            context_messages = {
                "main_logic": "📊 **Analysis Complete:**\n\n",
                "clarification": "❓ **Clarification Needed:**\n\n",
                "follow_up": "💡 **Guidance:**\n\n",
                "handle_modification": "🛡️ **Data Protection Notice:**\n\n",
                "triage": "🤔 **Analysis:**\n\n",
            }

            context = context_messages.get(node_name, "")
            full_content = context + content

            # Stream the final response
            streaming_msg = cl.Message(content="")
            for char in full_content:
                await streaming_msg.stream_token(char)
            await streaming_msg.update()
            has_streamed_response = True

    # Fallback: check graph state if no messages were captured
    if not has_streamed_response:
        try:
            final_state = graph.get_state(config)
            if final_state and final_state.values.get("messages"):
                # Find the last AI message in the state
                for message in reversed(final_state.values["messages"]):
                    if isinstance(message, AIMessage) and message.content:
                        final_msg = cl.Message(content=message.content)
                        await final_msg.send()
                        break
                else:
                    # No AI response found
                    waiting_msg = cl.Message(content="⏳ Processing your request...")
                    await waiting_msg.send()
        except Exception as e:
            logger.warning(f"Could not retrieve final state: {e}")
            error_msg = cl.Message(content="❌ An error occurred while processing your request.")
            await error_msg.send()


@cl.on_chat_start
async def on_chat_start():
    """Initialize the chat session"""
    welcome_msg = cl.Message(
        content="👋 **Hi! I'm Simba, your data analyst assistant!** \n\n"
        "I can help you explore and analyze your database with natural language queries. "
        "Just ask me questions about your data and I'll generate the insights you need!\n\n"
        "💡 *Choose a starter question below or ask me anything about your data.*"
    )
    await welcome_msg.send()


# Optional: Handle interrupts (since your graph has interrupt_after=['clarification'])
@cl.on_chat_resume
async def on_chat_resume():
    """Handle when chat resumes after an interrupt"""
    resume_msg = cl.Message(
        content="🔄 **Resuming analysis...** Let me continue processing your request."
    )
    await resume_msg.send()


# Helper function to handle the clarification flow specifically
async def handle_clarification_interrupt(config):
    """Handle the clarification interrupt in your graph"""
    try:
        graph = builder()
        # Resume the graph after clarification
        async for chunk in graph.astream(None, config=config):
            # Handle the resumed execution
            for node_name, output in chunk.items():
                if isinstance(output, dict) and "messages" in output:
                    for message in output["messages"]:
                        if isinstance(message, AIMessage) and message.content:
                            final_msg = cl.Message(content=message.content)
                            await final_msg.send()
                            return
    except Exception as e:
        logger.error(f"Error handling clarification interrupt: {e}")
        error_msg = cl.Message(
            content="❌ Sorry, there was an error processing your clarification."
        )
        await error_msg.send()

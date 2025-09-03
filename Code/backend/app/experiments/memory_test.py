import asyncio

from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from langmem import create_manage_memory_tool
from rich.console import Console
from rich.panel import Panel
from rich.pretty import pprint

from app.core.logging import logger
from app.core.memory import init_memory
from app.schemas.memory import UserProfile
from app.utils.util import Util

console = Console()


def display_results(title: str, results: list):
    panel_title = f"[bold cyan]{title}[/bold cyan] ({len(results)} item(s))"
    console.print(Panel(panel_title, expand=False, border_style="blue"))

    if not results:
        console.print("  [dim]No results found.[/dim]\n")
        return

    for i, result in enumerate(results, 1):
        metadata = (
            f"  [yellow]Item {i}:[/yellow]\n"
            f"    [bold]Namespace:[/bold] {'.'.join(result.namespace)}\n"
            f"    [bold]Key:[/bold] {result.key}\n"
            f"    [bold]Updated At:[/bold] {result.updated_at.strftime('%Y-%m-%d %H:%M:%S')}"
        )
        console.print(metadata)
        console.print("    [bold]Value:[/bold]")

        pprint(result.value, expand_all=True)

        if i < len(results):
            console.print("-" * 40)
    console.print("\n")


async def main():
    async with init_memory() as memory:
        profile_reflection_executor = memory["profile_reflection_executor"]
        main_reflection_executor = memory["main_reflection_executor"]

        logger.info("Step 1 & 2: Submitting initial and updated profile data...")

        profile_reflection_executor.submit({"messages": [
            SystemMessage(content="You are a helpful assistant who remembers user preferences and background."),
            HumanMessage(
                content="Hi, my name is Danai and I work in the Risk & Compliance department of ZB Bank in Chegutu."),
            AIMessage(
                content="Nice to meet you, Danai! I'll remember that you work in Risk & Compliance at Partners Bank in Maine. How can I help you today?"),
            HumanMessage(content="I'm looking to improve our customer analytics and I'm fairly technical."),
            AIMessage(
                content="Great! I've noted that you're interested in customer analytics and have technical skills. I'll keep that in mind for our conversations."),
        ]}, after_seconds=0.5, config={"configurable": {"thread_id": "7667", "user_id": "777"}})

        await asyncio.sleep(3)
        #
        # profile_reflection_executor.submit({"messages": [
        #     SystemMessage(content="You are a helpful assistant who remembers user preferences and background."),
        #     HumanMessage(
        #         content="Actually, I should clarify - my name is now Nyasha Kanyepi, but I've moved to the IT department at CBZ Bank."),
        #     AIMessage(
        #         content="Thanks for the update, Nyasha! I'll update your profile to reflect that you're now in the IT department at CBZ Bank instead of marketing at Partners Bank."),
        #     HumanMessage(
        #         content="Yes, and I'm now working specifically as a Data Engineer with expertise in SQL and Python."),
        #     AIMessage(
        #         content="Perfect! I've updated your profile - you're Nyasha Kanyepi, Data Engineer in IT at CBZ Bank, with SQL and Python expertise."),
        #     HumanMessage(content="I prefer concise responses and work mainly with customer and transaction tables."),
        #     AIMessage(
        #         content="Noted! I'll keep responses concise and remember you work primarily with customer and transaction tables."),
        # ]}, after_seconds=0.5, config={"configurable": {"thread_id": "76635", "user_id": "777"}})

        logger.info("Step 3: Submitting general memory data...")
        main_reflection_executor.submit({"messages": [
            SystemMessage(content="You are a helpful SQL assistant."),
            HumanMessage(content="Can you help me write a query to get customer data from the customers table?"),
            AIMessage(content="SELECT * FROM customers WHERE active = true;"),
            HumanMessage(content="That worked great! The query executed successfully."),
            AIMessage(content="Excellent! I'm glad the query worked for you."),
        ]}, after_seconds=0.5, config={"configurable": {"thread_id": "7669", "user_id": "777","memory_type":"episodic"}})

        logger.info("Waiting for background reflections to complete...")
        await asyncio.sleep(3)

        logger.info("Step 4: Fetching and displaying results")

        profile_results = await memory["store"].asearch(
            ("users", "777", "profile"),
            limit=10,
        )

        print(Util.format_to_yaml(profile_results, default_text="Nothing"))

        general_results = await memory["store"].asearch(
            ("memories", "777", "episodic"),
            limit=10,
        )
        # display_results("Stored General Memories", general_results)
        print(Util.format_to_yaml(general_results, default_text="Nothing"))

        all_results = await memory["store"].asearch((), limit=50)
        display_results("All Stored Items (Debug View)", all_results)

        # You can also store in hotpath by using
        # profile_manager.ainvoke({"messages":"Hey my name is Ronald Kanyepi"})
        # you can also store as a tool
        # await create_manage_memory_tool(namespace=("users", "778", "profile"), store=memory["store"]).ainvoke({"content":"My name is Nyasha Kanyepi"},schema=UserProfile,actions_permitted=['update','insert'],config={"configurable": {"thread_id": "8000", "user_id": "778"}},)
        # await create_manage_memory_tool(namespace=("users", "778", "profile"), store=memory["store"]).ainvoke({"content":"My name is Ronald Kanyepi"},schema=UserProfile,actions_permitted=['update','insert'],config={"configurable": {"thread_id": "8000", "user_id": "778"}})
        # # print(await create_search_memory_tool(namespace=("users", "777", "profile"), store=memory["store"]).ainvoke("ronald_kanyepi"))


if __name__ == "__main__":
    asyncio.run(main())

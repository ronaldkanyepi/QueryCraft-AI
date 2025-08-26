import asyncio
import re

from app.services.embbedings import Collection


def clean_page_content_string(text: str) -> str:
    cleaned_text = text.replace("\\n", "\n")
    cleaned_text = cleaned_text.replace("\\\n", "")
    lines = [re.sub(r"\s+", " ", line).strip() for line in cleaned_text.split("\n")]
    return "\n".join(lines)


async def main():
    schema_collection = Collection(
        collection_id="70849634-6458-490b-adb7-4f1cb389cc93",
        user_id="334438404911529987",
    )

    response = await schema_collection.search_min(
        "give the top 10 items sold by the company", limit=2
    )

    if isinstance(response, list):
        results = "\n\n".join(response)
    print(clean_page_content_string(results))


if __name__ == "__main__":
    asyncio.run(main())

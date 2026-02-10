import asyncio
import json
import os

import dotenv
from backboard import BackboardClient

# Load environment variables
dotenv.load_dotenv()

# Initialize the Backboard client
client = BackboardClient(api_key=os.getenv("BACKBOARD_API_KEY"))


async def classify_intent(utterance, assistant_id):
    """
    Classifies the intent of an utterance using Backboard's stateful assistant.
    Returns a dictionary containing the classification label and reasoning.
    """
    if not utterance or utterance.strip() == "<nospeech>":
        return {"label": "NO_COMMITMENT", "reason": "No speech detected"}

    prompt = f"""
    You are classifying customer intent in a financial call.

    Choose EXACTLY ONE label from:
    AGREEMENT,
    CONDITIONAL_AGREEMENT,
    DELAY_REQUEST,
    REFUSAL,
    DISPUTE,
    INFORMATION_SEEKING,
    NO_COMMITMENT

    Rules:
    - If payment depends on time or condition → CONDITIONAL_AGREEMENT
    - If customer asks for more time → DELAY_REQUEST
    - If customer refuses or cannot pay → REFUSAL
    - If customer disputes loan or payment → DISPUTE
    - If asking questions → INFORMATION_SEEKING
    - If vague or evasive → NO_COMMITMENT

    Return JSON only. No explanation.
    JSON Format: {{"label": "LABEL", "reason": "Brief explanation"}}

    Text:
    "{utterance}"
    """

    try:
        # Create a fresh thread for each classification to ensure stateless isolation
        thread = await client.create_thread(assistant_id)

        # Send a message and get the complete response
        response = await client.add_message(
            thread_id=thread.thread_id,
            content=prompt,
            llm_provider="openai",
            model_name="gpt-4o",
            stream=False,
        )

        content = response.content.strip()

        # Extract JSON if wrapped in markdown blocks
        if "```" in content:
            try:
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                else:
                    content = content.split("```")[1].split("```")[0]
                content = content.strip()
            except IndexError:
                pass

        return json.loads(content)
    except Exception as e:
        print(f"Error classifying intent for '{utterance[:30]}...': {e}")
        # If it was an API error, we might see it here
        if hasattr(e, "response") and hasattr(e.response, "text"):
            print(f"API Response: {e.response.text}")
        return {"label": "NO_COMMITMENT", "reason": f"Classification error: {e}"}


async def process_and_log(input_json_path):
    """
    Processes the translated transcript data and classifies intents.
    """
    if not os.path.exists(input_json_path):
        print(f"Error: Path {input_json_path} does not exist.")
        return

    # 1. Create/Ensure an assistant exists for this task
    print("Initializing Intent Classification Assistant...")
    assistant = await client.create_assistant(
        name="Financial Intent Classifier",
        system_prompt="You are a professional financial services assistant specializing in intent classification.",
    )

    with open(input_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Extract utterances from diarized transcript if available, or use the top-level list
    # The expected input format from translator.py has diarized_transcript/entries
    entries = []
    if isinstance(data, list):
        entries = data
    elif "diarized_transcript" in data and "entries" in data["diarized_transcript"]:
        entries = data["diarized_transcript"]["entries"]

    print(f"Found {len(entries)} entries to process.")

    for i, entry in enumerate(entries):
        utterance = (
            entry.get("transcript_english")
            or entry.get("utterance")
            or entry.get("transcript")
        )

        if not utterance:
            continue

        print(f"({i + 1}/{len(entries)}) Classifying: {utterance[:50]}...")

        result = await classify_intent(utterance, assistant.assistant_id)

        # Store result back in the entry (optional but useful)
        entry["intent_classification"] = result

        label = result.get("label", "UNKNOWN")
        print(f"  -> Result: {label}")

    # Save results to a new flagged file
    output_path = input_json_path.replace(".json", "_flagged.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"\nProcessing complete! Results saved to: {output_path}")


if __name__ == "__main__":
    # Ensure we run from the server directory or handle pathing
    input_file = os.path.join(
        os.path.dirname(__file__), "output", "translated_output.json"
    )
    asyncio.run(process_and_log(input_file))

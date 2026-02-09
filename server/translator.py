from dotenv import load_dotenv
import os
import json
from sarvamai import SarvamAI

load_dotenv()

client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY"),
)

def translate_text(text, source_lang="ta-IN", target_lang="en-IN"):
    """Translate text from source language to target language"""
    if not text or text == "<nospeech>":
        return text
    
    try:
        response = client.text.translate(
            input=text,
            source_language_code=source_lang,
            target_language_code=target_lang,
            speaker_gender="Male",
            mode="formal",
            model="mayura:v1"
        )
        if hasattr(response, 'translated_text'):
            return response.translated_text
        elif hasattr(response, 'text'):
            return response.text
        elif isinstance(response, dict):
            return response.get('translated_text', response.get('text', text))
        else:
            return str(response)
    except Exception as e:
        print(f"Error translating: {text[:50]}... - {str(e)}")
        return text

def translate_transcript_data(input_file, output_file):
    """Read JSON, translate transcripts, and save to output file"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("Translating main transcript...")
    if 'transcript' in data:
        data['transcript_english'] = translate_text(data['transcript'])
    
    print("Translating words in timestamps...")
    if 'timestamps' in data and 'words' in data['timestamps']:
        translated_words = []
        for i, word in enumerate(data['timestamps']['words']):
            print(f"Translating word {i+1}/{len(data['timestamps']['words'])}: {word[:30]}...")
            translated_word = translate_text(word)
            translated_words.append(translated_word)
        data['timestamps']['words_english'] = translated_words
    
    print("Translating diarized transcript entries...")
    if 'diarized_transcript' in data and 'entries' in data['diarized_transcript']:
        for i, entry in enumerate(data['diarized_transcript']['entries']):
            if 'transcript' in entry:
                print(f"Translating entry {i+1}/{len(data['diarized_transcript']['entries'])}: {entry['transcript'][:30]}...")
                entry['transcript_english'] = translate_text(entry['transcript'])
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nTranslation complete! Output saved to: {output_file}")

if __name__ == "__main__":
    input_file = "output/Sample3.m4a.json" 
    output_file = "output/translated_output.json"
    
    translate_transcript_data(input_file, output_file)
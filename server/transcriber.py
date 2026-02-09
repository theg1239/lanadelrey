from dotenv import load_dotenv
import os
from sarvamai import SarvamAI

load_dotenv()

def main():
    client = SarvamAI(api_subscription_key=os.getenv("SARVAM_API_KEY"))

    job = client.speech_to_text_job.create_job(
        language_code="unknown",
        model="saaras:v3",
        with_timestamps=True,
        with_diarization=True,
        #num_speakers=2  # you can set number of speakers according to you
    )

    audio_paths = ["C:\\Users\\ASUS\\Desktop\\lanadelrey-1\\server\\Sample3.m4a"]
    job.upload_files(file_paths=audio_paths)

    job.start()

    final_status = job.wait_until_complete()

    if job.is_failed():
        print("STT job failed.")
        return

    output_dir = "./output"
    job.download_outputs(output_dir=output_dir)
    print(f"Output downloaded to: {output_dir}")

if __name__ == "__main__":
    main()

# --- Notebook/Colab usage ---
# main()
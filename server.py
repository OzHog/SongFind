from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from audd import AudD
from google import genai
import sys
import os
from dotenv import load_dotenv



sys.stdout.reconfigure(encoding='utf-8')

app = FastAPI()

load_dotenv()
AUDD_API_TOKEN = os.getenv("AUDD_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://songfind.onrender.com"],  # בפרודקשן מומלץ להחליף לכתובת האתר הספציפית שלך
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
audd_client = AudD(AUDD_API_TOKEN)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)


@app.get("/")
def home():
    return FileResponse("static/index.html")


@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}, Content-Type: {file.content_type}")
    
    await file.seek(0)
    file_bytes = await file.read()

    # הגדרת שם הקובץ לשמירה מקומית (למשל: uploaded_recording.mp4 או webm)
    extension = file.filename.split(".")[-1]
    file_location = f"saved_recording.{extension}"
    # # שמירת הקובץ בפועל בתיקיית הפרויקט כדי שתוכל להקשיב לו במחשב
    with open(file_location, "wb") as buffer:
        buffer.write(file_bytes)

    try:
        result = audd_client.recognize(file_bytes)
        print(f"-------audD result:--------\n{result}")
        if result:
            print("In if result")
            title = result.title
            artist = result.artist

            prompt = f"ספר לי משהו מעניין על השיר {title} של היוצר {artist}"
            chat = gemini_client.aio.chats.create(
                model="gemini-3.5-flash-lite")
            gemini_response = await chat.send_message(prompt)

            print(f"---------Gemini:---------\n{gemini_response.text}")

            return {
                "status": "success",
                "artist": result.artist,
                "title": result.title,
                "message": f"Found: {result.title} by {result.artist}",
                "recognized": True,
                "to_know": gemini_response.text,
            }
        else:
            return {
                "status": "success",
                "artist": "unKnown",
                "title": "unKnown",
                "recognized": False,
                "to_know": "",
            }
    except Exception as e:
        return {"status": "error", "message": f"שגיאה בזיהוי: {str(e)}", "recognized": False}
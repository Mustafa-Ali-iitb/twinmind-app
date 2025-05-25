from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from auth import verify_firebase_token
import os, json, requests
from datetime import datetime

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MONGO_URL = os.getenv("MONGO_URL")
OPENAI_API_BASE = "https://api.openai.com/v1"
WHISPER_MODEL = "whisper-1"
GPT_MODEL = "gpt-3.5-turbo"
FRONTEND_URL = "http://localhost:3000"

# Initialize FastAPI app
app = FastAPI()

# MongoDB setup
client = MongoClient(MONGO_URL)
db = client["twinMind"]
users_collection = db["user_data"]
meetings_collection = db["meeting_data"]
print("Connected to DB:", client.list_database_names())

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Decode creds ------------
def decode_credentials():
    b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if not b64:
        print("❌ GOOGLE_SERVICE_ACCOUNT_B64 not set")
        return

    output_path = "backend/credentials/serviceAccountKey.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "wb") as f:
        f.write(base64.b64decode(b64))
        print("✅ Decoded serviceAccountKey.json")

decode_credentials()

# ---------- Helper Functions ----------

def transcribe_audio_bytes(audio_bytes: bytes, filename: str, content_type: str) -> str:
    try:
        response = requests.post(
            f"{OPENAI_API_BASE}/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files={"file": (filename, audio_bytes, content_type)},
            data={"model": WHISPER_MODEL, "response_format": "text"}
        )
        response.raise_for_status()
        return response.text.strip()
    except requests.exceptions.RequestException as e:
        print(f"Whisper API error: {e}")
        raise Exception("Transcription failed from Whisper API")

def get_structured_summary(transcript_text: str) -> dict:
    prompt = (
        "You are a helpful assistant. Summarize the following meeting transcript. Make sure you use transcript to generate a detailed summary"
        "The meeting may have multiple participants. Return your output as a JSON object in the format:\n"
        "{ \"overview\": [\"...\"], \"actionables\": [\"...\"], \"notes\": \"...\" }\n\n"
        f"Transcript:\n{transcript_text}"
    )
    try:
        response = requests.post(
            f"{OPENAI_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GPT_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except json.JSONDecodeError:
        print("Failed to parse OpenAI response JSON")
        raise
    except Exception as e:
        print(f"OpenAI API call failed: {e}")
        raise

def ask_question_about_transcript(transcript: List[str], question: str) -> str:
    full_text = "\n".join(transcript)
    prompt = (
        f"Here is a transcript of a meeting:\n{full_text}\n\n"
        f"Based on this, answer the following question as accurately as possible:\n{question}\n\n"
        f"Answer:"
    )
    try:
        response = requests.post(
            f"{OPENAI_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GPT_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"OpenAI Q&A error: {e}")
        raise

# ---------- Routes ----------

@app.post("/login")
async def login(request: Request):
    try:
        data = await request.json()
        token = data.get("token")
        if not token:
            raise HTTPException(status_code=400, detail="Missing token")
        user_info = verify_firebase_token(token)
        if not users_collection.find_one({"uid": user_info["uid"]}):
            users_collection.insert_one({
                "uid": user_info["uid"],
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "picture": user_info.get("picture")
            })
        return {"message": "Login successful", "user": user_info}
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.get("/meetings/past")
async def get_past_meetings(uid: str):
    try:
        meetings = list(meetings_collection.find({"uid": uid}, {"_id": 0}).sort("meetingStartTime", -1))
        return {"meetings": meetings}
    except Exception as e:
        print(f"Fetch past meetings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/meetings/find")
async def find_meeting(uid: str, meetingId: str):
    try:
        meeting = meetings_collection.find_one({"uid": uid, "meetingId": meetingId}, {"_id": 0})
        return {"found": bool(meeting), "meeting": meeting or {}}
    except Exception as e:
        print(f"Find meeting error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SearchItem(BaseModel):
    question: str
    answer: str
    datetimeStamp: str

class SaveSearchesPayload(BaseModel):
    uid: str
    meetingId: str
    searches: List[SearchItem]

@app.post("/meetings/searches")
async def save_meeting_searches(payload: SaveSearchesPayload):
    try:
        result = meetings_collection.update_one(
            {"uid": payload.uid, "meetingId": payload.meetingId},
            {"$push": {
                "meetingSearches": {
                    "$each": [
                        {
                            **s.dict(),
                            "datetimeStamp": datetime.fromisoformat(s.datetimeStamp.replace("Z", "+00:00"))
                        } for s in payload.searches
                    ]
                }
            }}
        )
        return {"status": "success", "updated": result.modified_count}
    except Exception as e:
        print(f"Save searches error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save searches")

@app.post("/meetings/init")
async def initialize_meeting(request: Request):
    try:
        data = await request.json()
        required_fields = ["uid", "meetingId", "meetingName", "meetingDescription", "meetingStartTime", "meetingEndTime", "createdAt"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        result = meetings_collection.find_one_and_update(
            {"meetingId": data["meetingId"]},
            {"$setOnInsert": {
                "uid": data["uid"],
                "meetingId": data["meetingId"],
                "meetingName": data["meetingName"],
                "meetingDescription": data["meetingDescription"],
                "meetingStartTime": datetime.fromisoformat(data["meetingStartTime"].replace("Z", "+00:00")),
                "meetingEndTime": datetime.fromisoformat(data["meetingEndTime"].replace("Z", "+00:00")),
                "createdAt": datetime.fromisoformat(data["createdAt"].replace("Z", "+00:00")),
                "meetingTranscription": [],
                "meetingSearches": [],
                "meetingSummary": None
            }},
            upsert=True,
            return_document=True
        )
        return {"message": "Meeting initialized", "meetingId": data["meetingId"]}
    except Exception as e:
        print(f"Meeting init error: {e}")
        raise HTTPException(status_code=500, detail="Meeting init failed")

@app.post("/meeting/chunk")
async def save_meeting_chunk(meetingId: str = Form(...), timestamp: int = Form(...), file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    try:
        audio_bytes = await file.read()
        transcript_text = transcribe_audio_bytes(audio_bytes, file.filename, file.content_type)
        meetings_collection.update_one(
            {"meetingId": meetingId},
            {"$push": {"meetingTranscription": {"time": timestamp, "text": transcript_text}}}
        )
        return {"message": "Chunk saved", "text": transcript_text}
    except Exception as e:
        print(f"Chunk save error: {e}")
        raise HTTPException(status_code=500, detail="Chunk processing failed")

@app.post("/generate-structured-summary")
async def generate_structured_summary(payload: dict):
    try:
        transcript_text = payload.get("text")
        meeting_id = payload.get("meetingId")
        uid = payload.get("uid")
        if not transcript_text:
            raise ValueError("Missing transcript text")

        summary = get_structured_summary(transcript_text)
        meetings_collection.update_one(
            {"meetingId": meeting_id, "uid": uid},
            {"$set": {"meetingSummary": summary}}
        )
        return {"summary": summary}
    except json.JSONDecodeError:
        print("Summary parse error")
        raise HTTPException(status_code=500, detail="Invalid summary JSON")
    except Exception as e:
        print(f"Summary gen error: {e}")
        raise HTTPException(status_code=500, detail="Summary generation failed")

@app.post("/search-in-transcript")
async def search_transcript(payload: dict):
    try:
        question = payload.get("question")
        transcript = payload.get("transcript")
        if not question or not transcript:
            raise ValueError("Missing input")

        answer = ask_question_about_transcript(transcript, question)
        return {"answer": answer}
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

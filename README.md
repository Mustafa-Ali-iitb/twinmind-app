# 📝 Real-time Meeting Assistant — FastAPI + React

This project replicates the functionality of a meeting assistant similar to the iOS app in the TwinMind assignment. It enables users to log in, transcribe meetings in real-time, chat with the transcript, and view structured meeting summaries.

---

## 🔧 Tech Stack

- **Frontend**: React, Tailwind CSS, Firebase Auth
- **Backend**: FastAPI, Python, OpenAI/Gemini APIs, MongoDB/PostgreSQL
- **Others**: Google Calendar API, WebSockets/SSE for streaming

---

## 📁 Project Structure

project-root/
├── backend/ # FastAPI backend
├── frontend/ # React frontend
└── README.md

---

## 🚀 Features

- Google OAuth login (via Firebase or Authlib)
- Google Calendar integration
- Real-time audio transcription (OpenAI or Gemini)
- Chat interface over transcript (streaming responses)
- Automatic meeting summary generation
- Persistent storage of transcripts and summaries

---

## 🛠 Setup Instructions

### ✅ Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate    # on Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### ✅ Frontend (React)

cd frontend
npm install
npm run dev                 # or npm start if using CRA



### 📄 Environment Variables

- Make sure to create .env files for both backend/ and frontend/:

#### Backend .env

OPENAI_API_KEY=your_key_here
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
DB_URL=your_database_url

#### Frontend .env

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_BACKEND_URL=http://localhost:8000

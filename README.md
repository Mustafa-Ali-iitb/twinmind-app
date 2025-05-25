# TwinMind 🧠 – Smart Meeting Assistant

TwinMind is an intelligent meeting assistant that integrates with your Google Calendar to let you:

* View Upcoming and Past Meetings
* Join and Transcribe Meetings (via mic or screen share)
* Ask Questions in Real-Time
* Auto-generate Meeting Summaries and Actionables
* Save and Search Transcript Conversations

---

## 🌐 Live Demo

Access the live app here: [https://twinmind-frontend-di71.onrender.com/](https://twinmind-frontend-di71.onrender.com/)

---

## 🧰 Tech Stack

* **Frontend**: React.js + React Context + CSS
* **Backend**: FastAPI + MongoDB
* **Auth**: Firebase Google Auth
* **Transcription & Summary**: OpenAI Whisper & GPT-3.5
* **Storage**: MongoDB Atlas
* **Deployment**: [Render](https://render.com/)

---

## 🚀 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Mustafa-Ali-iitd/twinmind-app.git
cd twinmind-app
```

---

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `.env` file:

```
MONGO_URL=<your_mongodb_uri>
OPENAI_API_KEY=<your_openai_key>
GOOGLE_SERVICE_ACCOUNT_B64=<your_base64_encoded_firebase_key>
```

Run backend server:

```bash
uvicorn main:app --reload
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Run React app:

```bash
npm start
```

---

## 🔐 Important Notes

* **Google OAuth Warning**: If your app isn't verified by Google, it may show an "Unverified App" screen.
* **Transcription Cost**: OpenAI Whisper API incurs cost after free credits. Use wisely.


---

## 🧑‍💻 Author

Made with ❤️ by [Mustafa Ali](mailto:mustafaali@umass.edu)
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize Firebase once
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_CREDENTIALS")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

def verify_firebase_token(id_token: str):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

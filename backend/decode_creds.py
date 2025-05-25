import os
import base64

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
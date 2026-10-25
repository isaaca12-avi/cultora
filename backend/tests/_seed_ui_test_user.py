"""Crear un usuario superadmin de prueba con must_change_password=true para testing UI."""
import os
import sys
import uuid
import bcrypt
from datetime import datetime, timezone
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env")

async def main():
    email = sys.argv[1]
    password = sys.argv[2]
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": "UI Bootstrap Test Superadmin",
        "password_hash": pw_hash,
        "created_at": now,
        "profile": {},
        "admin_role": "superadmin",
        "status": "active",
        "must_change_password": True,
    })
    print(f"CREATED user_id={user_id} email={email}")
    client.close()

asyncio.run(main())

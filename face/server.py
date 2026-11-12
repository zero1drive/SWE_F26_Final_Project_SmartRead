"""Face login service: YOLO classification, trained on webcam frames.

Run:  python -m uvicorn server:app --port 8001   (from the face/ folder)

  POST /enroll    {"username": str, "images": [base64 jpeg, ...]}  save frames, retrain in the background
  GET  /status    {"training": bool, "classes": [...], "error": str|null}
  POST /identify  {"image": base64 jpeg}  ->  {"name": str, "confidence": float}

Each enrolled user is one class. Classification needs at least two classes and a way to say
"nobody I know", so there is always an extra "_unknown" class built from scrambled and noisy
versions of the enrolled frames. The web app also rejects any answer below a confidence
threshold (FACE_MIN_CONFIDENCE in src/lib/server/rules.ts).
"""

import base64
import io
import os
import random
import re
import shutil
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from PIL import Image, ImageFilter
from pydantic import BaseModel

HERE = Path(__file__).resolve().parent
FACES = HERE.parent / "data" / "faces"  # data/faces/<username>/*.jpg  (git-ignored)
DATASET = HERE / "dataset"  # rebuilt on every training run
RUNS = HERE / "runs"
WEIGHTS = RUNS / "face" / "weights" / "best.pt"
BASE_MODEL = os.environ.get("FACE_MODEL", str(HERE / "yolo11n-cls.pt"))  # smallest YOLO classification checkpoint, downloaded on first use
EPOCHS = int(os.environ.get("FACE_EPOCHS", "8"))
IMGSZ = 128
UNKNOWN = "_unknown"

app = FastAPI()
state = {"training": False, "error": None}
model = None
lock = threading.Lock()


def decode(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    try:
        return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
    except Exception:
        raise HTTPException(400, "That image could not be read.")


def load_model():
    global model
    from ultralytics import YOLO  # imported lazily: it is slow to import

    model = YOLO(str(WEIGHTS)) if WEIGHTS.exists() else None


def scramble(img: Image.Image) -> Image.Image:
    """Cut a frame into tiles and shuffle them: has the colours of a webcam frame but no face."""
    img = img.resize((IMGSZ, IMGSZ))
    n, size = 4, IMGSZ // 4
    tiles = [img.crop((x * size, y * size, (x + 1) * size, (y + 1) * size)) for y in range(n) for x in range(n)]
    random.shuffle(tiles)
    out = Image.new("RGB", (IMGSZ, IMGSZ))
    for i, t in enumerate(tiles):
        out.paste(t.rotate(random.choice([0, 90, 180, 270])), ((i % n) * size, (i // n) * size))
    return out.filter(ImageFilter.GaussianBlur(random.uniform(0, 2)))


def noise() -> Image.Image:
    return Image.effect_noise((IMGSZ, IMGSZ), random.uniform(20, 90)).convert("RGB")


def build_dataset():
    """data/faces/<user>/ -> face/dataset/{train,val}/<class>/ plus the _unknown class."""
    shutil.rmtree(DATASET, ignore_errors=True)
    users = sorted(p for p in FACES.iterdir() if p.is_dir() and any(p.glob("*.jpg")))
    all_frames = []
    for user in users:
        frames = sorted(user.glob("*.jpg"))
        all_frames += frames
        random.shuffle(frames)
        cut = max(1, len(frames) // 5)
        for split, items in (("val", frames[:cut]), ("train", frames[cut:])):
            d = DATASET / split / user.name
            d.mkdir(parents=True, exist_ok=True)
            for f in items:
                shutil.copy(f, d / f.name)
    for split, count in (("train", 40), ("val", 10)):
        d = DATASET / split / UNKNOWN
        d.mkdir(parents=True, exist_ok=True)
        for i in range(count):
            img = scramble(Image.open(random.choice(all_frames)).convert("RGB")) if i % 2 else noise()
            img.save(d / f"{i:03d}.jpg")
    return [u.name for u in users]


def train():
    try:
        from ultralytics import YOLO

        build_dataset()
        YOLO(BASE_MODEL).train(
            data=str(DATASET), epochs=EPOCHS, imgsz=IMGSZ, batch=16, device="cpu",
            project=str(RUNS), name="face", exist_ok=True, verbose=False, plots=False,
            workers=0,  # no worker processes: simpler and safe on Windows inside a thread
        )
        with lock:
            load_model()
        state["error"] = None
    except Exception as e:  # report it to the web app instead of crashing
        state["error"] = f"Training failed: {e}"
    finally:
        state["training"] = False


FACES.mkdir(parents=True, exist_ok=True)
load_model()  # reuse the last trained model if there is one


class Enroll(BaseModel):
    username: str
    images: list[str]


class Identify(BaseModel):
    image: str


@app.get("/status")
def status():
    classes = sorted(p.name for p in FACES.iterdir() if p.is_dir()) if FACES.exists() else []
    return {"training": state["training"], "trained": model is not None, "classes": classes, "error": state["error"]}


@app.post("/enroll")
def enroll(body: Enroll):
    if state["training"]:
        raise HTTPException(409, "Already training; try again in a minute.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_]{2,19}", body.username):
        raise HTTPException(400, "Bad username.")
    if len(body.images) < 5:
        raise HTTPException(400, "Need at least 5 frames.")
    folder = FACES / body.username
    shutil.rmtree(folder, ignore_errors=True)  # re-enrolling replaces old photos
    folder.mkdir(parents=True)
    for i, b64 in enumerate(body.images[:40]):
        decode(b64).resize((IMGSZ, IMGSZ)).save(folder / f"{i:03d}.jpg", quality=90)
    state["training"] = True
    state["error"] = None
    threading.Thread(target=train, daemon=True).start()
    return {"ok": True, "saved": min(len(body.images), 40)}


@app.post("/identify")
def identify(body: Identify):
    with lock:
        if model is None:
            raise HTTPException(409, "No faces have been enrolled yet.")
        result = model.predict(decode(body.image).resize((IMGSZ, IMGSZ)), imgsz=IMGSZ, verbose=False)[0]
        top = int(result.probs.top1)
        return {"name": result.names[top], "confidence": float(result.probs.top1conf)}

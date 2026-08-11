import os
import io
import json
import re
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from pypdf import PdfReader
from .. import models, schemas

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        extracted_pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_pages.append(text)
        return "\n".join(extracted_pages)
    except Exception as e:
        print(f"Error reading PDF with pypdf: {e}")
        return ""

def heuristic_syllabus_parser(text: str, filename: str) -> Dict[str, Any]:
    # Determine fallback subject name from filename
    clean_filename = re.sub(r'[\-_]', ' ', filename).split('.')[0]
    subject_name = clean_filename.title() if clean_filename else "Extracted Course Syllabus"
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    topics = []
    
    for line in lines:
        # Ignore very short lines or common header noise
        if len(line) < 4 or len(line) > 100:
            continue
        if re.match(r'^(page|chapter|unit|module|syllabus|course|instructor|email|date|time)', line, re.IGNORECASE):
            continue
        
        # Strip leading numbers or bullets (e.g. "1.1 Linear Algebra" -> "Linear Algebra")
        cleaned_topic = re.sub(r'^[\d\.\-\*\•\:]+\s*', '', line).strip()
        if cleaned_topic and cleaned_topic not in [t["name"] for t in topics]:
            # Assign intelligent baseline difficulty & priority
            diff = 3
            if any(w in cleaned_topic.lower() for w in ['intro', 'basic', 'overview', 'fundamental']):
                diff = 1
            elif any(w in cleaned_topic.lower() for w in ['advanced', 'complex', 'quantum', 'eigen', 'calculus']):
                diff = 5

            topics.append({
                "name": cleaned_topic,
                "difficulty": diff,
                "priority": 4
            })
        
        if len(topics) >= 12:
            break

    # Default fallback topics if text extraction was sparse
    if not topics:
        topics = [
            {"name": f"{subject_name} Core Fundamentals", "difficulty": 2, "priority": 5},
            {"name": f"{subject_name} Intermediate Applications", "difficulty": 3, "priority": 4},
            {"name": f"{subject_name} Advanced Problem Solving", "difficulty": 4, "priority": 5},
        ]

    return {
        "subject_name": subject_name,
        "topics": topics
    }

def analyze_and_create_syllabus(
    db: Session,
    user_id: int,
    file_bytes: bytes,
    filename: str,
    content_type: str
) -> Dict[str, Any]:
    extracted_text = ""
    if "pdf" in content_type.lower() or filename.lower().endswith(".pdf"):
        extracted_text = extract_text_from_pdf(file_bytes)

    gemini_key = os.getenv("GEMINI_API_KEY")
    parsed_result = None

    if gemini_key:
        try:
            import google.genai as genai
            from google.genai import types

            client = genai.Client(api_key=gemini_key)
            prompt = """Analyze this syllabus document/image content. Extract the course Subject Name and all distinct learning Topics/Modules.
For each topic, evaluate:
1. "difficulty": integer from 1 (easy concept) to 5 (complex/demanding topic).
2. "priority": integer from 1 (minor detail) to 5 (high exam probability).

Return ONLY valid JSON matching this schema:
{
  "subject_name": "Full Course Subject Name",
  "topics": [
     {
       "name": "Topic or Unit Name",
       "difficulty": 3,
       "priority": 5
     }
  ]
}
"""
            contents = [prompt]
            if extracted_text.strip():
                contents.append(f"Syllabus Document Text:\n{extracted_text}")
            elif file_bytes:
                # Pass inline bytes to Gemini Vision/Multimodal
                mime = content_type if content_type else "application/pdf"
                part = types.Part.from_bytes(data=file_bytes, mime_type=mime)
                contents.append(part)

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            parsed_result = json.loads(raw_text.strip())
        except Exception as e:
            print(f"Gemini Syllabus Analyzer call error: {e}. Using heuristic fallback parser.")

    if not parsed_result or "subject_name" not in parsed_result:
        parsed_result = heuristic_syllabus_parser(extracted_text, filename)

    subject_name = parsed_result.get("subject_name", filename.replace(".", " "))
    extracted_topics = parsed_result.get("topics", [])

    # 1. Create Subject in Database
    db_subject = models.Subject(name=subject_name, owner_id=user_id)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)

    # 2. Create Topics in Database
    created_topics = []
    for t_data in extracted_topics:
        db_topic = models.Topic(
            name=t_data.get("name", "General Unit"),
            subject_id=db_subject.id,
            difficulty=min(5, max(1, t_data.get("difficulty", 3))),
            priority=min(5, max(1, t_data.get("priority", 3))),
            completed=False
        )
        db.add(db_topic)
        created_topics.append(db_topic)

    db.commit()
    for t in created_topics:
        db.refresh(t)

    return {
        "subject": {
            "id": db_subject.id,
            "name": db_subject.name,
            "owner_id": db_subject.owner_id
        },
        "topics": [
            {
                "id": t.id,
                "name": t.name,
                "subject_id": t.subject_id,
                "difficulty": t.difficulty,
                "priority": t.priority,
                "completed": t.completed
            }
            for t in created_topics
        ]
    }

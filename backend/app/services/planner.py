import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from .. import models, schemas

# Scoring weights for fallback engine
EXAM_WEIGHT = 25.0
PRIORITY_WEIGHT = 3.0
DIFFICULTY_WEIGHT = 2.0
COMPLETED_PENALTY = 10.0

STRATEGIES = [
    "Feynman Technique & Key Concept Summary",
    "Active Recall Flashcards & Self-Testing",
    "Past Exam Practice Problems & Formula Drills",
    "Mind Mapping & Diagramming Complex Workflows",
    "Targeted Reading & Question Bank Solving"
]

def compute_topic_score(topic: models.Topic, exam: models.Exam = None) -> float:
    score = (topic.priority * PRIORITY_WEIGHT) + (topic.difficulty * DIFFICULTY_WEIGHT)
    if topic.completed:
        score -= COMPLETED_PENALTY

    if exam:
        days_until = (exam.date - datetime.utcnow()).days
        days_until = max(days_until, 1)
        score += (EXAM_WEIGHT / days_until)
    return max(score, 1.0)

def generate_plan_heuristic(
    db: Session,
    user_id: int,
    available_hours: float,
    study_style: str,
    subject_ids: List[int] = None,
    topic_ids: List[int] = None,
    auto_mode: bool = False,
    is_quick_planner: bool = False,
    custom_instructions: str = None
) -> schemas.PlanResponse:
    query = db.query(models.Subject).filter(models.Subject.owner_id == user_id)
    if subject_ids:
        query = query.filter(models.Subject.id.in_(subject_ids))
    subjects = query.all()
    now = datetime.utcnow()

    # Query recent study history for continuity memory
    recent_sessions = (
        db.query(models.StudySession)
        .filter(models.StudySession.user_id == user_id)
        .order_by(models.StudySession.start_time.desc())
        .limit(10)
        .all()
    )
    recently_studied_topic_names = [s.topic_name.lower() for s in recent_sessions if s.topic_name]

    # Gather candidate topics grouped by subject
    subject_candidates: Dict[int, List[Dict[str, Any]]] = {}
    subject_scores: Dict[int, float] = {}

    for subject in subjects:
        exam = (
            db.query(models.Exam)
            .filter(models.Exam.subject_id == subject.id, models.Exam.owner_id == user_id, models.Exam.date >= now)
            .order_by(models.Exam.date.asc())
            .first()
        )
        t_query = db.query(models.Topic).filter(models.Topic.subject_id == subject.id)
        if topic_ids:
            t_query = t_query.filter(models.Topic.id.in_(topic_ids))
        topics = t_query.all()

        t_list = []
        subj_total_score = 0.0
        for t in topics:
            score = compute_topic_score(t, exam)
            is_recently_studied = any(t.name.lower() in r_name for r_name in recently_studied_topic_names)
            if not is_recently_studied and not t.completed:
                score += 3.5
            elif is_recently_studied and not t.completed:
                score += 1.5

            t_list.append({
                "topic": t,
                "subject": subject,
                "exam": exam,
                "score": score,
                "is_continuation": is_recently_studied
            })
            subj_total_score += score

        if t_list:
            t_list.sort(key=lambda x: x["score"], reverse=True)
            subject_candidates[subject.id] = t_list
            subject_scores[subject.id] = max(subj_total_score, 1.0)

    # Determine proportional subject count N based on available_hours
    if available_hours <= 2.0:
        max_subjects = min(2, len(subject_candidates))
    elif available_hours <= 5.0:
        max_subjects = min(3, len(subject_candidates))
    elif available_hours <= 8.0:
        max_subjects = min(4, len(subject_candidates))
    else:
        max_subjects = min(5, len(subject_candidates))

    # Pick top N subjects by total score
    top_subject_ids = sorted(subject_scores.keys(), key=lambda sid: subject_scores[sid], reverse=True)[:max_subjects]

    # Calculate proportional hours allocated per subject
    total_top_score = sum(subject_scores[sid] for sid in top_subject_ids) if top_subject_ids else 1.0
    subject_hour_allocations: Dict[int, float] = {}
    
    for sid in top_subject_ids:
        proportion = subject_scores[sid] / total_top_score
        raw_hours = available_hours * proportion
        # Clamp to realistic block bounds (minimum 0.75h, rounded)
        allocated = max(0.75, round(raw_hours * 2) / 2)
        subject_hour_allocations[sid] = allocated

    # Collect plan items based on proportional subject hour budgets
    plan_items: List[schemas.PlanItem] = []
    accumulated_hours = 0.0
    current_schedule_time = datetime.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    strategy_idx = 0

    default_block_hours = 1.0
    if "Deep Work" in study_style:
        default_block_hours = 1.5
    elif "Exam Sprint" in study_style:
        default_block_hours = 0.75

    for sid in top_subject_ids:
        subj_budget = subject_hour_allocations[sid]
        subj_used = 0.0
        topics = subject_candidates[sid]

        for item in topics:
            if accumulated_hours >= available_hours or subj_used >= subj_budget:
                break

            duration = min(default_block_hours, subj_budget - subj_used, available_hours - accumulated_hours)
            if duration <= 0:
                break

            t = item["topic"]
            subj = item["subject"]
            exam = item["exam"]
            score = item["score"]
            is_cont = item["is_continuation"]

            start_str = current_schedule_time.strftime("%I:%M %p")
            current_schedule_time += timedelta(minutes=int(duration * 60))
            end_str = current_schedule_time.strftime("%I:%M %p")
            current_schedule_time += timedelta(minutes=15)

            pomo_count = max(1, int((duration * 60) // 30))
            strategy = STRATEGIES[strategy_idx % len(STRATEGIES)]
            strategy_idx += 1

            reason = f"Proportional allocation for {subj.name} ({subj_budget}h budget). Topic priority score ({score:.1f})."
            if is_cont:
                reason += " 🔄 Continuation of past study session."
            else:
                reason += " 🆕 Next fresh unit."
            if exam:
                days_left = max((exam.date - now).days, 0)
                reason += f" Upcoming '{exam.title}' in {days_left}d."

            plan_items.append(
                schemas.PlanItem(
                    subject=subj.name,
                    topic=t.name,
                    scheduled_start=start_str,
                    scheduled_end=end_str,
                    duration_hours=round(duration, 2),
                    priority_score=round(score, 1),
                    reason=reason,
                    study_strategy=strategy,
                    pomodoros=pomo_count
                )
            )
            subj_used += duration
            accumulated_hours += duration

    # Fallback template if no subjects/topics exist
    if not plan_items:
        current_schedule_time = datetime.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        sample_topics = [
            ("Core Fundamentals & Concepts", "Mathematics", 1.0, "Review key formulas and solve practice set #1."),
            ("Problem Solving & Exercises", "Computer Science", 1.0, "Work through algorithmic practice questions."),
            ("Synthesis & Active Recall", "Physics", 1.0, "Create summary mind maps and flashcard review.")
        ]
        for topic_name, subj_name, duration, reason in sample_topics:
            if accumulated_hours >= available_hours:
                break
            start_str = current_schedule_time.strftime("%I:%M %p")
            current_schedule_time += timedelta(minutes=int(duration * 60))
            end_str = current_schedule_time.strftime("%I:%M %p")
            current_schedule_time += timedelta(minutes=15)
            
            plan_items.append(
                schemas.PlanItem(
                    subject=subj_name,
                    topic=topic_name,
                    scheduled_start=start_str,
                    scheduled_end=end_str,
                    duration_hours=duration,
                    priority_score=8.5,
                    reason=reason,
                    study_strategy=STRATEGIES[strategy_idx % len(STRATEGIES)],
                    pomodoros=2
                )
            )
            accumulated_hours += duration
            strategy_idx += 1

    summary_text = (
        f"⚡ Quick Proportional Study Plan: Allocated {round(accumulated_hours, 1)} hours proportionally across {len(top_subject_ids) or 1} subject(s). "
    )
    if recent_sessions:
        summary_text += f"🧠 Factorized {len(recent_sessions)} past study logs for seamless topic continuity."

    return schemas.PlanResponse(
        plan=plan_items,
        total_hours=round(accumulated_hours, 2),
        study_style=study_style,
        ai_summary=summary_text
    )



def generate_plan(
    db: Session,
    user_id: int,
    available_hours: float,
    study_style: str = "Pomodoro (25/5)",
    subject_ids: List[int] = None,
    topic_ids: List[int] = None,
    auto_mode: bool = False,
    is_quick_planner: bool = False,
    custom_instructions: str = None
) -> schemas.PlanResponse:

    # Check if Gemini or OpenAI API key is available
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            import google.genai as genai
            client = genai.Client(api_key=gemini_key)
            
            query = db.query(models.Subject).filter(models.Subject.owner_id == user_id)
            if subject_ids:
                query = query.filter(models.Subject.id.in_(subject_ids))
            subjects = query.all()

            # Fetch recent sessions for history context
            recent_sessions = (
                db.query(models.StudySession)
                .filter(models.StudySession.user_id == user_id)
                .order_by(models.StudySession.start_time.desc())
                .limit(5)
                .all()
            )
            history_text = ", ".join([f"{s.subject_name}: {s.topic_name}" for s in recent_sessions if s.subject_name])

            subj_data = []
            now = datetime.utcnow()
            for s in subjects:
                t_query = db.query(models.Topic).filter(models.Topic.subject_id == s.id)
                if topic_ids:
                    t_query = t_query.filter(models.Topic.id.in_(topic_ids))
                topics = t_query.all()
                exams = db.query(models.Exam).filter(models.Exam.subject_id == s.id, models.Exam.owner_id == user_id).all()
                subj_data.append({
                    "subject": s.name,
                    "topics": [{"name": t.name, "difficulty": t.difficulty, "priority": t.priority, "completed": t.completed} for t in topics],
                    "exams": [{"title": e.title, "date": e.date.isoformat()} for e.date in [ex for ex in exams if ex.date >= now]]
                })

            prompt = f"""You are an elite AI Study Planner. Create a JSON study schedule ONLY for the provided target subjects and topics.
Available study time: {available_hours} hours.
Study style preference: {study_style}.
Auto AI Continuity Mode: {auto_mode}.
Student Recent Study History Logs: {history_text or 'None'}.
Custom notes/goals: {custom_instructions or 'None'}.
Target Subjects & Topics Data: {json.dumps(subj_data)}

Return ONLY valid JSON matching this schema:
{{
  "ai_summary": "Short 2-sentence summary referencing student history and strategy",
  "plan": [
     {{
       "subject": "Subject Name",
       "topic": "Topic Name",
       "scheduled_start": "09:00 AM",
       "scheduled_end": "10:00 AM",
       "duration_hours": 1.0,
       "priority_score": 9.2,
       "reason": "Clear explanation of why this topic is scheduled based on continuity/history",
       "study_strategy": "Specific study method e.g. Active Recall / Feynman Technique",
       "pomodoros": 2
     }}
  ]
}}
"""
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            
            parsed = json.loads(raw_text.strip())
            items = [schemas.PlanItem(**item) for item in parsed.get("plan", [])]
            return schemas.PlanResponse(
                plan=items,
                total_hours=available_hours,
                study_style=study_style,
                ai_summary=parsed.get("ai_summary", f"AI Generated Plan for {available_hours} hours.")
            )
        except Exception as e:
            print(f"Gemini API call error: {e}. Falling back to heuristic AI engine.")

    # Fallback to smart heuristic planner
    return generate_plan_heuristic(db, user_id, available_hours, study_style, subject_ids, topic_ids, auto_mode, custom_instructions)

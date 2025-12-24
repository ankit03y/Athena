"""
Athena Agent - Scheduler
APScheduler integration for cron-based and one-time runbook scheduling
"""
import os
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///athena.db")

# Initialize scheduler with persistent job store
jobstores = {
    'default': SQLAlchemyJobStore(url=DATABASE_URL)
}

scheduler = AsyncIOScheduler(jobstores=jobstores, timezone="UTC")


async def execute_runbook_job(runbook_id: int):
    """
    Scheduled job function to execute a runbook
    This is called by APScheduler when a scheduled job triggers
    """
    from database import get_sync_session, RunbookCRUD, ExecutionCRUD
    from executor import execute_runbook
    
    print(f"⏰ Scheduler triggered runbook {runbook_id}")
    
    with get_sync_session() as session:
        runbook = RunbookCRUD.get_by_id(session, runbook_id)
        if not runbook:
            print(f"❌ Runbook {runbook_id} not found")
            return
        
        # Create execution record
        execution = ExecutionCRUD.create(session, runbook_id, triggered_by="scheduler")
        
    # Execute the runbook (async)
    await execute_runbook(runbook_id, execution.id)


def schedule_runbook(
    runbook_id: int,
    schedule_type: str,
    cron_expression: str = None,
    run_at: datetime = None,
) -> str:
    """
    Schedule a runbook for future execution
    
    Args:
        runbook_id: ID of the runbook to schedule
        schedule_type: "once" or "cron"
        cron_expression: Cron expression for recurring schedules (e.g., "0 0 * * 0")
        run_at: Datetime for one-time schedules
        
    Returns:
        Job ID
    """
    job_id = f"runbook_{runbook_id}"
    
    # Remove existing job if any
    existing_job = scheduler.get_job(job_id)
    if existing_job:
        scheduler.remove_job(job_id)
    
    if schedule_type == "cron":
        if not cron_expression:
            raise ValueError("cron_expression required for cron schedule")
        
        # Parse cron expression (minute hour day month day_of_week)
        parts = cron_expression.split()
        if len(parts) != 5:
            raise ValueError("Invalid cron expression. Expected: minute hour day month day_of_week")
        
        trigger = CronTrigger(
            minute=parts[0],
            hour=parts[1],
            day=parts[2],
            month=parts[3],
            day_of_week=parts[4],
        )
        
        scheduler.add_job(
            execute_runbook_job,
            trigger=trigger,
            id=job_id,
            args=[runbook_id],
            replace_existing=True,
        )
        
    elif schedule_type == "once":
        if not run_at:
            raise ValueError("run_at required for one-time schedule")
        
        trigger = DateTrigger(run_date=run_at)
        
        scheduler.add_job(
            execute_runbook_job,
            trigger=trigger,
            id=job_id,
            args=[runbook_id],
            replace_existing=True,
        )
    else:
        raise ValueError(f"Unknown schedule_type: {schedule_type}")
    
    print(f"📅 Scheduled runbook {runbook_id} with job_id {job_id}")
    return job_id


def unschedule_runbook(runbook_id: int) -> bool:
    """
    Remove a scheduled runbook
    
    Returns:
        True if job was removed, False if not found
    """
    job_id = f"runbook_{runbook_id}"
    job = scheduler.get_job(job_id)
    
    if job:
        scheduler.remove_job(job_id)
        print(f"🗑️ Unscheduled runbook {runbook_id}")
        return True
    
    return False


def get_scheduled_jobs() -> list[dict]:
    """Get all scheduled jobs"""
    jobs = scheduler.get_jobs()
    return [
        {
            "job_id": job.id,
            "runbook_id": int(job.id.replace("runbook_", "")),
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        }
        for job in jobs
    ]


def get_next_run_time(runbook_id: int) -> Optional[datetime]:
    """Get next run time for a scheduled runbook"""
    job_id = f"runbook_{runbook_id}"
    job = scheduler.get_job(job_id)
    
    if job and job.next_run_time:
        return job.next_run_time
    
    return None


def start_scheduler():
    """Start the scheduler - call on app startup"""
    if not scheduler.running:
        scheduler.start()
        print("⏰ Scheduler started!")


def shutdown_scheduler():
    """Shutdown the scheduler - call on app shutdown"""
    if scheduler.running:
        scheduler.shutdown()
        print("⏰ Scheduler stopped!")

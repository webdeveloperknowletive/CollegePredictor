
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.all_india_service import (
    get_all_india_summary,
    get_historical_cutoffs,
    get_all_india_filter_options,
)

router = APIRouter(
    prefix="/api/all-india",
    tags=["All India Predictor"],
)


@router.get("/health")
def all_india_health():
    return {
        "status": "healthy",
        "module": "All India CAP Predictor",
        "academic_year": "2025",
    }


@router.get("/summary")
def all_india_summary(
    academic_year: str = Query(default="2025")
):
    try:
        return get_all_india_summary(academic_year)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch All India summary: {str(exc)}",
        )


@router.get("/filters")
def all_india_filter_options():
    try:
        return get_all_india_filter_options()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch All India filters: {str(exc)}",
        )


@router.get("/cutoffs")
def all_india_cutoffs(
    exam: str = Query(default="JEE"),
    academic_year: str = Query(default="2025"),
    cap_round: Optional[int] = Query(default=None, ge=1, le=4),
    branch: Optional[str] = Query(default=None),
    city: Optional[str] = Query(default=None),
    student_percentile: Optional[float] = Query(
        default=None, ge=0, le=100
    ),
    limit: int = Query(default=500, ge=1, le=2000),
):
    try:
        return get_historical_cutoffs(
            exam=exam,
            academic_year=academic_year,
            cap_round=cap_round,
            branch=branch,
            city=city,
            student_percentile=student_percentile,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch All India cutoffs: {str(exc)}",
        )

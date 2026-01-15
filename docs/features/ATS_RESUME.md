# 🎯 ATS Resume Optimizer & Checker

## Overview
The ATS Resume Optimizer is an AI-powered intelligent feature designed to help students and professionals create resumes that pass Applicant Tracking Systems (ATS). It extracts relevant keywords from job descriptions and provides a compatibility score (0-100) with detailed feedback.

## Quick Start

### 3 Steps to Optimize Your Resume
1.  **Paste Job Description**: Navigate to `/ats-resume` and paste the target job posting.
2.  **Fill Details**: Ensure your Work Experience, Skills, and Education sections are populated.
3.  **Generate/Check**: Click "✨ Generate ATS-Optimized Resume" or "Check ATS Score".

## Core Features

### 🔍 Smart Analysis
- **Keyword Extraction**: Automatically analyzes job descriptions to identify high-frequency terms.
- **Scoring Engine**:
    - **80-100 (Excellent)**: Ready to submit.
    - **60-79 (Good)**: Minor improvements needed.
    - **< 60 (Fair/Poor)**: Requires optimization.

### 📊 Category Breakdown
1.  **Formatting**: Checks for parseability, tables, and graphics.
2.  **Keywords**: Evaluates presence of industry terms (e.g., "React", "CI/CD").
3.  **Content**: Checks for action verbs and quantifiable metrics (e.g., "Increased efficiency by 20%").
4.  **Structure**: Verifies standard sections and date consistency.

## How to Use

### Accessing the Tool
- **Location**: Resume Builder page (Purple shield button).
- **Prerequisites**: A resume with at least one experience or education entry.

### Understanding Results
The analysis modal displays:
- **Missing Keywords**: Specific terms found in the job description but missing from your resume.
- **Strengths**: What you are doing right.
- **Improvements**: Prioritized list of fixes (High/Medium/Low priority).

## Technical Implementation
- **AI Engine**: Mistral AI (via Backend).
- **Processing Time**: 10-15 seconds per analysis.
- **API Endpoint**: `/api/resume/analyze-ats`
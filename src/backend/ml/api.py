#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
from typing import Dict, List, Optional
import logging

app = FastAPI(title="Ardence ML API")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def normalize_tech_name(tech: str) -> str:
    """Normalize tech names to match model predictions"""
    if not tech:
        return None
    if 'Carl Labrador' in tech:
        return 'Carl L'
    if 'Carl Tagle' in tech:
        return 'Carl T'
    if 'Michael Barbin' in tech:
        return 'Michael'
    if 'Jomaree Lawsin' in tech:
        return 'Jomaree'
    if 'Jorenzo Lucero' in tech:
        return 'Jorenzo'
    if tech == 'Carl':
        return 'Carl T'  # Default Carl to Carl T for predictions
    return tech

def prepare_ticket_text(ticket: Dict) -> str:
    """Prepare ticket text by combining relevant fields."""
    text_parts = [
        ticket.get('subject', ''),
        ticket.get('problem_type', ''),
    ]
    
    # Add comments if available
    comments = ticket.get('comments', [])
    for comment in comments:
        if comment.get('body'):
            text_parts.append(comment['body'])
    
    return ' '.join(filter(None, text_parts))

# Load model
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, 'ardence_dispatch_predictor.joblib')
    logging.info(f"Loading model from: {model_path}")
    model = joblib.load(model_path)
    logging.info("Model loaded successfully")
except Exception as e:
    logging.error(f"Error loading model: {str(e)}")
    raise

class TicketRequest(BaseModel):
    subject: str
    problem_type: Optional[str] = None
    comments: Optional[List[Dict[str, str]]] = None

@app.post("/predict/dispatch")
async def predict_dispatch(request: TicketRequest):
    """
    Predict the tech member to dispatch the ticket to.
    
    Args:
        request: Ticket data including subject, problem type, and optional comments
        
    Returns:
        Prediction and confidence score
    """
    try:
        # Convert request to ticket format
        ticket = {
            'subject': request.subject,
            'problem_type': request.problem_type or '',
            'comments': request.comments or []
        }
        
        # Prepare text and make prediction
        text = prepare_ticket_text(ticket)
        raw_prediction = model.predict([text])[0]
        probabilities = model.predict_proba([text])[0]
        
        # Normalize prediction
        prediction = normalize_tech_name(raw_prediction)
        
        return {
            "tech": prediction,
            "confidence": float(max(probabilities))
        }
    except Exception as e:
        logging.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

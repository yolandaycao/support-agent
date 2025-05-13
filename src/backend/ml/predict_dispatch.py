#!/usr/bin/env python3
"""
Ticket Dispatch Predictor

This script loads JSON ticket data and predicts the appropriate team member
for dispatch using the pre-trained model.
"""

import json
import joblib
import logging
from typing import Dict, List, Optional
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def load_json_tickets(file_path: str) -> List[Dict]:
    """
    Load tickets from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing ticket data
        
    Returns:
        List of ticket dictionaries
    """
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
            return data.get('tickets', [])
    except Exception as e:
        logging.error(f"Error loading JSON file: {str(e)}")
        raise

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
    """
    Prepare ticket text by combining relevant fields.
    
    Args:
        ticket: Dictionary containing ticket data
        
    Returns:
        Combined ticket text
    """
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

def load_model(model_path: str) -> Optional[object]:
    """
    Load the trained dispatch model.
    
    Args:
        model_path: Path to the saved model file
        
    Returns:
        Loaded model or None if loading fails
    """
    try:
        return joblib.load(model_path)
    except Exception as e:
        logging.error(f"Error loading model: {str(e)}")
        raise

def predict_dispatch(model: object, tickets: List[Dict]) -> tuple:
    """
    Predict dispatch assignments and calculate accuracy metrics.
    
    Args:
        model: Trained dispatch model
        tickets: List of ticket dictionaries
        
    Returns:
        Tuple of (tickets with predictions, accuracy, classification report)
    """
    texts = [prepare_ticket_text(ticket) for ticket in tickets]
    raw_predictions = model.predict(texts)
    
    # Normalize predictions (especially handling 'Carl' -> 'Carl T')
    predictions = [normalize_tech_name(pred) for pred in raw_predictions]
    
    actuals = []
    preds = []
    
    for ticket, prediction in zip(tickets, predictions):
        ticket['predicted_dispatch'] = prediction
        # Get actual tech from user data if available
        if 'user' in ticket and ticket['user']:
            actual_tech = normalize_tech_name(ticket['user'].get('full_name'))
            if actual_tech:
                actuals.append(actual_tech)
                preds.append(prediction)
    
    if actuals:
        accuracy = accuracy_score(actuals, preds)
        report = classification_report(actuals, preds)
        return tickets, accuracy, report
    
    return tickets, None, None

def main():
    """Main execution function"""
    try:
        # Load the model
        model = load_model('ardence_dispatch_predictor_v2.joblib')
        
        # Load and process tickets
        tickets = load_json_tickets('ticket_data_24_Oct.json')
        
        # Make predictions and get metrics
        tickets_with_predictions, accuracy, report = predict_dispatch(model, tickets)
        
        # Display results
        for ticket in tickets_with_predictions:
            logging.info(f"\nTicket #{ticket.get('number')}:")
            logging.info(f"Subject: {ticket.get('subject')}")
            logging.info(f"Predicted: {ticket.get('predicted_dispatch')}")
            
            if 'user' in ticket and ticket['user']:
                actual = normalize_tech_name(ticket['user'].get('full_name'))
                if actual:
                    logging.info(f"Actual: {actual}")
                    if ticket.get('predicted_dispatch') == actual:
                        logging.info("✓ Correct")
                    else:
                        logging.info("✗ Incorrect")
            logging.info("-" * 50)
        
        if accuracy is not None:
            logging.info(f"\nOverall Accuracy: {accuracy:.2%}")
            logging.info("\nDetailed Classification Report:")
            logging.info(report)
            
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    main()

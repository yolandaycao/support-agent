#!/usr/bin/env python3
"""
Retrain the dispatch model with proper handling of Carl L and Carl T.
"""

import json
import joblib
import logging
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def normalize_tech_name(tech: str) -> str:
    """Normalize tech names for consistent mapping"""
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
    return tech

def prepare_ticket_text(ticket):
    """Combine relevant ticket fields into a single text"""
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

def load_tickets(file_path):
    """Load and prepare ticket data"""
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    prepared_data = []
    for ticket in data.get('tickets', []):
        if 'user' in ticket and ticket['user']:
            tech = normalize_tech_name(ticket['user'].get('full_name'))
            if tech:
                prepared_data.append({
                    'text': prepare_ticket_text(ticket),
                    'tech': tech,
                    'subject': ticket.get('subject', '')
                })
    
    return pd.DataFrame(prepared_data)

def train_model():
    """Train the dispatch prediction model"""
    try:
        # Load and prepare data
        logging.info("Loading ticket data...")
        df = load_tickets('ticket_data_24_Oct.json')
        
        logging.info(f"Total tickets loaded: {len(df)}")
        logging.info("\nDispatch distribution:")
        logging.info(df['tech'].value_counts())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            df['text'], 
            df['tech'], 
            test_size=0.2, 
            random_state=42,
            stratify=df['tech']
        )
        
        # Create and train pipeline
        logging.info("\nTraining model...")
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                stop_words='english'
            )),
            ('clf', RandomForestClassifier(
                n_estimators=200,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                class_weight='balanced'
            ))
        ])
        
        pipeline.fit(X_train, y_train)
        
        # Evaluate
        logging.info("\nEvaluating model...")
        y_pred = pipeline.predict(X_test)
        
        logging.info(f"\nAccuracy: {accuracy_score(y_test, y_pred):.2%}")
        logging.info("\nClassification Report:")
        logging.info(classification_report(y_test, y_pred))
        
        # Save model
        logging.info("\nSaving model...")
        joblib.dump(pipeline, 'ardence_dispatch_predictor_v2.joblib')
        logging.info("Model saved as 'ardence_dispatch_predictor_v2.joblib'")
        
        # Show some example predictions
        logging.info("\nExample predictions:")
        for idx, row in df.sample(n=5, random_state=42).iterrows():
            pred = pipeline.predict([row['text']])[0]
            logging.info(f"\nSubject: {row['subject']}")
            logging.info(f"Actual: {row['tech']}")
            logging.info(f"Predicted: {pred}")
            logging.info("-" * 50)
            
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    train_model()

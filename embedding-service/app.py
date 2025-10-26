from flask import Flask, request, jsonify
from fastembed import TextEmbedding
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize FastEmbed model
# Using intfloat/multilingual-e5-large for multilingual support (Turkish + English)
# 1024 dimensions, excellent multilingual performance
MODEL_NAME = os.getenv('MODEL_NAME', 'intfloat/multilingual-e5-large')
logger.info(f"Loading embedding model: {MODEL_NAME}")

try:
    embedding_model = TextEmbedding(model_name=MODEL_NAME)
    logger.info("Embedding model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL_NAME
    }), 200

@app.route('/embed', methods=['POST'])
def embed():
    """
    Generate embedding from note title and content.
    
    Request body:
    {
        "title": "Note title",
        "content": "Note content in markdown"
    }
    
    Response:
    {
        "embedding": [0.1, 0.2, ...],
        "dimension": 1024
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        title = data.get('title', '')
        content = data.get('content', '')
        
        if not title and not content:
            return jsonify({'error': 'Both title and content are empty'}), 400
        
        # Combine title and content with more weight on title
        # Title is repeated to give it more importance
        combined_text = f"{title} {title} {content}"
        
        logger.info(f"Generating embedding for text (length: {len(combined_text)} chars)")
        
        # Generate embedding
        embeddings = list(embedding_model.embed([combined_text]))
        
        if not embeddings or len(embeddings) == 0:
            return jsonify({'error': 'Failed to generate embedding'}), 500
        
        # Convert numpy array to list for JSON serialization
        embedding_vector = embeddings[0].tolist()
        
        logger.info(f"Embedding generated successfully (dimension: {len(embedding_vector)})")
        
        return jsonify({
            'embedding': embedding_vector,
            'dimension': len(embedding_vector)
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8081))
    app.run(host='0.0.0.0', port=port, debug=False)

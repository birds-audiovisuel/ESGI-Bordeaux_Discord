from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
import bcrypt
import jwt
import datetime
from mygesapi import MyGesClient
import logging

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'your-secret-key')

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store temporaire des clients authentifiés (en production, utiliser Redis)
authenticated_clients = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.datetime.now().isoformat()})

@app.route('/auth', methods=['POST'])
def authenticate_user():
    """Authentifie un utilisateur via MyGES et retourne ses informations"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({"error": "Username and password required"}), 400
        
        username = data['username']
        password = data['password']
        
        # Tentative de connexion à MyGES
        try:
            client = MyGesClient(name=username, password=password)
            profile = client.getProfile()
            
            if not profile:
                return jsonify({"error": "Authentication failed - Invalid credentials"}), 401
                
        except Exception as myges_error:
            logger.error(f"MyGES authentication error: {str(myges_error)}")
            return jsonify({"error": "Authentication failed - MyGES service error"}), 401
        
        # Extraction des informations utilisateur
        user_info = {
            "username": username,
            "first_name": profile.get('firstName', ''),
            "last_name": profile.get('lastName', ''), 
            "email": profile.get('email', ''),
            "school": profile.get('school', ''),
            "class": profile.get('class', ''),
            "year": profile.get('year', ''),
            "student_id": profile.get('studentId', ''),
            "is_teacher": profile.get('isTeacher', False)
        }
        
        # Génération d'un token JWT
        token_payload = {
            'user_id': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')
        
        # Stockage temporaire du client (pour les futures requêtes)
        authenticated_clients[username] = {
            'client': client,
            'profile': user_info,
            'timestamp': datetime.datetime.now()
        }
        
        logger.info(f"User authenticated successfully: {username}")
        
        return jsonify({
            "success": True,
            "token": token,
            "user": user_info
        })
        
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/user/<username>/agenda', methods=['GET'])
def get_user_agenda(username):
    """Récupère l'agenda d'un utilisateur authentifié"""
    try:
        # Vérification du token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
            
        token = auth_header.split(' ')[1]
        
        try:
            jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        # Vérification de l'utilisateur authentifié
        if username not in authenticated_clients:
            return jsonify({"error": "User not authenticated"}), 401
            
        client_data = authenticated_clients[username]
        client = client_data['client']
        
        # Récupération de l'agenda
        agenda = client.getAgenda()
        
        return jsonify({
            "success": True,
            "agenda": agenda
        })
        
    except Exception as e:
        logger.error(f"Error fetching agenda for {username}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/user/<username>/grades', methods=['GET'])
def get_user_grades(username):
    """Récupère les notes d'un utilisateur authentifié"""
    try:
        # Vérification du token (même logique que pour l'agenda)
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
            
        token = auth_header.split(' ')[1]
        
        try:
            jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        if username not in authenticated_clients:
            return jsonify({"error": "User not authenticated"}), 401
            
        client_data = authenticated_clients[username]
        client = client_data['client']
        
        # Récupération des notes
        grades = client.getGrades()
        
        return jsonify({
            "success": True,
            "grades": grades
        })
        
    except Exception as e:
        logger.error(f"Error fetching grades for {username}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/cleanup', methods=['POST'])
def cleanup_sessions():
    """Nettoie les sessions expirées (à appeler périodiquement)"""
    try:
        current_time = datetime.datetime.now()
        expired_users = []
        
        for username, data in authenticated_clients.items():
            if (current_time - data['timestamp']).total_seconds() > 86400:  # 24h
                expired_users.append(username)
        
        for username in expired_users:
            del authenticated_clients[username]
            
        logger.info(f"Cleaned up {len(expired_users)} expired sessions")
        
        return jsonify({"success": True, "cleaned_sessions": len(expired_users)})
        
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting MyGES API Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
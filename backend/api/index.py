import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from a .env file
load_dotenv()

app = Flask(__name__)

# --- CORS Configuration ---
# IMPORTANT: Replace this with your actual GitHub Pages URL after deployment
github_pages_url = "https://bodhit-kukra.github.io" 
CORS(app, resources={r"/api/*": {"origins": [github_pages_url, "http://127.0.0.1:5500"]}}) # Allow local testing

# --- API Keys and Configuration ---
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

try:
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    else:
        print("Warning: GOOGLE_API_KEY not found. Generative AI features will be disabled.")
except Exception as e:
    print(f"Error configuring Google Generative AI: {e}")

# --- API Endpoint ---
@app.route('/api/process-command', methods=['POST'])
def process_command_endpoint():
    if not request.json or 'command' not in request.json:
        return jsonify({"error": "Request must be JSON with a 'command' field."}), 400

    command = request.json['command'].lower().strip()
    response_data = {}

    # --- Command Processing Logic ---
    if command.startswith("open"):
        site = command.replace("open", "").strip()
        sites = {"youtube": "https://www.youtube.com", "google": "https://www.google.com", "facebook": "https://www.facebook.com", "instagram": "https://www.instagram.com"}
        if site in sites:
            response_data = {"action": "open_url", "url": sites[site], "speak": f"Opening {site}."}
        else:
            response_data = {"speak": f"Sorry, I don't know how to open {site}."}

    elif "news" in command:
        if not NEWS_API_KEY:
            response_data = {"speak": "Sorry, the News API key is not configured on the server."}
        else:
            url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={NEWS_API_KEY}"
            try:
                response = requests.get(url)
                response.raise_for_status() # Raise an exception for bad status codes
                news_data = response.json()
                articles = news_data.get("articles", [])[:5] # Get top 5
                response_data = {"action": "display_news", "articles": articles, "speak": "Here are the top 5 news headlines."}
            except requests.exceptions.RequestException as e:
                response_data = {"speak": f"Sorry, I failed to fetch the news. Error: {e}"}

    elif "play" in command:
        # For simplicity, we'll just search YouTube
        query = command.replace("play", "").strip()
        speak_text = f"Playing {query} on YouTube."
        url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
        response_data = {"action": "open_url", "url": url, "speak": speak_text}
        
    else:
        # --- Fallback to Google Gemini ---
        if not GOOGLE_API_KEY:
            response_data = {"speak": "I am not configured to handle that request."}
        else:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash-latest')
                ai_response = model.generate_content(command)
                response_data = {"speak": ai_response.text}
            except Exception as e:
                print(f"Gemini API Error: {e}")
                response_data = {"speak": "I'm having trouble connecting to my brain right now."}

    return jsonify(response_data)

# Root route for testing
@app.route('/')
def home():
    return "Backend is running!"
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/process_apitts', methods=['POST'])
def process_apitts():
    data = request.json
    text = data.get('text')
    language = data.get('language')
    
    file_path = r"C:\Users\iCri1\projects\cloner\static\voicelist\0712-000938-simba1.wav"

    with open(file_path, 'rb') as audio_file:
        response = requests.post(
            "http://127.0.0.1:9988/apitts",
            data={"text": text, "language": language},
            files={"audio":open(r"C:\Users\iCri1\projects\cloner\static\voicelist\0712-000938-simba1.wav","rb")
        )
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(port=5000)

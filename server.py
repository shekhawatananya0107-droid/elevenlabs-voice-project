"""
ElevenLabs Text-to-Speech Studio - Backend Server
Zero external dependencies (uses standard Python 3 libraries).
Securely manages the ELEVENLABS_API_KEY environment variable.
"""

import http.server
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent

def load_env_file():
    """Load variables from .env file into os.environ if present."""
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()
                    # Strip wrapping quotes
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    # Set into os.environ if not already defined in system environment
                    if key and not os.environ.get(key):
                        os.environ[key] = val
    except Exception as e:
        print(f"[Warning] Error reading .env file: {e}", file=sys.stderr)

# Load .env on startup
load_env_file()

PORT = int(os.environ.get("PORT", 5000))

class TTSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, xi-api-key")

    def _send_json(self, status_code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        # Reload .env in case user modified it while server is running
        load_env_file()

        # API health & configuration check endpoint
        if self.path == "/api/config" or self.path.startswith("/api/config?"):
            api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
            has_key = bool(api_key and api_key != "your_elevenlabs_api_key_here")
            self._send_json(200, {
                "status": "ok",
                "hasApiKey": has_key,
                "message": "API key is loaded from environment variable" if has_key else "No API key configured in .env"
            })
            return

        # Serve static files
        super().do_GET()

    def do_POST(self):
        # Reload .env in case user updated it
        load_env_file()

        if self.path == "/api/tts" or self.path.startswith("/api/tts?"):
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._send_json(400, {"error": "Missing request body."})
                return

            try:
                body_bytes = self.rfile.read(content_length)
                payload = json.loads(body_bytes.decode("utf-8"))
            except Exception as e:
                self._send_json(400, {"error": f"Invalid JSON payload: {str(e)}"})
                return

            text = payload.get("text", "").strip()
            if not text:
                self._send_json(400, {"error": "Text cannot be empty."})
                return

            voice_id = payload.get("voiceId", "21m00Tcm4TlvDq8ikWAM").strip()
            model_id = payload.get("modelId", "eleven_multilingual_v2").strip()
            stability = float(payload.get("stability", 0.50))
            similarity_boost = float(payload.get("similarityBoost", 0.75))

            # Retrieve API key: optional client override or environment variable
            client_key = payload.get("apiKey", "").strip() if payload.get("apiKey") else ""
            env_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
            api_key = client_key if client_key else env_key

            if not api_key or api_key == "your_elevenlabs_api_key_here":
                self._send_json(400, {
                    "error": "No ElevenLabs API key found! Please set ELEVENLABS_API_KEY in your .env file or environment variable."
                })
                return

            # Call ElevenLabs API
            eleven_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            req_data = {
                "text": text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": stability,
                    "similarity_boost": similarity_boost
                }
            }
            json_data = json.dumps(req_data).encode("utf-8")

            req = urllib.request.Request(
                eleven_url,
                data=json_data,
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    audio_data = resp.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "audio/mpeg")
                    self.send_header("Content-Length", str(len(audio_data)))
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(audio_data)
            except urllib.error.HTTPError as http_err:
                err_body = http_err.read().decode("utf-8", errors="replace")
                err_msg = f"ElevenLabs API Error ({http_err.code})"
                try:
                    err_json = json.loads(err_body)
                    if isinstance(err_json, dict):
                        detail = err_json.get("detail")
                        if isinstance(detail, dict) and "message" in detail:
                            err_msg = detail["message"]
                        elif isinstance(detail, str):
                            err_msg = detail
                        elif "message" in err_json:
                            err_msg = err_json["message"]
                except Exception:
                    if err_body:
                        err_msg = f"{err_msg}: {err_body[:200]}"

                if http_err.code == 401:
                    err_msg = "Invalid ElevenLabs API Key. Please verify your key in the .env file."
                elif http_err.code == 429:
                    err_msg = "ElevenLabs quota exceeded or rate limit reached on your account."

                self._send_json(http_err.code, {"error": err_msg})
            except urllib.error.URLError as url_err:
                self._send_json(503, {"error": f"Failed to connect to ElevenLabs API: {url_err.reason}"})
            except Exception as ex:
                self._send_json(500, {"error": f"Internal server error: {str(ex)}"})
            return

        self._send_json(404, {"error": "Endpoint not found."})

def run():
    # Ensure UTF-8 output in Windows consoles
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, TTSRequestHandler)
    print("=" * 60)
    print("  [ElevenLabs Text-to-Speech Studio Server]")
    print(f"  Local Address: http://localhost:{PORT}")
    has_key = bool(os.environ.get("ELEVENLABS_API_KEY", "").strip())
    if has_key:
        print("  [OK] Environment variable: ELEVENLABS_API_KEY is detected")
    else:
        print("  [Notice] Environment variable: ELEVENLABS_API_KEY is NOT set in .env")
        print("           Add your key to the .env file to enable ElevenLabs TTS.")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run()

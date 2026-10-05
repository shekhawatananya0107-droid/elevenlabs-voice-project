# 🎙️ ElevenLabs Text-to-Speech Studio

A modern, high-performance web application built with **HTML**, **CSS**, and **JavaScript** to convert written text into lifelike speech using the **ElevenLabs API**, featuring secure environment variable handling so API keys are never exposed in frontend code or committed to GitHub.

---

## 📁 Project Structure

```text
├── index.html        # Clean studio UI, accessible controls, and audio player
├── style.css         # Modern dark studio styling, glassmorphism, responsive layout
├── script.js         # Frontend logic, TTS request handling, and voice/model controls
├── server.py         # Lightweight local proxy server (securely loads ELEVENLABS_API_KEY)
├── run.bat           # 1-click Windows runner to start the server
├── .env.example      # Example environment variables template
├── .env              # Local environment configuration file (git-ignored for security)
├── .gitignore        # Prevents committing secrets or .env to version control
└── README.md         # Documentation and quick start guide
```

---

## 🔒 Security Best Practice: Environment Variable Integration

Your ElevenLabs API key is a secret credential. In this project:
- **No API keys are hard-coded** into HTML, CSS, or JavaScript.
- Secrets are stored in your local `.env` file or OS environment variables (`ELEVENLABS_API_KEY`).
- `.gitignore` automatically prevents `.env` and secret files from being committed to GitHub.
- `server.py` securely proxies Text-to-Speech requests to ElevenLabs on the backend, attaching your API key server-side before returning audio to the browser.

---

## 🚀 Quick Start Guide

### 1. Add Your ElevenLabs API Key

1. Get your API key from [elevenlabs.io](https://elevenlabs.io) (Profile Settings → API Keys).
2. Open the `.env` file in the project directory.
3. Paste your key:
   ```env
   ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
   PORT=5000
   ```

### 2. Start the App

You can start the app in either of two ways:

#### Option A: 1-Click Launch (Recommended)
Double-click `run.bat` or run in terminal:
```bash
python server.py
```
Then open **[http://localhost:5000](http://localhost:5000)** in your browser.

#### Option B: VS Code Live Server
If you prefer running the frontend via VS Code's **Live Server** extension (`http://127.0.0.1:5500`):
1. Start `python server.py` in your terminal.
2. Click **"Go Live"** in VS Code.
3. The frontend will automatically detect and connect to the local secure backend server via CORS.

---

## ✨ Features

- **Secure Environment Variable Proxy:** Uses `ELEVENLABS_API_KEY` from `.env` via a lightweight zero-dependency Python backend.
- **Voice Selection Dropdown:** Choose from popular ElevenLabs voices (Rachel, Adam, Antoni, Bella, Domi, Elli, Josh, Nicole).
- **Model Selection Dropdown:** Choose between `eleven_multilingual_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2_5`, and `eleven_monolingual_v1`.
- **Large Text Input:** Includes real-time character counting, quick preset sample buttons (Welcome, Story, Quote), and a clear button.
- **Audio Player & Downloader:** Built-in audio player with equalizer wave animation and a one-click MP3 download link.
- **Voice Fine-Tuning:** Collapsible stability and clarity sliders for fine-tuning voice output.
- **Error Handling & Feedback:** Clean status notifications for API rate limits, invalid keys, or success states.
- **Preserved Design:** Sleek dark studio aesthetic with glowing accents, glassmorphic cards, and responsive layout.

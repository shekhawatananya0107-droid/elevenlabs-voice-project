/**
 * ==========================================================================
 * ElevenLabs Text-to-Speech Web App
 * Secure JavaScript Integration via Environment Variables
 * ==========================================================================
 * 
 * Security Notice:
 * The ElevenLabs API key is loaded securely from the environment variable
 * ELEVENLABS_API_KEY (in your local .env file) via server.py.
 * It is NEVER hard-coded into client files or exposed to version control.
 */

// Preset sample texts for quick testing
const SAMPLES = {
  welcome: "Welcome to the ElevenLabs Text to Speech Studio! Type any text you want, select your favorite voice, and hit Play to hear high-quality AI speech.",
  story: "The ancient library was silent except for the whisper of pages turning in the gentle evening breeze. A mysterious golden glow emanated from an unopened book on the center table.",
  quote: "Technology is best when it brings people together. Artificial intelligence is not a substitute for human creativity, but an amplifier of human potential."
};

// --- DOM ELEMENTS ---
const apiKeyInput = document.getElementById("apiKeyInput");
const apiKeyStatusHint = document.getElementById("apiKeyStatusHint");
const toggleApiKeyBtn = document.getElementById("toggleApiKeyVisibility");
const voiceSelect = document.getElementById("voiceSelect");
const modelSelect = document.getElementById("modelSelect");
const textInput = document.getElementById("textInput");
const clearBtn = document.getElementById("clearBtn");
const charCount = document.getElementById("charCount");
const stabilitySlider = document.getElementById("stabilitySlider");
const stabilityVal = document.getElementById("stabilityVal");
const claritySlider = document.getElementById("claritySlider");
const clarityVal = document.getElementById("clarityVal");
const playBtn = document.getElementById("playBtn");
const playBtnText = document.getElementById("playBtnText");
const playIcon = document.getElementById("playIcon");
const loadingSpinner = document.getElementById("loadingSpinner");
const statusMessage = document.getElementById("statusMessage");
const statusIcon = document.getElementById("statusIcon");
const statusText = document.getElementById("statusText");
const audioPlayerContainer = document.getElementById("audioPlayerContainer");
const audioElement = document.getElementById("audioElement");
const downloadAudioBtn = document.getElementById("downloadAudioBtn");

// Track current audio URL for cleanup
let currentAudioUrl = null;

// Backend server connection state
let backendState = {
  connected: false,
  baseUrl: "",
  hasApiKey: false
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
  // Load saved custom key from localStorage if user previously entered an override
  const savedKey = localStorage.getItem("elevenlabs_custom_key");
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }

  // Update initial character count
  updateCharCount();

  // Set up event listeners
  setupEventListeners();

  // Check backend server & environment variable status
  await checkBackendStatus();
});

// --- BACKEND HEALTH & CONFIG CHECK ---
async function checkBackendStatus() {
  const candidates = [
    "",                     // Relative URL (when served from server.py)
    "http://localhost:5000", // When served from Live Server (http://127.0.0.1:5500)
    "http://127.0.0.1:5000"
  ];

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/api/config`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        backendState = {
          connected: true,
          baseUrl: base,
          hasApiKey: Boolean(data.hasApiKey)
        };

        updateKeyStatusUI();
        return backendState;
      }
    } catch {
      // Continue to next candidate
    }
  }

  backendState = {
    connected: false,
    baseUrl: "",
    hasApiKey: false
  };

  updateKeyStatusUI();
  return backendState;
}

// Update UI elements based on backend environment variable status
function updateKeyStatusUI() {
  if (!apiKeyStatusHint) return;

  if (backendState.connected) {
    if (backendState.hasApiKey) {
      apiKeyStatusHint.innerHTML = "🔒 <strong>Secure:</strong> Key loaded from environment (<code>.env</code>)";
      if (!apiKeyInput.value) {
        apiKeyInput.placeholder = "•••••••••••••••• (Active via .env — enter here only to override)";
      }
    } else {
      apiKeyStatusHint.innerHTML = "⚠️ <strong>Notice:</strong> Add <code>ELEVENLABS_API_KEY</code> to <code>.env</code>";
      if (!apiKeyInput.value) {
        apiKeyInput.placeholder = "Paste your ElevenLabs API Key here or add to .env...";
      }
    }
  } else {
    apiKeyStatusHint.innerHTML = "💡 <strong>Tip:</strong> Run <code>python server.py</code> to use your secure <code>.env</code> key";
    if (!apiKeyInput.value) {
      apiKeyInput.placeholder = "Paste your ElevenLabs API Key here (or run server.py for .env)...";
    }
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Save custom override key to localStorage if entered
  apiKeyInput.addEventListener("input", (e) => {
    const key = e.target.value.trim();
    if (key) {
      localStorage.setItem("elevenlabs_custom_key", key);
    } else {
      localStorage.removeItem("elevenlabs_custom_key");
      updateKeyStatusUI();
    }
  });

  // Toggle API key visibility
  toggleApiKeyBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleApiKeyBtn.setAttribute("title", isPassword ? "Hide API key" : "Show API key");
  });

  // Character counter
  textInput.addEventListener("input", updateCharCount);

  // Clear text button
  clearBtn.addEventListener("click", () => {
    textInput.value = "";
    updateCharCount();
    textInput.focus();
  });

  // Sample prompt buttons
  document.querySelectorAll(".chip-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const sampleKey = button.getAttribute("data-sample");
      if (SAMPLES[sampleKey]) {
        textInput.value = SAMPLES[sampleKey];
        updateCharCount();
      }
    });
  });

  // Sliders display values
  stabilitySlider.addEventListener("input", (e) => {
    stabilityVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  claritySlider.addEventListener("input", (e) => {
    clarityVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  // Main Play Button click
  playBtn.addEventListener("click", handlePlayClick);

  // Audio animation visualizer state
  audioElement.addEventListener("play", () => {
    audioPlayerContainer.classList.add("is-playing");
  });

  audioElement.addEventListener("pause", () => {
    audioPlayerContainer.classList.remove("is-playing");
  });

  audioElement.addEventListener("ended", () => {
    audioPlayerContainer.classList.remove("is-playing");
  });
}

// --- HELPER FUNCTIONS ---

function updateCharCount() {
  const currentLength = textInput.value.length;
  const maxLength = textInput.getAttribute("maxlength") || 2500;
  charCount.textContent = `${currentLength} / ${maxLength}`;
}

function showStatus(message, type = "info") {
  statusMessage.className = `status-banner status-${type}`;
  statusText.textContent = message;

  if (type === "error") {
    statusIcon.textContent = "⚠️";
  } else if (type === "success") {
    statusIcon.textContent = "✅";
  } else {
    statusIcon.textContent = "ℹ️";
  }

  statusMessage.style.display = "flex";
}

function hideStatus() {
  statusMessage.style.display = "none";
}

function setLoading(isLoading) {
  if (isLoading) {
    playBtn.disabled = true;
    playBtnText.textContent = "Generating Speech...";
    playIcon.classList.add("hidden");
    loadingSpinner.classList.remove("hidden");
  } else {
    playBtn.disabled = false;
    playBtnText.textContent = "Generate & Play";
    playIcon.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
  }
}

// --- MAIN TTS HANDLER ---
async function handlePlayClick() {
  hideStatus();

  const text = textInput.value.trim();
  if (!text) {
    showStatus("Please enter some text to convert into speech.", "error");
    textInput.focus();
    return;
  }

  const voiceId = voiceSelect.value;
  const modelId = modelSelect.value;
  const voiceName = voiceSelect.options[voiceSelect.selectedIndex].text.split(" ")[0];
  const stability = parseFloat(stabilitySlider.value);
  const similarityBoost = parseFloat(claritySlider.value);
  const customApiKey = apiKeyInput.value.trim();

  // If backend status hasn't been checked yet or was disconnected, check again
  if (!backendState.connected) {
    await checkBackendStatus();
  }

  // Check if we have an API key from either source
  const hasServerKey = backendState.connected && backendState.hasApiKey;
  const hasClientKey = Boolean(customApiKey);

  if (!hasServerKey && !hasClientKey) {
    if (!backendState.connected) {
      showStatus(
        "Backend server is not running. Start it with 'python server.py' to use your .env API key, or paste your ElevenLabs key above.",
        "error"
      );
    } else {
      showStatus(
        "ElevenLabs API key is missing. Please add ELEVENLABS_API_KEY to your .env file or paste your key into the field above.",
        "error"
      );
    }
    return;
  }

  setLoading(true);
  showStatus(`Contacting ElevenLabs API (${voiceName})...`, "info");

  try {
    const audioBlob = await requestTTSAudio({
      text,
      voiceId,
      modelId,
      stability,
      similarityBoost,
      apiKey: customApiKey
    });

    // Cleanup existing object URL to prevent memory leaks
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }

    // Create object URL from audio Blob
    currentAudioUrl = URL.createObjectURL(audioBlob);

    // Update audio player and controls
    audioElement.src = currentAudioUrl;
    audioPlayerContainer.classList.remove("hidden");

    // Configure download button
    downloadAudioBtn.href = currentAudioUrl;
    downloadAudioBtn.download = `elevenlabs_${voiceName.toLowerCase()}.mp3`;

    // Start playback
    await audioElement.play();

    showStatus(`Speech generated successfully using ${voiceName}!`, "success");
  } catch (error) {
    console.error("ElevenLabs TTS Error:", error);
    showStatus(error.message || "Failed to generate speech. Please check your API key and connection.", "error");
  } finally {
    setLoading(false);
  }
}

/**
 * Requests speech audio from the secure backend proxy,
 * falling back to direct API call if custom key is provided and backend is offline.
 */
async function requestTTSAudio({ text, voiceId, modelId, stability, similarityBoost, apiKey }) {
  // If backend is connected, use the secure backend proxy
  if (backendState.connected) {
    const endpoint = `${backendState.baseUrl}/api/tts`;
    const payload = {
      text,
      voiceId,
      modelId,
      stability,
      similarityBoost
    };

    if (apiKey) {
      payload.apiKey = apiKey;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errorMessage = errJson.error;
        }
      } catch {
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.blob();
  }

  // Direct client call fallback (only if user explicitly provided a key and backend is offline)
  if (apiKey) {
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost
        }
      })
    });

    if (!response.ok) {
      let errorMessage = `ElevenLabs API error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail && errorJson.detail.message) {
          errorMessage = errorJson.detail.message;
        } else if (errorJson && errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        errorMessage = `${response.status}: ${response.statusText}`;
      }

      if (response.status === 401) {
        errorMessage = "Invalid ElevenLabs API key. Please verify your key.";
      } else if (response.status === 429) {
        errorMessage = "ElevenLabs quota exceeded or rate limit reached.";
      }

      throw new Error(errorMessage);
    }

    return await response.blob();
  }

  throw new Error("No backend server or API key available.");
}

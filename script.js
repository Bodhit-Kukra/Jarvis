// --- Get references to HTML elements ---
const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');
const commandTextDiv = document.getElementById('command-text');
const newsContainer = document.getElementById('news-container');

// --- IMPORTANT: Update this after deploying your backend ---
const VERCEL_BACKEND_URL = "https://your-app-name.vercel.app/api/process-command";

// --- Web Speech API Initialization ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

// --- Speak Function ---
function speak(text) {
    if (synth.speaking) {
        synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1;
    utterance.rate = 1;
    // Log to console for debugging
    console.log(`Jarvis says: "${text}"`);
    synth.speak(utterance);
}

// --- NEW Function to handle responses from the backend ---
async function handleBackendResponse(data) {
    // 1. Speak the response
    if (data.speak) {
        speak(data.speak);
    }

    // 2. Perform any required actions
    if (data.action === "open_url" && data.url) {
        window.open(data.url, "_blank");
    }

    if (data.action === "display_news" && data.articles) {
        displayNews(data.articles);
    }
}

// --- Function to call the backend API ---
async function processCommand(command) {
    commandTextDiv.textContent = `You said: "${command}"`;

    if (!command.toLowerCase().includes("jarvis")) {
        speak("Please start your command with 'Jarvis'.");
        return;
    }

    // Remove "Jarvis" from the command
    const userRequest = command.toLowerCase().replace("jarvis", "").trim();
    if (!userRequest) {
        speak("Yes? How can I help?");
        return;
    }
    
    statusDiv.textContent = "Processing...";

    try {
        const response = await fetch(VERCEL_BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: userRequest })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        handleBackendResponse(data);

    } catch (error) {
        console.error("Error calling backend:", error);
        speak("Sorry, I'm having trouble connecting to the server.");
    } finally {
        statusDiv.textContent = 'Click the button and say "Jarvis" followed by your command.';
    }
}

// --- Function to display news articles ---
function displayNews(articles) {
    newsContainer.innerHTML = ""; // Clear previous news
    
    // Speak the headlines first
    articles.forEach(article => {
        speak(article.title);
    });

    // Then display the cards
    articles.forEach(article => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.innerHTML = `
            <h3>${article.title}</h3>
            <p>${article.description || 'No description available.'}</p>
            <a href="${article.url}" target="_blank">Read Full Article</a>
        `;
        newsContainer.appendChild(newsCard);
    });
}

// --- Event Listeners and Initial Setup ---
if (recognition) {
    startBtn.addEventListener('click', () => {
        statusDiv.textContent = "Listening...";
        commandTextDiv.textContent = "";
        newsContainer.innerHTML = ""; // Clear news when starting
        recognition.start();
    });

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript;
        processCommand(command);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        statusDiv.textContent = "Error in recognition. Please try again.";
    };
} else {
    const errorMsg = "Sorry, your browser does not support Speech Recognition.";
    statusDiv.textContent = errorMsg;
    startBtn.disabled = true;
    speak(errorMsg);
}

// Initial greeting
setTimeout(() => {
    speak("Jarvis is online and ready.");
}, 500);
// ========================================
// קבלת האלמנטים מה-HTML
// ========================================

const landing =
    document.getElementById("landing");

const result =
    document.getElementById("result");

const recordButton =
    document.getElementById("recordButton");

const buttonText =
    document.getElementById("buttonText");

const status =
    document.getElementById("status");

const backButton =
    document.getElementById("backButton");

const againButton =
    document.getElementById("againButton");

const buttonIcon =
    document.getElementById("iconButton");

const spinner =
    document.getElementById("loading");


// ========================================
// לחיצה על כפתור ההקלטה
// ========================================

recordButton.addEventListener(
    "click",
    startRecording
);

const server_url = "https://songfind.onrender.com"
// const server_url = "https://192.168.68.50:8000"

let mediaRecorder;
let audioChunks = [];
let server_response;
let to_know;

async function startRecording() {

    // מונע לחיצות כפולות

    if (recordButton.disabled) {
        return;
    }


    recordButton.disabled = true;

    try {
        // Ask for microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 48000,
                sampleSize: 16,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        audioChunks = [];
        let options = {};

        if (MediaRecorder.isTypeSupported('audio/mp4')) {
            // תואם אייפון (iOS) ומכשירים חדישים
            options = { mimeType: 'audio/mp4' };
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            // תואם אנדרואיד / כרום
            options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
        }

        console.log("Using mimeType:", options.mimeType || "Default");
        // Create recorder
        mediaRecorder = new MediaRecorder(stream);

        // Collect audio data
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        // When recording stops
        mediaRecorder.onstop = () => {

            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });

            // Stop microphone
            stream.getTracks().forEach(track => track.stop());
            if (audioBlob.size === 0) {
                alert("קובץ האודיו ריק. ודא שהמיקרופון בטלפון אינו חסום.");
                return;
            }

            create_audioPlayer(audioBlob);

            const extension = mediaRecorder.mimeType.includes("mp4") ? "mp4" : "webm";

            send_audio(audioBlob, extension);
        };

        // Start recording
        mediaRecorder.start();


        // Change screen state
        landing.classList.add("listening");


        buttonText.textContent =
            "מקשיב...";


        status.textContent =
            "מקשיב לשיר...";


        setTimeout(() => {

            if (mediaRecorder.state === "recording") {
                status.textContent = "ההקלטה הסתיימה";
                landing.classList.remove("listening");
                buttonText.textContent = "הקלט";
                spinner.classList.remove("hidden");
                buttonIcon.classList.add("hidden");
                buttonText.classList.add("hidden");

                mediaRecorder.stop();
            }

        }, 11000);
    } catch (error) {
        // 3. טיפול במצב שבו המשתמש סירב למיקרופון
        console.error("גישה למיקרופון נדחתה או נכשלה:", error);
        status.textContent = "יש לאשר גישה למיקרופון כדי להקליט";
        // recordButton.disabled = false;
    }
}

function create_audioPlayer(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    // בדיקה אם כבר קיים נגן ישן על המסך והסרתו
    const oldPlayer = document.getElementById("audio-preview");
    if (oldPlayer) oldPlayer.remove();

    // יצירת אלמנט נגן חדש
    const audioPlayer = document.createElement("audio");
    audioPlayer.id = "audio-preview";
    audioPlayer.src = audioUrl;
    audioPlayer.controls = true; // מציג כפתורי פליי/עצירה/זמן ומאפשר למשתמש לנגן באופן ידני
    audioPlayer.style.marginTop = "15px";
    audioPlayer.style.width = "100%"; // שיתאים למסך הטלפון

    // הוספת הנגן מתחת לטקסט המצב (או בכל מקום אחר שתבחר ב-HTML שלך)
    status.after(audioPlayer);
}

async function send_audio(audioBlob, extension) {

    const formData = new FormData();
    formData.append("file", audioBlob, `recording.${extension}`);
    try {

        const serverUrl = server_url + "/upload-audio";

        const response = await fetch(serverUrl, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`שגיאת שרת: ${response.status}`);
        }

        const data = await response.json();
        console.log("תשובת השרת:", data);
        server_response = data;

        spinner.classList.add("hidden");

        buttonIcon.classList.remove("hidden");

        buttonText.classList.remove("hidden");

        showResult();

        status.textContent = "הקובץ נשלח ונקלט בהצלחה בשרת!";

    } catch (error) {
        console.error("שגיאה בשליחת הקובץ ל-FastAPI:", error);
        status.textContent = "נכשלה שליחת הקובץ לשרת";
    }

}


// ========================================
// הצגת תוצאת הזיהוי
// ========================================

function showResult() {

    // מסתירים את דף הבית

    landing.classList.add("hidden");


    // מציגים את דף התוצאה

    result.classList.remove("hidden");

    const song_title =
        document.getElementById("song-title");
    const artist =
        document.getElementById("artist");

    const to_know = document.getElementById("to-know");

    const success_label = document.getElementById("success-label");

    song_title.textContent = server_response.title;
    artist.textContent = server_response.artist;
    to_know.textContent = server_response.to_know;

    if (server_response.recognized == false)
        success_label.textContent = "הזיהוי נכשל";

    // מחזירים את הכפתור למצב רגיל

    landing.classList.remove("listening");

    recordButton.disabled = false;

    buttonText.textContent =
        "הקלט";
}


// ========================================
// חזרה לדף הבית
// ========================================

function showLanding() {

    result.classList.add("hidden");

    landing.classList.remove("hidden");

    recordButton.disabled = false;

    status.textContent =
        "לחץ על הכפתור כדי להתחיל";
}


// ========================================
// כפתור חזרה
// ========================================

backButton.addEventListener(
    "click",
    showLanding
);


// ========================================
// זיהוי שיר נוסף
// ========================================

againButton.addEventListener(
    "click",
    showLanding
);
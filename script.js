// Inisialisasi elemen HTML
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const gestureResult = document.getElementById('gesture-result');
const startBtn = document.getElementById('startBtn');

// Flag untuk menghindari pengulangan suara
let lastPalmDetected = false;
let lastSpeechTime = 0;
const SPEECH_COOLDOWN = 3000; // 3 detik cooldown

// Inisialisasi MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

// Konfigurasi MediaPipe Hands
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Fungsi untuk mendeteksi apakah telapak tangan terbuka
function isPalmOpen(landmarks) {
    // Ambil titik-titik penting
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    // Ambil titik pangkal jari
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const ringMcp = landmarks[13];
    const pinkyMcp = landmarks[17];
    
    // Hitung jarak ujung jari ke pangkal jari
    const indexDist = Math.abs(indexTip.y - indexMcp.y);
    const middleDist = Math.abs(middleTip.y - middleMcp.y);
    const ringDist = Math.abs(ringTip.y - ringMcp.y);
    const pinkyDist = Math.abs(pinkyTip.y - pinkyMcp.y);
    
    // Hitung jarak ibu jari
    const thumbDist = Math.abs(thumbTip.x - thumbIp.x);
    
    // Telapak tangan terbuka jika semua jari terentang
    const isOpen = indexDist > 0.15 && middleDist > 0.15 && 
                   ringDist > 0.15 && pinkyDist > 0.15 && thumbDist > 0.05;
    
    return isOpen;
}

// Fungsi untuk memutar suara
function speak(text) {
    return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = resolve;
        utterance.onerror = reject;
        window.speechSynthesis.speak(utterance);
    });
}

// Fungsi untuk memainkan suara dengan cooldown
async function playVoiceMessage() {
    const now = Date.now();
    if (now - lastSpeechTime >= SPEECH_COOLDOWN) {
        lastSpeechTime = now;
        await speak("Hai, saya adalah ZimeMajesty, saya adalah programmer pemula");
        return true;
    }
    return false;
}

// Handler untuk hasil deteksi tangan
hands.onResults((results) => {
    // Bersihkan canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.drawImage(
        results.image, 0, 0, canvas.width, canvas.height
    );
    
    let isPalm = false;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Gambar landmark tangan
        for (const landmarks of results.multiHandLandmarks) {
            // Gambar titik-titik tangan
            for (const landmark of landmarks) {
                const x = landmark.x * canvas.width;
                const y = landmark.y * canvas.height;
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                canvasCtx.fillStyle = '#00ff00';
                canvasCtx.fill();
            }
            
            // Hubungkan titik-titik dengan garis
            const connections = [
                [0,1], [1,2], [2,3], [3,4],  // Ibu jari
                [0,5], [5,6], [6,7], [7,8],  // Telunjuk
                [0,9], [9,10], [10,11], [11,12], // Jari tengah
                [0,13], [13,14], [14,15], [15,16], // Jari manis
                [0,17], [17,18], [18,19], [19,20]  // Kelingking
            ];
            
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = '#00ff00';
            canvasCtx.lineWidth = 2;
            
            for (const connection of connections) {
                const start = landmarks[connection[0]];
                const end = landmarks[connection[1]];
                if (start && end) {
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(start.x * canvas.width, start.y * canvas.height);
                    canvasCtx.lineTo(end.x * canvas.width, end.y * canvas.height);
                    canvasCtx.stroke();
                }
            }
            
            // Deteksi apakah telapak tangan terbuka
            isPalm = isPalmOpen(landmarks);
        }
        
        if (isPalm) {
            statusText.textContent = "✅ Telapak tangan terdeteksi!";
            gestureResult.textContent = "🖐️ Telapak Tangan Terbuka";
            
            // Mainkan suara jika belum diputar baru-baru ini
            if (!lastPalmDetected) {
                playVoiceMessage();
                lastPalmDetected = true;
            }
        } else {
            statusText.textContent = "👆 Tangan terdeteksi, tapi bukan telapak terbuka";
            gestureResult.textContent = "✊ Gesture Lain";
            lastPalmDetected = false;
        }
    } else {
        statusText.textContent = "🔍 Tidak ada tangan terdeteksi";
        gestureResult.textContent = "-";
        lastPalmDetected = false;
    }
    
    canvasCtx.restore();
});

// Fungsi untuk memulai kamera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;
        
        // Tunggu video siap
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });
        
        // Set ukuran canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Inisialisasi kamera untuk MediaPipe
        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({image: video});
            },
            width: 640,
            height: 480
        });
        camera.start();
        
        statusText.textContent = "📷 Kamera aktif, tunjukkan telapak tangan!";
        startBtn.disabled = true;
        startBtn.textContent = "Kamera Aktif ✅";
        
    } catch (error) {
        console.error("Error accessing camera:", error);
        statusText.textContent = "❌ Gagal mengakses kamera";
        alert("Tidak dapat mengakses kamera. Pastikan Anda memberikan izin.");
    }
}

// Event listener untuk tombol mulai
startBtn.addEventListener('click', startCamera);

// Cek dukungan browser untuk speech synthesis
if (!window.speechSynthesis) {
    alert("Browser Anda tidak mendukung fitur suara. Silakan gunakan browser modern seperti Chrome, Edge, atau Safari.");
}

console.log("Aplikasi siap! Klik tombol 'Mulai Kamera' untuk memulai.");

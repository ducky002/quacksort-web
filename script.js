// Supabase Configuration - Now handled by supabase_client.js
// The supabase client is initialized globally in supabase_client.js

// ── Extract Event Code from URL ───────────────────────────────────────────
function getEventCodeFromURL() {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('eventCode') || '';
}

// Auto-fill invite code if passed in URL
window.addEventListener('load', () => {
    const eventCode = getEventCodeFromURL();
    if (eventCode) {
        const inviteCodeInput = document.getElementById('invite_code');
        if (inviteCodeInput) {
            inviteCodeInput.value = eventCode;
            inviteCodeInput.readOnly = true;  // Prevent user from changing it
        }
    }
});

// ── DOM Elements ──────────────────────────────────────────────────────────
const receiveBtn = document.getElementById('btn-receive-photos');
const receiveSection = document.getElementById('receive-section');
const closeReceiveBtn = document.querySelector('.btn-close-receive');
const registrationForm = document.getElementById('registration-form');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('face_photo');
const previewImg = document.getElementById('preview-img');
const filePreview = document.getElementById('file-preview');
const removeFileBtn = document.getElementById('remove-file');
const statusMsg = document.getElementById('status-message');

const btnCamera = document.getElementById('btn-camera');
const btnGallery = document.getElementById('btn-gallery');
const cameraContainer = document.getElementById('camera-container');
const cameraVideo = document.getElementById('camera-video');
const btnCapture = document.getElementById('btn-capture');
const btnCloseCamera = document.getElementById('btn-close-camera');
const cameraCanvas = document.getElementById('camera-canvas');
const uploadOptions = document.querySelector('.upload-options');

// ── UI Handlers: Receive Modal ────────────────────────────────────────────
if (receiveBtn) {
    receiveBtn.addEventListener('click', () => {
        receiveSection.style.display = 'flex';
    });
}

if (closeReceiveBtn) {
    closeReceiveBtn.addEventListener('click', () => {
        receiveSection.style.display = 'none';
    });
}

const connectBtn = document.querySelector('#receive-section .btn.primary');
const receiveInput = document.getElementById('receive-code');

if (connectBtn && receiveInput) {
    connectBtn.addEventListener('click', () => {
        let val = receiveInput.value.trim().toLowerCase();
        if (!val) return;

        // If it's a 6-character session code
        if (val.length === 6 && !val.includes('http')) {
            window.location.href = `receive.html?peer=quack-${val}`;
            return;
        }

        // If it's a full link, just go there
        if (val.includes('quacksort.com/receive.html')) {
            window.location.href = val;
            return;
        }

        alert("Please enter a valid 6-character session code or paste the full share link.");
    });
}

// ── UI Handlers: File Upload ──────────────────────────────────────────────
let stream = null;

if (btnCamera) {
    btnCamera.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            cameraVideo.srcObject = stream;
            cameraContainer.style.display = 'flex';
            if (dropZone) dropZone.style.display = 'none';
        } catch (err) {
            alert('Cannot access camera: ' + err.message);
        }
    });
}

if (btnGallery) {
    btnGallery.addEventListener('click', () => {
        if (dropZone) dropZone.style.display = 'block';
        if (cameraContainer) cameraContainer.style.display = 'none';
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    });
}

if (btnCloseCamera) {
    btnCloseCamera.addEventListener('click', () => {
        if (cameraContainer) cameraContainer.style.display = 'none';
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    });
}

if (btnCapture) {
    btnCapture.addEventListener('click', () => {
        if (!stream) return;
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        const ctx = cameraCanvas.getContext('2d');

        ctx.translate(cameraCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

        cameraCanvas.toBlob((blob) => {
            const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            if (fileInput) fileInput.files = dataTransfer.files;

            handleFile(file);

            if (cameraContainer) cameraContainer.style.display = 'none';
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }, 'image/jpeg');
    });
}

if (dropZone) {
    dropZone.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
    }

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-color)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--glass-border)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        if (previewImg) previewImg.src = e.target.result;
        if (filePreview) filePreview.style.display = 'block';
        if (dropZone) dropZone.style.display = 'none';
        if (uploadOptions) uploadOptions.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
        if (uploadOptions) uploadOptions.style.display = 'flex';
        if (dropZone) dropZone.style.display = 'none';
        if (cameraContainer) cameraContainer.style.display = 'none';
    });
}

// ── Form Submission: Supabase Integration ─────────────────────────────────
if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        showStatus('Processing your registration...', '');

        try {
            const formData = new FormData(registrationForm);
            const f_name = formData.get('f_name').trim();
            const l_name = formData.get('l_name').trim();
            const email = formData.get('email').trim() || ""; // Optional
            const eventCode = formData.get('invite_code').trim();
            const file = formData.get('face_photo');

            // Validate
            if (!f_name || !l_name || !eventCode || !file) {
                throw new Error('First name, last name, event code, and photo are required');
            }

            showStatus('Uploading your face photo...', '');

            // 1. Upload Image to Supabase Storage
            const fullName = `${f_name} ${l_name}`;
            const imageUrl = await uploadFaceImage(file, eventCode, fullName);

            showStatus('Saving your registration...', '');

            // 2. Insert Record into Supabase enrollments table
            const enrollmentData = {
                f_name: f_name,
                l_name: l_name,
                email: email,
                event_code: eventCode,
                face_image_path: imageUrl
            };

            await submitEnrollment(enrollmentData);

            showStatus('✅ Registration successful! You will be identified in photos.', 'success');
            registrationForm.reset();
            filePreview.style.display = 'none';
            dropZone.style.display = 'block';

            // Optionally redirect after success
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);

        } catch (error) {
            console.error('Registration Error:', error);
            showStatus('❌ Error: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Now';
        }
    });
}

function showStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = 'status-message ' + (type ? type : '');
    statusMsg.style.display = 'block';
}

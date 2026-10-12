// Supabase Configuration - Now handled by supabase_client.js
// The supabase client is initialized globally in supabase_client.js

// ── Settings Helpers ───────────────────────────────────────────────────────
function initializeSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.style.display = 'flex';
        });
    }

    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal && settingsModal.style.display === 'flex') {
            settingsModal.style.display = 'none';
        }
    });
}

// ── Extract Event Code from URL ───────────────────────────────────────────
function getEventCodeFromURL() {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('eventCode') || '';
}

// Auto-fill invite code if passed in URL
window.addEventListener('load', () => {
    initializeSettings();

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
const bookingEndpoint = 'https://script.google.com/macros/s/AKfycbzM7cxL-CKEIGlURksBWOYwwz5mH8Zsr7y2HiZbHFxW50YiZnFThYUE15g7C9VSK6-_/exec';
const bookingBtn = document.getElementById('btn-book-demo');
const bookingModal = document.getElementById('booking-modal');
const bookingForm = document.getElementById('booking-form');
const bookingSetupMessage = document.getElementById('booking-setup-message');
const bookingSubmit = document.getElementById('booking-submit');
const bookingStatus = document.getElementById('booking-status');
const bookingResponseFrame = document.getElementById('booking-response-frame');
let activeBookingRequest = '';

function closeBookingModal() {
    if (!bookingModal) return;
    bookingModal.classList.remove('is-open');
    bookingModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('booking-open');
    if (bookingBtn) bookingBtn.focus();
}

function initializeBooking() {
    if (!bookingBtn || !bookingModal || !bookingForm || !bookingSetupMessage || !bookingSubmit || !bookingResponseFrame) return;

    let endpointUrl = null;
    try {
        endpointUrl = new URL(bookingEndpoint);
    } catch (error) {
        endpointUrl = null;
    }

    const endpointIsValid = endpointUrl
        && endpointUrl.origin === 'https://script.google.com'
        && /^\/macros\/s\/[^/]+\/exec$/.test(endpointUrl.pathname);

    if (!endpointIsValid) {
        bookingSetupMessage.hidden = false;
        bookingSetupMessage.textContent = 'The form backend must be updated and connected before requests can be sent.';
        bookingSubmit.disabled = true;
    } else {
        bookingForm.action = endpointUrl.href;
        bookingSetupMessage.hidden = true;
        bookingSubmit.disabled = false;
    }

    const demoDate = document.getElementById('booking-demo-date');
    const today = new Date();
    demoDate.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    bookingForm.addEventListener('submit', (event) => {
        if (!endpointIsValid) {
            event.preventDefault();
            setBookingStatus('The form is not connected yet.', 'error');
            return;
        }

        const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('');
        activeBookingRequest = requestId;
        bookingForm.elements.requestId.value = requestId;
        bookingSubmit.disabled = true;
        bookingSubmit.textContent = 'Sending...';
        setBookingStatus('Submitting your response...', '');

        const handleResult = (messageEvent) => {
            const trustedOrigin = messageEvent.origin === 'https://script.google.com' || /^https:\/\/(?:[a-z0-9.-]+-)?script\.googleusercontent\.com$/i.test(messageEvent.origin);
            if (!trustedOrigin || !messageEvent.data || messageEvent.data.type !== 'quacksort-booking-result' || messageEvent.data.requestId !== requestId) return;
            window.removeEventListener('message', handleResult);
            activeBookingRequest = '';
            bookingSubmit.disabled = false;
            bookingSubmit.textContent = 'Send demo request';
            if (messageEvent.data.success) {
                setBookingStatus('Thanks. Your response was saved.', 'success');
                bookingForm.reset();
            } else {
                setBookingStatus(messageEvent.data.message || 'We could not save your response. Please try again.', 'error');
            }
        };
        window.addEventListener('message', handleResult);
        window.setTimeout(() => {
            if (activeBookingRequest !== requestId) return;
            activeBookingRequest = '';
            window.removeEventListener('message', handleResult);
            bookingSubmit.disabled = false;
            bookingSubmit.textContent = 'Send demo request';
            setBookingStatus('We could not confirm the response. Please try again.', 'error');
        }, 20000);
    });

    bookingBtn.addEventListener('click', () => {
        bookingModal.classList.add('is-open');
        bookingModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('booking-open');
        document.getElementById('close-booking-btn').focus();
    });

    document.getElementById('close-booking-btn').addEventListener('click', closeBookingModal);
    bookingModal.addEventListener('click', (event) => {
        if (event.target === bookingModal) closeBookingModal();
    });
    document.addEventListener('keydown', (event) => {
        if (!bookingModal.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
            closeBookingModal();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusable = bookingModal.querySelectorAll('button:not(:disabled), input:not(:disabled):not([type="hidden"]):not([tabindex="-1"]), select:not(:disabled), textarea:not(:disabled)');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
}

function setBookingStatus(message, type) {
    if (!bookingStatus) return;
    bookingStatus.textContent = message;
    bookingStatus.className = `booking-status${type ? ` ${type}` : ''}`;
}

initializeBooking();
if (new URLSearchParams(window.location.search).get('demo') === '1' && bookingBtn) {
    bookingBtn.click();
}

function initializeKnowMoreDock() {
    const knowMoreLink = document.querySelector('.know-more-link');
    const knowMoreFooter = document.querySelector('.know-more-footer');
    if (!knowMoreLink || !knowMoreFooter || !('IntersectionObserver' in window)) return;

    const footerObserver = new IntersectionObserver(([entry]) => {
        knowMoreLink.classList.toggle('is-settled', entry.isIntersecting);
    }, { threshold: 0.9 });
    footerObserver.observe(knowMoreFooter);
}

initializeKnowMoreDock();

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
        if (cameraContainer) cameraContainer.style.display = 'none';
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (fileInput) fileInput.click();
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
        dropZone.style.borderColor = 'var(--border-color)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
}

function handleFile(file) {
    const validation = validateUploadFile(file);
    if (!validation.valid) {
        alert(validation.error);
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

function isValidNamePart(value) {
    return /^[A-Za-z0-9]+$/.test(value || '');
}

function isStrongEmail(email) {
    if (!email) return true;
    if (email.length > 254) return false;
    return /^(?=.{1,64}@)(?=.{6,254}$)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(email);
}

function validateUploadFile(file) {
    if (!file) {
        return { valid: false, error: 'Please select a JPG or PNG image.' };
    }

    const fileName = (file.name || '').toLowerCase();
    const isPng = file.type === 'image/png' || fileName.endsWith('.png');
    const isJpeg = file.type === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');

    if (!isPng && !isJpeg) {
        return { valid: false, error: 'Only JPG and PNG files are allowed.' };
    }

    return { valid: true, extension: isPng ? 'png' : 'jpg' };
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
        if (uploadOptions) uploadOptions.style.display = 'flex';
        if (dropZone) dropZone.style.display = 'none';
        if (cameraContainer) cameraContainer.style.display = 'none';
        if (statusMsg) statusMsg.style.display = 'none';
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

            if (!isValidNamePart(f_name) || !isValidNamePart(l_name)) {
                throw new Error('First name and last name may only contain letters and numbers, with no spaces or special characters.');
            }

            if (!isStrongEmail(email)) {
                throw new Error('Please enter a valid email address.');
            }

            const fileValidation = validateUploadFile(file);
            if (!fileValidation.valid) {
                throw new Error(fileValidation.error);
            }

            showStatus('Uploading your face photo...', '');

            // 1. Upload Image to Supabase Storage
            const fullName = `${f_name}${l_name}`;
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
            if (uploadOptions) uploadOptions.style.display = 'flex';
            if (dropZone) dropZone.style.display = 'none';

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

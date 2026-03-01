// Supabase Configuration (Template)
// Replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;
if (typeof createClient !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

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
if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

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
        previewImg.src = e.target.result;
        filePreview.style.display = 'block';
        dropZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        filePreview.style.display = 'none';
        dropZone.style.display = 'block';
    });
}

// ── Form Submission: Supabase Integration ─────────────────────────────────
if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!supabase) {
            showStatus('Supabase is not configured. Please add your credentials in script.js.', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        showStatus('Uploading your information...', '');

        try {
            const formData = new FormData(registrationForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const inviteCode = formData.get('invite_code');
            const file = formData.get('face_photo');

            // 1. Upload Image to Supabase Storage
            const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { data: storageData, error: storageError } = await supabase.storage
                .from('face_photos')
                .upload(fileName, file);

            if (storageError) throw storageError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('face_photos')
                .getPublicUrl(fileName);

            // 3. Insert Record into Supabase Table
            const { error: dbError } = await supabase
                .from('registrations')
                .insert([{
                    name,
                    email,
                    invite_code: inviteCode,
                    face_photo_url: publicUrl
                }]);

            if (dbError) throw dbError;

            showStatus('Registration successful! You will be identified in photos.', 'success');
            registrationForm.reset();
            filePreview.style.display = 'none';
            dropZone.style.display = 'block';

        } catch (error) {
            console.error('Registration Error:', error);
            showStatus('Error: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Now';
        }
    });
}

function showStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = 'status-message ' + type;
    statusMsg.style.display = 'block';
}

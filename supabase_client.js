/**
 * Supabase Client for QuackSort Web App
 * Handles enrollment form submission and face image uploads
 */

// Initialize Supabase client
const SUPABASE_URL = 'https://hnpderxguoyvwqcugleo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucGRlcnhndW95dndxY3VnbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODk1MTcsImV4cCI6MjA4ODU2NTUxN30.gMahx_1EZkew6KDawl4OzWNLMY6rFBNrmMw5iMRruZM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sanitizeStorageName(value) {
    const sanitized = (value || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (!sanitized) {
        throw new Error('Name must contain only letters and numbers.');
    }
    return sanitized;
}

function getAllowedImageExtension(imageFile) {
    const fileName = (imageFile?.name || '').toLowerCase();
    if (imageFile?.type === 'image/png' || fileName.endsWith('.png')) {
        return 'png';
    }
    if (imageFile?.type === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        return 'jpg';
    }
    throw new Error('Only JPG and PNG files are allowed.');
}

/**
 * Upload face image to Supabase storage
 * @param {File} imageFile - The image file from form upload
 * @param {string} eventCode - Event code for folder organization
 * @param {string} personName - Name of the person (for filename)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
async function uploadFaceImage(imageFile, eventCode, personName) {
    try {
        const sanitizedName = sanitizeStorageName(personName);
        const sanitizedEventCode = sanitizeStorageName(eventCode);
        const extension = getAllowedImageExtension(imageFile);
        const fileName = `${sanitizedEventCode}/${sanitizedName}.${extension}`;

        // Upload to storage bucket
        const { data, error } = await supabaseClient.storage
            .from('face-uploads')
            .upload(fileName, imageFile, {
                cacheControl: '3600',
                upsert: true,
                contentType: extension === 'png' ? 'image/png' : 'image/jpeg'
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: publicUrl } = supabaseClient.storage
            .from('face-uploads')
            .getPublicUrl(fileName);

        return publicUrl.publicUrl;
    } catch (error) {
        console.error('Face image upload error:', error);
        throw error;
    }
}

/**
 * Submit enrollment to database
 * @param {Object} enrollmentData - {name, email, event_code, face_image_path}
 * @returns {Promise<Object>} - Database response
 */
async function submitEnrollment(enrollmentData) {
    try {
        const { data, error } = await supabaseClient
            .from('enrollments')
            .insert([enrollmentData]);

        if (error) {
            if (error.code === '23503' || /foreign key/i.test(error.message || '')) {
                throw new Error('No event registered for this event code. Please contact the event owner.');
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Enrollment submission error:', error);
        throw error;
    }
}

/**
 * Get all enrollments for an event (for testing/verification)
 * @param {string} eventCode 
 * @returns {Promise<Array>}
 */
async function getEventEnrollments(eventCode) {
    try {
        const { data, error } = await supabaseClient
            .from('enrollments')
            .select('*')
            .eq('event_code', eventCode);

        if (error) {
            throw new Error(`Fetch error: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Get enrollments error:', error);
        throw error;
    }
}

/**
 * Download face image by URL
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<Blob>}
 */
async function downloadFaceImage(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        return await response.blob();
    } catch (error) {
        console.error('Face image download error:', error);
        throw error;
    }
}

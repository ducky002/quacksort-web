/**
 * Supabase Client for QuackSort Web App
 * Handles enrollment form submission and face image uploads
 */

// Initialize Supabase client
const SUPABASE_URL = 'https://hnpderxguoyvwqcugleo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucGRlcnhndW95dndxY3VnbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODk1MTcsImV4cCI6MjA4ODU2NTUxN30.gMahx_1EZkew6KDawl4OzWNLMY6rFBNrmMw5iMRruZM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Upload face image to Supabase storage
 * @param {File} imageFile - The image file from form upload
 * @param {string} eventCode - Event code for folder organization
 * @param {string} personName - Name of the person (for filename)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
async function uploadFaceImage(imageFile, eventCode, personName) {
    try {
        // Create unique filename
        const timestamp = Date.now();
        const sanitizedName = personName.replace(/\s+/g, '_').toLowerCase();
        const fileName = `${eventCode}/${sanitizedName}_${timestamp}.jpg`;
        
        // Upload to storage bucket
        const { data, error } = await supabase.storage
            .from('face-uploads')
            .upload(fileName, imageFile, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
        
        // Get public URL
        const { data: publicUrl } = supabase.storage
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
        const { data, error } = await supabase
            .from('enrollments')
            .insert([enrollmentData]);
        
        if (error) {
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
        const { data, error } = await supabase
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

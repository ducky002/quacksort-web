// Set each platform button's data-download-url in index.html to its release asset URL.
const downloadNotice = document.getElementById('download-notice');
const confirmDownload = document.getElementById('confirm-download');
let downloadTrigger;

document.querySelectorAll('[data-download-platform]').forEach((button) => {
    button.addEventListener('click', () => {
        downloadTrigger = button;
        const url = button.dataset.downloadUrl.trim();
        const platform = button.dataset.downloadPlatform;
        document.getElementById('download-notice-title').textContent = `Before you download for ${platform}`;
        confirmDownload.hidden = !url;
        if (url) confirmDownload.href = url;
        else confirmDownload.removeAttribute('href');
        document.getElementById('download-availability').textContent = url
            ? '' : `The ${platform} download is coming soon. You can read the activation details now.`;
        downloadNotice.showModal();
    });
});

document.getElementById('cancel-download').addEventListener('click', () => downloadNotice.close());
confirmDownload.addEventListener('click', () => downloadNotice.close());
downloadNotice.addEventListener('close', () => downloadTrigger?.focus());

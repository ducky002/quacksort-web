document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const peerId = params.get('peer');
    const sessionCode = params.get('code');

    const loadingView = document.getElementById('loading-view');
    const errorView = document.getElementById('error-view');
    const galleryView = document.getElementById('gallery-view');
    const imageGrid = document.getElementById('image-grid');
    const folderLabel = document.getElementById('folder-name');
    const itemsCountLabel = document.getElementById('items-count');
    const downloadZipBtn = document.getElementById('btn-download-zip');

    if (!peerId) {
        showError("Invalid link. No sharing peer specified.");
        return;
    }

    // ── WebRTC Setup ────────────────────────────────────────────────────────
    let conn;
    let imagesList = [];
    const pendingRequests = new Map();

    const peer = new Peer();

    peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
        showError("Connection failed: " + err.type);
    });

    peer.on('open', () => {
        console.log("My Peer ID:", peer.id);
        console.log("Connecting to:", peerId);

        // Connect to the sender's desktop app
        conn = peer.connect(peerId, { reliable: true });

        conn.on('open', async () => {
            console.log("Connected to peer! Connection open:", conn.open);
            await loadGallery();
        });

        conn.on('data', (data) => {
            console.log("Browser received P2P data:", data);
            if (data.type === 'response') {
                const reqId = data.reqId;
                console.log(`Response received (reqId: ${reqId}, status: ${data.status}, mime: ${data.mime})`);
                if (pendingRequests.has(reqId)) {
                    const req = pendingRequests.get(reqId);
                    pendingRequests.delete(reqId);

                    if (data.status >= 400) {
                        console.error(`❌ Error response for ${req.path}: HTTP ${data.status}`);
                        console.error(`Error data:`, data.data);
                    }
                    
                    if (data.status >= 400) {
                        req.resolve(new Response(null, { status: data.status }));
                    } else {
                        // Handle different data formats
                        let responseData = data.data;
                        
                        // If it's a string (JSON or base64), convert appropriately
                        if (typeof responseData === 'string') {
                            // Check if it looks like JSON
                            if (data.mime.includes('json') && responseData.charAt(0) === '{') {
                                responseData = new TextEncoder().encode(responseData);
                            } else if (data.mime.includes('json')) {
                                // Try parsing as base64
                                try {
                                    const binaryString = atob(responseData);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    responseData = bytes.buffer;
                                } catch (e) {
                                    console.warn(`Could not decode base64, using as-is`);
                                    responseData = new TextEncoder().encode(responseData);
                                }
                            } else {
                                responseData = new TextEncoder().encode(responseData);
                            }
                        }
                        
                        const blob = new Blob([responseData], { type: data.mime });
                        console.log(`✅ Creating blob from response, blob size: ${blob.size}`);
                        req.resolve(new Response(blob, { status: data.status, headers: { 'Content-Type': data.mime } }));
                    }
                } else {
                    console.warn(`⚠️ Response received but no pending request found for reqId: ${reqId}`);
                }
            }
        });
        
        conn.on('close', () => {
            console.error("Browser P2P connection CLOSED by peer!");
            showError("Connection closed by peer.");
        });

        conn.on('error', (err) => {
            console.error("Browser P2P Connection Error:", err);
            showError("Data connection failed: " + err.message);
        });
    });

    // ── Custom Fetch proxy over WebRTC ──────────────────────────────────────
    function fakeFetch(path) {
        return new Promise((resolve, reject) => {
            if (!conn || !conn.open) {
                console.error("No connection to peer!");
                return reject(new Error("No connection"));
            }
            const reqId = Math.random().toString(36).substring(2, 10);
            console.log(`fakeFetch: Requesting ${path} (reqId: ${reqId})`);
            pendingRequests.set(reqId, { resolve, reject, path });
            conn.send({ type: 'request', reqId, path });

            // Timeout just in case
            setTimeout(() => {
                if (pendingRequests.has(reqId)) {
                    pendingRequests.delete(reqId);
                    console.error(`fakeFetch timeout for ${path}`);
                    resolve(new Response(null, { status: 504 }));
                }
            }, 30000);
        });
    }

    // ── Application Logic ───────────────────────────────────────────────────
    async function loadGallery() {
        try {
            // Fetch list via proxy
            const response = await fakeFetch('/api/images');
            if (!response.ok) throw new Error("Peer returned HTTP " + response.status);

            const data = await response.json();

            folderLabel.textContent = data.folder_name || "Shared Folder";
            imagesList = data.items.filter(item => item.type === 'image');
            itemsCountLabel.textContent = `${imagesList.length} photos`;

            loadingView.style.display = 'none';
            galleryView.style.display = 'block';
            setTimeout(() => { galleryView.classList.add('loaded'); }, 50);

            if (imagesList.length === 0) {
                imageGrid.innerHTML = '<div class="empty-state">No images found in this folder.</div>';
            } else {
                imageGrid.innerHTML = '';
            }

            // Fetch and render sequentially to not overwhelm the P2P channel
            for (const img of imagesList) {
                await renderImageCard(img);
            }

        } catch (err) {
            console.error("Gallery failed:", err);
            showError("Failed to load images from peer.");
        }
    }

    async function renderImageCard(img) {
        const div = document.createElement('div');
        div.className = 'image-card';
        // Add skeleton loader first
        div.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);">
                <span style="font-size:0.8rem; color:var(--text-dim);">Loading...</span>
            </div>
            <div class="card-overlay" style="z-index: 10;">
                <span style="font-size: 0.8rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${img.name}</span>
                <button class="download-btn" title="Download Image">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
            </div>
        `;
        imageGrid.appendChild(div);

        // Try downloading thumb
        try {
            const res = await fakeFetch(img.thumb_url || img.url);
            if (!res.ok) throw new Error("Thumb failed");
            const blob = await res.blob();
            const objUrl = URL.createObjectURL(blob);

            const imgEl = document.createElement('img');
            imgEl.loading = 'lazy';
            imgEl.src = objUrl;
            imgEl.alt = img.name;

            // Replace skeleton with img
            div.replaceChild(imgEl, div.firstElementChild);

            // Note: Don't revoke locally generated blob URLs for images immediately if they are still onscreen
        } catch (e) {
            div.firstElementChild.innerHTML = `<span style="font-size:0.8rem; color:#ef4444;">Failed</span>`;
        }

        // Setup download listener
        const dBtn = div.querySelector('.download-btn');
        dBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const origSVG = dBtn.innerHTML;
            dBtn.innerHTML = `<span style="font-size:12px; font-weight:bold;">...</span>`;
            try {
                const res = await fakeFetch(img.url);
                const blob = await res.blob();
                const objUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objUrl;
                a.download = img.name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(objUrl), 5000); // cleanup later
            } catch (err) {
                alert("Failed to download.");
            }
            dBtn.innerHTML = origSVG;
        });
    }

    // ZIP functionality - streams individual files over WebRTC and zips them locally purely in RAM
    if (downloadZipBtn) {
        downloadZipBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (imagesList.length === 0) return;

            const origText = downloadZipBtn.textContent;
            downloadZipBtn.disabled = true;

            try {
                const zip = new JSZip();

                for (let i = 0; i < imagesList.length; i++) {
                    const img = imagesList[i];
                    downloadZipBtn.textContent = `Downloading ${i + 1}/${imagesList.length}...`;
                    const res = await fakeFetch(img.url);
                    if (res.ok) {
                        const blob = await res.blob();
                        zip.file(img.name, blob);
                    }
                }

                downloadZipBtn.textContent = 'Zipping...';
                const zipBlob = await zip.generateAsync({ type: "blob" });

                const objUrl = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = objUrl;
                a.download = `${folderLabel.textContent || 'Photos'}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(objUrl), 10000);

            } catch (err) {
                console.error(err);
                alert("Failed to build ZIP. Connection may have been lost.");
            } finally {
                downloadZipBtn.disabled = false;
                downloadZipBtn.textContent = origText;
            }
        });
    }

    function showError(msg) {
        loadingView.style.display = 'none';
        errorView.style.display = 'flex';
        galleryView.style.display = 'none';
        if (msg) {
            errorView.querySelector('p').textContent = msg;
        }
    }
});

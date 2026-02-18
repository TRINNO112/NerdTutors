// ==================== OCR SCAN - CAMERA MODULE ====================
// Handles image capture, file upload, compression, and preview

const OCRCamera = {
    // Max image size for API (4MB after base64 encoding ~ 3MB raw)
    MAX_IMAGE_SIZE: 3 * 1024 * 1024, // 3MB
    MAX_DIMENSION: 2048, // Max width/height

    /**
     * Setup file input and camera triggers
     */
    setupUpload(config) {
        const {
            fileBtn, cameraBtn, fileInput, cameraInput,
            uploadZone, uploadContent, imagePreview, previewImg,
            changeImgBtn, nextBtn, onImageReady
        } = config;

        // File button click
        fileBtn.addEventListener('click', () => fileInput.click());

        // Camera button click
        cameraBtn.addEventListener('click', () => cameraInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.processFile(e.target.files[0], config);
        });

        // Camera input change
        cameraInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.processFile(e.target.files[0], config);
        });

        // Change image button
        changeImgBtn.addEventListener('click', () => {
            this.resetUpload(config);
        });

        // Drag & drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processFile(file, config);
            }
        });
    },

    /**
     * Process uploaded or captured file
     */
    async processFile(file, config) {
        const { uploadContent, imagePreview, previewImg, nextBtn, uploadZone, onImageReady } = config;

        try {
            // Compress image if needed
            const result = await this.compressImage(file);

            // Show preview
            previewImg.src = result.dataUrl;
            uploadContent.style.display = 'none';
            imagePreview.style.display = 'block';
            uploadZone.classList.add('has-image');
            nextBtn.disabled = false;

            // Store image data
            if (onImageReady) {
                onImageReady({
                    base64: result.base64,
                    mimeType: result.mimeType,
                    dataUrl: result.dataUrl
                });
            }

        } catch (err) {
            console.error('Error processing image:', err);
            alert('Error processing image. Please try another image.');
        }
    },

    /**
     * Compress image to stay within API limits
     */
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    // Scale down if too large
                    if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
                        const ratio = Math.min(this.MAX_DIMENSION / width, this.MAX_DIMENSION / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try JPEG compression at different quality levels
                    let quality = 0.85;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);

                    // Reduce quality if still too large
                    while (dataUrl.length > this.MAX_IMAGE_SIZE * 1.37 && quality > 0.3) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    // Extract base64 data
                    const base64 = dataUrl.split(',')[1];

                    resolve({
                        base64,
                        mimeType: 'image/jpeg',
                        dataUrl,
                        width,
                        height,
                        quality
                    });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Reset upload to initial state
     */
    resetUpload(config) {
        const { uploadContent, imagePreview, nextBtn, uploadZone, fileInput, cameraInput, onImageReady } = config;
        uploadContent.style.display = 'flex';
        imagePreview.style.display = 'none';
        uploadZone.classList.remove('has-image');
        nextBtn.disabled = true;
        fileInput.value = '';
        cameraInput.value = '';
        if (onImageReady) onImageReady(null);
    }
};

// Make globally available
window.OCRCamera = OCRCamera;

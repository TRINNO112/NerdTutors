// ==================== OCR SCAN - CAMERA MODULE ====================
// Handles image capture, file upload, compression, and preview
// Supports MULTIPLE image uploads (multi-page answers)

const OCRCamera = {
    // Max image size for API (4MB after base64 encoding ~ 3MB raw)
    MAX_IMAGE_SIZE: 3 * 1024 * 1024, // 3MB
    MAX_DIMENSION: 2048, // Max width/height
    MAX_PAGES: 10, // Max number of pages per answer

    /**
     * Setup file input and camera triggers
     * Now supports multi-image: stores array of images, shows thumbnail strip
     */
    setupUpload(config) {
        const {
            fileBtn, cameraBtn, fileInput, cameraInput,
            uploadZone, uploadContent, imagePreview, previewImg,
            changeImgBtn, nextBtn, onImageReady
        } = config;

        // Initialize images array on the config
        config._images = [];

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

        // Change image button — now resets ALL images
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
     * Process uploaded or captured file — adds to images array
     */
    async processFile(file, config) {
        const { uploadContent, imagePreview, previewImg, nextBtn, uploadZone, onImageReady } = config;

        if (config._images.length >= this.MAX_PAGES) {
            alert(`Maximum ${this.MAX_PAGES} pages allowed.`);
            return;
        }

        try {
            // Compress image if needed
            const result = await this.compressImage(file);

            // Add to images array
            config._images.push({
                base64: result.base64,
                mimeType: result.mimeType,
                dataUrl: result.dataUrl
            });

            // Show preview of FIRST image in main preview
            if (config._images.length === 1) {
                previewImg.src = result.dataUrl;
                uploadContent.style.display = 'none';
                imagePreview.style.display = 'block';
                uploadZone.classList.add('has-image');
            }

            // Update multi-page UI
            this.updateMultiPageUI(config);

            // Enable next/submit button
            nextBtn.disabled = false;

            // Notify with full images array
            if (onImageReady) {
                onImageReady(config._images);
            }

            // Reset file inputs so same file can be re-selected
            config.fileInput.value = '';
            config.cameraInput.value = '';

        } catch (err) {
            console.error('Error processing image:', err);
            alert('Error processing image. Please try another image.');
        }
    },

    /**
     * Update the multi-page thumbnail strip and "Add Page" button
     */
    updateMultiPageUI(config) {
        const { imagePreview } = config;
        const count = config._images.length;

        // Remove old UI elements
        let strip = imagePreview.parentElement.querySelector('.ocr-multipage-strip');
        if (strip) strip.remove();

        if (count === 0) return;

        // Build strip
        strip = document.createElement('div');
        strip.className = 'ocr-multipage-strip';
        strip.innerHTML = `
            <div class="ocr-page-counter">📄 ${count} page${count > 1 ? 's' : ''} uploaded</div>
            <div class="ocr-page-thumbnails">
                ${config._images.map((img, i) => `
                    <div class="ocr-page-thumb" data-index="${i}">
                        <img src="${img.dataUrl}" alt="Page ${i + 1}" />
                        <span class="ocr-page-label">P${i + 1}</span>
                        <button class="ocr-page-remove" data-index="${i}" title="Remove page">✕</button>
                    </div>
                `).join('')}
            </div>
            ${count < this.MAX_PAGES ? `
                <button class="ocr-btn ocr-btn-secondary ocr-btn-add-page" style="margin-top: 0.5rem; font-size: 0.85rem; padding: 0.5rem 1rem;">
                    + Add Another Page
                </button>
            ` : `<div style="color: #f59e0b; font-size: 0.8rem; margin-top: 0.4rem;">⚠️ Maximum ${this.MAX_PAGES} pages reached</div>`}
        `;

        // Insert after the preview container
        imagePreview.parentElement.appendChild(strip);

        // Event: remove page
        strip.querySelectorAll('.ocr-page-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.removePage(config, idx);
            });
        });

        // Event: add another page
        const addBtn = strip.querySelector('.ocr-btn-add-page');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                config.fileInput.click();
            });
        }

        // Event: click thumbnail to preview
        strip.querySelectorAll('.ocr-page-thumb img').forEach(thumb => {
            thumb.addEventListener('click', () => {
                config.previewImg.src = thumb.src;
            });
        });
    },

    /**
     * Remove a page by index
     */
    removePage(config, index) {
        config._images.splice(index, 1);

        if (config._images.length === 0) {
            this.resetUpload(config);
            return;
        }

        // Update main preview to first remaining image
        config.previewImg.src = config._images[0].dataUrl;

        // Rebuild UI
        this.updateMultiPageUI(config);

        // Notify with updated array
        if (config.onImageReady) {
            config.onImageReady(config._images);
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
     * Reset upload to initial state — clears ALL images
     */
    resetUpload(config) {
        const { uploadContent, imagePreview, nextBtn, uploadZone, fileInput, cameraInput, onImageReady } = config;
        config._images = [];
        uploadContent.style.display = 'flex';
        imagePreview.style.display = 'none';
        uploadZone.classList.remove('has-image');
        nextBtn.disabled = true;
        fileInput.value = '';
        cameraInput.value = '';

        // Remove multi-page strip
        const strip = imagePreview.parentElement.querySelector('.ocr-multipage-strip');
        if (strip) strip.remove();

        if (onImageReady) onImageReady(null);
    }
};

// Make globally available
window.OCRCamera = OCRCamera;

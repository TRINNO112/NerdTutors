// ==================== OCR SCAN - MAIN ENTRY POINT ====================
// Orchestrates all modules: Camera, API, UI
// Depends on: ocr-scan-camera.js, ocr-scan-api.js, ocr-scan-ui.js

const OCRApp = {
    // State
    currentMode: null, // 'single' or 'full-sheet'
    singleImageData: null,
    fullSheetImageData: null,
    questionCounter: 0,

    /**
     * Initialize the app
     */
    init() {
        console.log('🚀 OCR Scan App Initialized');
        this.setupModeSelector();
        this.setupSingleFlow();
        this.setupFullSheetFlow();
    },

    // ==================== MODE SELECTOR ====================

    setupModeSelector() {
        const singleCard = document.getElementById('singleModeCard');
        const fullSheetCard = document.getElementById('fullSheetModeCard');

        singleCard.addEventListener('click', () => this.selectMode('single'));
        fullSheetCard.addEventListener('click', () => this.selectMode('full-sheet'));
    },

    selectMode(mode) {
        this.currentMode = mode;

        // Update card states
        document.getElementById('singleModeCard').classList.toggle('active', mode === 'single');
        document.getElementById('fullSheetModeCard').classList.toggle('active', mode === 'full-sheet');

        // Show appropriate flow
        document.getElementById('singleFlow').style.display = mode === 'single' ? 'block' : 'none';
        document.getElementById('fullSheetFlow').style.display = mode === 'full-sheet' ? 'block' : 'none';
        document.getElementById('resultsSection').style.display = 'none';

        // Scroll to flow
        const flow = document.getElementById(mode === 'single' ? 'singleFlow' : 'fullSheetFlow');
        setTimeout(() => flow.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    },

    // ==================== SINGLE ANSWER FLOW ====================

    setupSingleFlow() {
        // State for question loop
        this.singleAnswers = {}; // questionIndex → images array
        this.currentSingleQIndex = 0;
        this.singleCameraConfig = null;

        // Camera setup — nextBtn is a dummy, we manage navigation ourselves
        const dummyNextBtn = document.createElement('button');
        dummyNextBtn.style.display = 'none';
        document.body.appendChild(dummyNextBtn);

        this.singleCameraConfig = {
            fileBtn: document.getElementById('singleFileBtn'),
            cameraBtn: document.getElementById('singleCameraBtn'),
            fileInput: document.getElementById('singleFileInput'),
            cameraInput: document.getElementById('singleCameraInput'),
            uploadZone: document.getElementById('singleUploadZone'),
            uploadContent: document.getElementById('singleUploadContent'),
            imagePreview: document.getElementById('singleImagePreview'),
            previewImg: document.getElementById('singlePreviewImg'),
            changeImgBtn: document.getElementById('singleChangeImg'),
            nextBtn: dummyNextBtn,
            onImageReady: (data) => {
                if (data && data.length > 0) {
                    this.singleAnswers[this.currentSingleQIndex] = data;
                } else {
                    delete this.singleAnswers[this.currentSingleQIndex];
                }
                this.updateSingleLoopUI();
            }
        };
        OCRCamera.setupUpload(this.singleCameraConfig);

        // Next step button (from Step 1 → Step 2)
        document.getElementById('singleNextStep1').addEventListener('click', () => {
            this.currentSingleQIndex = 0;
            this.singleAnswers = {};
            document.getElementById('singleStep1').style.display = 'none';
            document.getElementById('singleStep2').style.display = 'block';
            OCRUI.updateSteps('singleFlow', 2);
            this.showSingleQuestion(0);
        });

        // Back to Step 1
        document.getElementById('singleBackStep2').addEventListener('click', () => {
            this.saveSingleCurrentImages();
            document.getElementById('singleStep2').style.display = 'none';
            document.getElementById('singleStep1').style.display = 'block';
            OCRUI.updateSteps('singleFlow', 1);
        });

        // Navigation: Previous
        document.getElementById('singlePrevQ').addEventListener('click', () => {
            if (this.currentSingleQIndex > 0) {
                this.saveSingleCurrentImages();
                this.showSingleQuestion(this.currentSingleQIndex - 1);
            }
        });

        // Navigation: Next / Skip
        document.getElementById('singleNextQ').addEventListener('click', () => {
            this.navigateSingleNext();
        });
        document.getElementById('singleSkipQ').addEventListener('click', () => {
            this.navigateSingleNext();
        });

        // Submit All
        document.getElementById('singleSubmitAll').addEventListener('click', () => this.submitSingle());

        // Back to mode selector
        document.getElementById('singleFlowBack').addEventListener('click', () => {
            document.getElementById('singleFlow').style.display = 'none';
            document.getElementById('singleModeCard').classList.remove('active');
            this.currentMode = null;
            document.getElementById('singleStep1').style.display = 'block';
            document.getElementById('singleStep2').style.display = 'none';
            OCRUI.updateSteps('singleFlow', 1);
        });
    },

    // Save current images before navigating away
    saveSingleCurrentImages() {
        if (this.singleCameraConfig && this.singleCameraConfig._images && this.singleCameraConfig._images.length > 0) {
            this.singleAnswers[this.currentSingleQIndex] = [...this.singleCameraConfig._images];
        }
    },

    // Navigate to next question
    navigateSingleNext() {
        const batch = window.OCRBatchState?.selectedBatch;
        if (!batch) return;
        this.saveSingleCurrentImages();
        if (this.currentSingleQIndex < batch.questions.length - 1) {
            this.showSingleQuestion(this.currentSingleQIndex + 1);
        }
    },

    // Show a specific question in the loop
    showSingleQuestion(index) {
        const batch = window.OCRBatchState?.selectedBatch;
        if (!batch || !batch.questions[index]) return;

        this.currentSingleQIndex = index;
        const q = batch.questions[index];
        const total = batch.questions.length;

        // Update question display
        document.getElementById('singleQProgress').textContent = `Question ${index + 1} of ${total}`;
        document.getElementById('singleQLabel').textContent = `Question ${index + 1}`;
        document.getElementById('singleQText').textContent = q.text;
        document.getElementById('singleQMarks').textContent = `${q.marks} marks`;

        // Update progress bar
        const answeredCount = Object.keys(this.singleAnswers).length;
        document.getElementById('singleQStatus').textContent = `${answeredCount} answered`;
        document.getElementById('singleProgressFill').style.width = `${((index + 1) / total) * 100}%`;

        // Show/hide navigation buttons
        document.getElementById('singlePrevQ').style.display = index > 0 ? 'inline-flex' : 'none';
        const isLastQ = index === total - 1;
        document.getElementById('singleNextQ').style.display = isLastQ ? 'none' : 'inline-flex';
        document.getElementById('singleSkipQ').style.display = isLastQ ? 'none' : 'inline-flex';

        // Enable submit if at least 1 answer exists
        document.getElementById('singleSubmitAll').disabled = answeredCount === 0;

        // Reset camera and restore saved images for this question
        OCRCamera.resetUpload(this.singleCameraConfig);
        if (this.singleAnswers[index] && this.singleAnswers[index].length > 0) {
            OCRCamera.restoreImages(this.singleCameraConfig, this.singleAnswers[index]);
        }
    },

    // Update Submit All button state
    updateSingleLoopUI() {
        const answeredCount = Object.keys(this.singleAnswers).length;
        document.getElementById('singleQStatus').textContent = `${answeredCount} answered`;
        document.getElementById('singleSubmitAll').disabled = answeredCount === 0;
    },

    async submitSingle() {
        const batchState = window.OCRBatchState;
        if (!batchState || !batchState.selectedBatch) {
            alert('Please select a question batch.');
            return;
        }

        // Save current question's images
        this.saveSingleCurrentImages();

        const batch = batchState.selectedBatch;
        const answeredIndices = Object.keys(this.singleAnswers).map(Number);

        if (answeredIndices.length === 0) {
            alert('Please upload at least one answer.');
            return;
        }

        // Show scanning overlay
        OCRUI.showScanning();
        OCRUI.updateSteps('singleFlow', 3);

        // Evaluate each answered question in parallel
        const evaluationPromises = answeredIndices.map(idx => {
            const q = batch.questions[idx];
            const images = this.singleAnswers[idx];
            return OCRAPI.evaluateSingle({
                images: images.map(img => ({ data: img.base64, mimeType: img.mimeType })),
                question: q.text,
                modelAnswer: q.modelAnswer || '',
                maxMarks: q.marks || 5
            }).then(result => ({
                ...result,
                questionIndex: idx,
                questionText: q.text,
                maxMarks: q.marks || 5
            }));
        });

        const results = await Promise.all(evaluationPromises);

        // Hide scanning
        OCRUI.hideScanning();

        // Hide flow section
        document.getElementById('singleFlow').style.display = 'none';
        document.getElementById('modeSelector').style.display = 'none';

        // Save results to Firestore
        if (window.OCRBatchSave) {
            window.OCRBatchSave('single', batch, results);
        }

        // Render combined results
        OCRUI.renderSingleResults(results, batch);
    },

    // ==================== FULL SHEET FLOW ====================

    setupFullSheetFlow() {
        // Camera setup
        OCRCamera.setupUpload({
            fileBtn: document.getElementById('fullSheetFileBtn'),
            cameraBtn: document.getElementById('fullSheetCameraBtn'),
            fileInput: document.getElementById('fullSheetFileInput'),
            cameraInput: document.getElementById('fullSheetCameraInput'),
            uploadZone: document.getElementById('fullSheetUploadZone'),
            uploadContent: document.getElementById('fullSheetUploadContent'),
            imagePreview: document.getElementById('fullSheetImagePreview'),
            previewImg: document.getElementById('fullSheetPreviewImg'),
            changeImgBtn: document.getElementById('fullSheetChangeImg'),
            nextBtn: document.getElementById('fullSheetSubmitBtn'),
            onImageReady: (data) => { this.fullSheetImageData = data; }
        });

        // Next step button
        document.getElementById('fullSheetNextStep1').addEventListener('click', () => {
            document.getElementById('fullSheetStep1').style.display = 'none';
            document.getElementById('fullSheetStep2').style.display = 'block';
            OCRUI.updateSteps('fullSheetFlow', 2);
        });

        // Back button
        document.getElementById('fullSheetBackStep2').addEventListener('click', () => {
            document.getElementById('fullSheetStep2').style.display = 'none';
            document.getElementById('fullSheetStep1').style.display = 'block';
            OCRUI.updateSteps('fullSheetFlow', 1);
        });

        // Submit button
        document.getElementById('fullSheetSubmitBtn').addEventListener('click', () => this.submitFullSheet());

        // Back to mode selector
        document.getElementById('fullSheetFlowBack').addEventListener('click', () => {
            document.getElementById('fullSheetFlow').style.display = 'none';
            document.getElementById('fullSheetModeCard').classList.remove('active');
            this.currentMode = null;
            document.getElementById('fullSheetStep1').style.display = 'block';
            document.getElementById('fullSheetStep2').style.display = 'none';
            OCRUI.updateSteps('fullSheetFlow', 1);
        });
    },

    async submitFullSheet() {
        if (!this.fullSheetImageData || this.fullSheetImageData.length === 0) {
            alert('Please upload an answer sheet image first.');
            return;
        }

        // Get batch data from the batch module
        const batchState = window.OCRBatchState;
        if (!batchState || !batchState.selectedBatch) {
            alert('Please select a question batch.');
            return;
        }

        const batch = batchState.selectedBatch;
        const questions = batch.questions.map((q, i) => ({
            id: `q${i + 1}`,
            text: q.text,
            modelAnswer: q.modelAnswer || '',
            marks: q.marks || 5
        }));

        if (questions.length === 0) {
            alert('Selected batch has no questions.');
            return;
        }

        // Show scanning overlay
        OCRUI.showScanning();
        OCRUI.updateSteps('fullSheetFlow', 3);

        // Call API — send all images
        const result = await OCRAPI.evaluateFullSheet({
            images: this.fullSheetImageData.map(img => ({ data: img.base64, mimeType: img.mimeType })),
            questions
        });

        // Hide scanning, show results
        OCRUI.hideScanning();

        // Hide flow section
        document.getElementById('fullSheetFlow').style.display = 'none';
        document.getElementById('modeSelector').style.display = 'none';

        // Save results to Firestore via batch module
        if (window.OCRBatchSave) {
            window.OCRBatchSave('full-sheet', batch, result);
        }

        // Render results
        OCRUI.renderFullSheetResults(result);
    },

    // ==================== SCAN ANOTHER ====================

    scanAnother() {
        // Reset everything
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('resultsSection').innerHTML = '';
        document.getElementById('modeSelector').style.display = 'block';

        // Reset single flow
        document.getElementById('singleFlow').style.display = 'none';
        document.getElementById('singleStep1').style.display = 'block';
        document.getElementById('singleStep2').style.display = 'none';
        OCRUI.updateSteps('singleFlow', 1);

        // Reset full sheet flow
        document.getElementById('fullSheetFlow').style.display = 'none';
        document.getElementById('fullSheetStep1').style.display = 'block';
        document.getElementById('fullSheetStep2').style.display = 'none';
        OCRUI.updateSteps('fullSheetFlow', 1);

        // Reset mode cards
        document.getElementById('singleModeCard').classList.remove('active');
        document.getElementById('fullSheetModeCard').classList.remove('active');

        // Reset image data
        this.singleImageData = null;
        this.fullSheetImageData = null;
        this.currentMode = null;
        this.questionCounter = 0;

        // Reset upload zones
        ['singleUploadContent', 'fullSheetUploadContent'].forEach(id => {
            document.getElementById(id).style.display = 'flex';
        });
        ['singleImagePreview', 'fullSheetImagePreview'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        ['singleNextStep1', 'fullSheetNextStep1'].forEach(id => {
            document.getElementById(id).disabled = true;
        });
        ['singleUploadZone', 'fullSheetUploadZone'].forEach(id => {
            document.getElementById(id).classList.remove('has-image');
        });

        // Reset batch selectors
        ['singleBatchSelect', 'fullSheetBatchSelect'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.selectedIndex = 0;
        });
        ['singleBatchPreview', 'fullSheetBatchPreview'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Reset batch state
        if (window.OCRBatchState) {
            window.OCRBatchState.selectedBatch = null;
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Make globally available
window.OCRApp = OCRApp;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => OCRApp.init());

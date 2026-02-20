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
        // Camera setup
        OCRCamera.setupUpload({
            fileBtn: document.getElementById('singleFileBtn'),
            cameraBtn: document.getElementById('singleCameraBtn'),
            fileInput: document.getElementById('singleFileInput'),
            cameraInput: document.getElementById('singleCameraInput'),
            uploadZone: document.getElementById('singleUploadZone'),
            uploadContent: document.getElementById('singleUploadContent'),
            imagePreview: document.getElementById('singleImagePreview'),
            previewImg: document.getElementById('singlePreviewImg'),
            changeImgBtn: document.getElementById('singleChangeImg'),
            nextBtn: document.getElementById('singleSubmitBtn'),
            onImageReady: (data) => { this.singleImageData = data; }
        });

        // Next step button
        document.getElementById('singleNextStep1').addEventListener('click', () => {
            document.getElementById('singleStep1').style.display = 'none';
            document.getElementById('singleStep2').style.display = 'block';
            OCRUI.updateSteps('singleFlow', 2);
        });

        // Back button
        document.getElementById('singleBackStep2').addEventListener('click', () => {
            document.getElementById('singleStep2').style.display = 'none';
            document.getElementById('singleStep1').style.display = 'block';
            OCRUI.updateSteps('singleFlow', 1);
        });

        // Submit button
        document.getElementById('singleSubmitBtn').addEventListener('click', () => this.submitSingle());

        // Back to mode selector
        document.getElementById('singleFlowBack').addEventListener('click', () => {
            document.getElementById('singleFlow').style.display = 'none';
            document.getElementById('singleModeCard').classList.remove('active');
            this.currentMode = null;
            // Reset steps
            document.getElementById('singleStep1').style.display = 'block';
            document.getElementById('singleStep2').style.display = 'none';
            OCRUI.updateSteps('singleFlow', 1);
        });
    },

    async submitSingle() {
        if (!this.singleImageData || this.singleImageData.length === 0) {
            alert('Please upload an image first.');
            return;
        }

        // Get batch data from the batch module
        const batchState = window.OCRBatchState;
        if (!batchState || !batchState.selectedBatch) {
            alert('Please select a question batch.');
            return;
        }

        const batch = batchState.selectedBatch;
        // Use the first question from the batch for single mode
        const firstQ = batch.questions[0];
        if (!firstQ) {
            alert('Selected batch has no questions.');
            return;
        }

        // Show scanning overlay
        OCRUI.showScanning();
        OCRUI.updateSteps('singleFlow', 3);

        // Call API with first question from batch — send all images
        const result = await OCRAPI.evaluateSingle({
            images: this.singleImageData.map(img => ({ data: img.base64, mimeType: img.mimeType })),
            question: firstQ.text,
            modelAnswer: firstQ.modelAnswer || '',
            maxMarks: firstQ.marks || 5
        });

        // Hide scanning, show results
        OCRUI.hideScanning();

        // Hide flow section
        document.getElementById('singleFlow').style.display = 'none';
        document.getElementById('modeSelector').style.display = 'none';

        // Save result to Firestore via batch module
        if (window.OCRBatchSave) {
            window.OCRBatchSave('single', batch, [result]);
        }

        // Render results
        OCRUI.renderSingleResults(result);
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

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
            nextBtn: document.getElementById('singleNextStep1'),
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
        if (!this.singleImageData) {
            alert('Please upload an image first.');
            return;
        }

        const question = document.getElementById('singleQuestion').value.trim();
        if (!question) {
            alert('Please enter the question.');
            document.getElementById('singleQuestion').focus();
            return;
        }

        const modelAnswer = document.getElementById('singleModelAnswer').value.trim();
        const maxMarks = parseInt(document.getElementById('singleMaxMarks').value) || 5;

        // Show scanning overlay
        OCRUI.showScanning();
        OCRUI.updateSteps('singleFlow', 3);

        // Call API
        const result = await OCRAPI.evaluateSingle({
            image: this.singleImageData.base64,
            mimeType: this.singleImageData.mimeType,
            question,
            modelAnswer,
            maxMarks
        });

        // Hide scanning, show results
        OCRUI.hideScanning();

        // Hide flow section
        document.getElementById('singleFlow').style.display = 'none';
        document.getElementById('modeSelector').style.display = 'none';

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
            nextBtn: document.getElementById('fullSheetNextStep1'),
            onImageReady: (data) => { this.fullSheetImageData = data; }
        });

        // Next step button
        document.getElementById('fullSheetNextStep1').addEventListener('click', () => {
            document.getElementById('fullSheetStep1').style.display = 'none';
            document.getElementById('fullSheetStep2').style.display = 'block';
            OCRUI.updateSteps('fullSheetFlow', 2);
            // Add first question if none exist
            if (this.questionCounter === 0) {
                this.addQuestion();
            }
        });

        // Back button
        document.getElementById('fullSheetBackStep2').addEventListener('click', () => {
            document.getElementById('fullSheetStep2').style.display = 'none';
            document.getElementById('fullSheetStep1').style.display = 'block';
            OCRUI.updateSteps('fullSheetFlow', 1);
        });

        // Add question button
        document.getElementById('addQuestionBtn').addEventListener('click', () => this.addQuestion());

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

    addQuestion() {
        this.questionCounter++;
        const list = document.getElementById('fullSheetQuestionsList');
        const num = this.questionCounter;

        const item = document.createElement('div');
        item.className = 'ocr-question-item ocr-fade-in';
        item.id = `questionItem${num}`;
        item.innerHTML = `
            <div class="ocr-question-item-header">
                <span class="ocr-question-number">Q${num}</span>
                <button class="ocr-question-remove" onclick="window.OCRApp.removeQuestion(${num})" title="Remove question">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
            <div class="ocr-question-fields">
                <textarea rows="2" placeholder="Enter question ${num}..." data-field="question" data-qnum="${num}"></textarea>
                <textarea rows="2" placeholder="Model answer (optional)" data-field="modelAnswer" data-qnum="${num}"></textarea>
                <div class="ocr-question-marks-row">
                    <label>Max Marks:</label>
                    <input type="number" value="5" min="1" max="100" data-field="marks" data-qnum="${num}">
                </div>
            </div>
        `;
        list.appendChild(item);
    },

    removeQuestion(num) {
        const item = document.getElementById(`questionItem${num}`);
        if (item) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(() => item.remove(), 300);
        }
    },

    getQuestions() {
        const items = document.querySelectorAll('.ocr-question-item');
        const questions = [];
        items.forEach((item, index) => {
            const qText = item.querySelector('[data-field="question"]')?.value.trim();
            const modelAnswer = item.querySelector('[data-field="modelAnswer"]')?.value.trim();
            const marks = parseInt(item.querySelector('[data-field="marks"]')?.value) || 5;

            if (qText) {
                questions.push({
                    id: `q${index + 1}`,
                    text: qText,
                    modelAnswer: modelAnswer || '',
                    marks
                });
            }
        });
        return questions;
    },

    async submitFullSheet() {
        if (!this.fullSheetImageData) {
            alert('Please upload an answer sheet image first.');
            return;
        }

        const questions = this.getQuestions();
        if (questions.length === 0) {
            alert('Please add at least one question.');
            return;
        }

        // Show scanning overlay
        OCRUI.showScanning();
        OCRUI.updateSteps('fullSheetFlow', 3);

        // Call API
        const result = await OCRAPI.evaluateFullSheet({
            image: this.fullSheetImageData.base64,
            mimeType: this.fullSheetImageData.mimeType,
            questions
        });

        // Hide scanning, show results
        OCRUI.hideScanning();

        // Hide flow section
        document.getElementById('fullSheetFlow').style.display = 'none';
        document.getElementById('modeSelector').style.display = 'none';

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
        document.getElementById('fullSheetQuestionsList').innerHTML = '';

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

        // Reset form fields
        document.getElementById('singleQuestion').value = '';
        document.getElementById('singleModelAnswer').value = '';
        document.getElementById('singleMaxMarks').value = '5';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Make globally available
window.OCRApp = OCRApp;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => OCRApp.init());

// ==================== OCR SCAN - UI MODULE ====================
// Handles rendering results, scanning overlay, and UI state

const OCRUI = {

    /**
     * Show scanning overlay with progress animation
     */
    showScanning() {
        const overlay = document.getElementById('scanningOverlay');
        const bar = document.getElementById('scanningBar');
        const status = document.getElementById('scanningStatus');

        overlay.style.display = 'flex';
        bar.style.width = '0%';

        // Animate progress bar with status messages
        const stages = [
            { progress: 15, message: 'Uploading image to AI engine...', delay: 300 },
            { progress: 35, message: 'Reading handwritten text from your image...', delay: 1500 },
            { progress: 55, message: 'Extracting answers from the scan...', delay: 3000 },
            { progress: 75, message: 'AI is evaluating your answers...', delay: 5000 },
            { progress: 90, message: 'Generating feedback and scores...', delay: 7000 },
        ];

        stages.forEach(({ progress, message, delay }) => {
            setTimeout(() => {
                bar.style.width = progress + '%';
                status.textContent = message;
            }, delay);
        });
    },

    /**
     * Hide scanning overlay
     */
    hideScanning() {
        const overlay = document.getElementById('scanningOverlay');
        const bar = document.getElementById('scanningBar');
        bar.style.width = '100%';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    },

    /**
     * Render single answer results
     */
    renderSingleResults(result) {
        const section = document.getElementById('resultsSection');
        const percentage = Math.round((result.score / (result.maxMarks || 5)) * 100);
        const scoreClass = this.getScoreClass(percentage);
        const emoji = this.getScoreEmoji(percentage);

        section.innerHTML = `
            <div class="ocr-results-header ocr-fade-in">
                <div class="ocr-results-emoji">${emoji}</div>
                <h2>Scan & Evaluation Complete!</h2>
                <p>Here's how the answer was graded</p>
            </div>

            <div class="ocr-score-overview ocr-fade-in ocr-fade-in-delay-1">
                <div class="ocr-score-card ocr-score-main">
                    <div class="ocr-score-value ${scoreClass} ocr-score-animate">${result.score}/${result.maxMarks || 5}</div>
                    <div class="ocr-score-label">Score</div>
                </div>
                <div class="ocr-score-card">
                    <div class="ocr-score-value ${scoreClass} ocr-score-animate">${percentage}%</div>
                    <div class="ocr-score-label">Percentage</div>
                </div>
                <div class="ocr-score-card">
                    <div class="ocr-score-value ocr-score-animate">${result.improvements ? result.improvements.length : 0}</div>
                    <div class="ocr-score-label">Suggestions</div>
                </div>
            </div>

            ${this.renderExtractedText(result.extractedText)}

            <div class="ocr-overall-feedback ocr-fade-in ocr-fade-in-delay-3">
                <h3>📋 AI Feedback</h3>
                <p>${result.feedback || 'No feedback available.'}</p>
            </div>

            ${this.renderImprovements(result.improvements)}

            <div class="ocr-results-actions ocr-fade-in ocr-fade-in-delay-4">
                <button class="ocr-btn ocr-btn-primary" onclick="window.OCRApp.scanAnother()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Scan Another Answer
                </button>
                <a href="index.html" class="ocr-btn ocr-btn-secondary">
                    🏠 Back to Home
                </a>
            </div>
        `;

        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Render full sheet results
     */
    renderFullSheetResults(result) {
        const section = document.getElementById('resultsSection');
        const totalScore = result.totalScore || 0;
        const totalMax = result.totalMaxMarks || 0;
        const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        const scoreClass = this.getScoreClass(percentage);
        const emoji = this.getScoreEmoji(percentage);
        const results = result.results || [];

        let answersHTML = results.map((r, i) => {
            const qPercentage = r.maxMarks > 0 ? Math.round((r.score / r.maxMarks) * 100) : 0;
            const qScoreClass = this.getScoreClass(qPercentage);
            return `
                <div class="ocr-answer-result ocr-fade-in ocr-fade-in-delay-${Math.min(i + 1, 4)}" id="answerResult${i}">
                    <div class="ocr-answer-result-header" onclick="window.OCRUI.toggleAnswer(${i})">
                        <div class="ocr-answer-result-left">
                            <span class="ocr-answer-q-number">Q${r.questionNumber || i + 1}</span>
                            <span class="ocr-answer-q-text">${this.escapeHTML(r.extractedAnswer ? r.extractedAnswer.substring(0, 60) + '...' : 'No answer detected')}</span>
                        </div>
                        <div class="ocr-answer-result-score">
                            <span class="ocr-answer-score-badge ${qScoreClass}">${r.score}/${r.maxMarks}</span>
                            <svg class="ocr-answer-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>
                    </div>
                    <div class="ocr-answer-detail">
                        <div class="ocr-detail-row">
                            <div class="ocr-detail-label">Extracted Answer</div>
                            <div class="ocr-detail-value">${this.escapeHTML(r.extractedAnswer || 'Not detected')}</div>
                        </div>
                        <div class="ocr-detail-row">
                            <div class="ocr-detail-label">Feedback</div>
                            <div class="ocr-detail-value">${this.escapeHTML(r.feedback || 'No feedback')}</div>
                        </div>
                        ${r.improvements && r.improvements.length > 0 ? `
                            <div class="ocr-detail-row">
                                <div class="ocr-detail-label">Improvements</div>
                                <ul class="ocr-improvements-list">
                                    ${r.improvements.map(imp => `<li>${this.escapeHTML(imp)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        section.innerHTML = `
            <div class="ocr-results-header ocr-fade-in">
                <div class="ocr-results-emoji">${emoji}</div>
                <h2>Full Sheet Evaluation Complete!</h2>
                <p>${results.length} answers scanned and evaluated</p>
            </div>

            <div class="ocr-score-overview ocr-fade-in ocr-fade-in-delay-1">
                <div class="ocr-score-card ocr-score-main">
                    <div class="ocr-score-value ${scoreClass} ocr-score-animate">${totalScore}/${totalMax}</div>
                    <div class="ocr-score-label">Total Score</div>
                </div>
                <div class="ocr-score-card">
                    <div class="ocr-score-value ${scoreClass} ocr-score-animate">${percentage}%</div>
                    <div class="ocr-score-label">Percentage</div>
                </div>
                <div class="ocr-score-card">
                    <div class="ocr-score-value ocr-score-animate">${results.length}</div>
                    <div class="ocr-score-label">Answers Found</div>
                </div>
            </div>

            ${this.renderExtractedText(result.extractedText)}

            <h3 style="font-family: var(--ocr-font-display); margin-bottom: 1rem; font-size: 1.1rem;">
                📝 Individual Answer Results
            </h3>
            ${answersHTML}

            ${result.overallFeedback ? `
                <div class="ocr-overall-feedback ocr-fade-in ocr-fade-in-delay-3">
                    <h3>📋 Overall Feedback</h3>
                    <p>${this.escapeHTML(result.overallFeedback)}</p>
                </div>
            ` : ''}

            <div class="ocr-results-actions ocr-fade-in ocr-fade-in-delay-4">
                <button class="ocr-btn ocr-btn-primary" onclick="window.OCRApp.scanAnother()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Scan Another Sheet
                </button>
                <a href="index.html" class="ocr-btn ocr-btn-secondary">
                    🏠 Back to Home
                </a>
            </div>
        `;

        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Toggle answer detail expansion
     */
    toggleAnswer(index) {
        const el = document.getElementById(`answerResult${index}`);
        if (el) el.classList.toggle('expanded');
    },

    /**
     * Render extracted text block
     */
    renderExtractedText(text) {
        if (!text) return '';
        return `
            <div class="ocr-extracted-text ocr-fade-in ocr-fade-in-delay-2">
                <div class="ocr-extracted-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Extracted Text (OCR)
                </div>
                <div class="ocr-extracted-content">${this.escapeHTML(text)}</div>
            </div>
        `;
    },

    /**
     * Render improvements list
     */
    renderImprovements(improvements) {
        if (!improvements || improvements.length === 0) return '';
        return `
            <div class="ocr-extracted-text ocr-fade-in ocr-fade-in-delay-3" style="margin-top: 1rem;">
                <div class="ocr-extracted-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Suggestions for Improvement
                </div>
                <ul class="ocr-improvements-list">
                    ${improvements.map(imp => `<li>${this.escapeHTML(imp)}</li>`).join('')}
                </ul>
            </div>
        `;
    },

    /**
     * Update step indicators
     */
    updateSteps(flowId, activeStep) {
        const flow = document.getElementById(flowId);
        if (!flow) return;
        const steps = flow.querySelectorAll('.ocr-step');
        steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (stepNum === activeStep) step.classList.add('active');
            if (stepNum < activeStep) step.classList.add('completed');
        });
    },

    /**
     * Get score class based on percentage
     */
    getScoreClass(percentage) {
        if (percentage >= 80) return 'score-excellent';
        if (percentage >= 60) return 'score-good';
        if (percentage >= 40) return 'score-average';
        return 'score-poor';
    },

    /**
     * Get emoji based on percentage
     */
    getScoreEmoji(percentage) {
        if (percentage >= 90) return '🏆';
        if (percentage >= 80) return '🌟';
        if (percentage >= 60) return '👍';
        if (percentage >= 40) return '📝';
        return '💪';
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Make globally available
window.OCRUI = OCRUI;

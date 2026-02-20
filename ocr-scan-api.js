// ==================== OCR SCAN - API MODULE ====================
// Handles API communication with /api/ocr-evaluate endpoint

const OCRAPI = {
    ENDPOINT: '/api/ocr-evaluate',

    /**
     * Evaluate a single answer image (or multiple pages)
     * @param {Object} params
     * @param {Array} params.images - Array of { data, mimeType } objects
     * @param {string} params.question - The question text
     * @param {string} params.modelAnswer - The model/correct answer
     * @param {number} params.maxMarks - Maximum marks for this question
     * @returns {Object} { extractedText, score, maxMarks, improvements, feedback }
     */
    async evaluateSingle({ images, question, modelAnswer, maxMarks }) {
        try {
            console.log('📸 Sending single answer for OCR evaluation...');

            const response = await fetch(this.ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'single',
                    images,
                    question,
                    modelAnswer,
                    maxMarks: maxMarks || 5
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Single OCR evaluation complete:', result);
            return result;

        } catch (error) {
            console.error('❌ Single OCR evaluation failed:', error);
            return {
                extractedText: '',
                score: 0,
                maxMarks: maxMarks || 5,
                improvements: ['Evaluation failed: ' + error.message],
                feedback: 'Could not process the image. Please try again with a clearer photo.'
            };
        }
    },

    /**
     * Evaluate a full answer sheet image(s) with multiple questions
     * @param {Object} params
     * @param {Array} params.images - Array of { data, mimeType } objects
     * @param {Array} params.questions - Array of { id, text, modelAnswer, marks }
     * @returns {Object} { extractedText, results[], totalScore, totalMaxMarks, overallFeedback }
     */
    async evaluateFullSheet({ images, questions }) {
        try {
            console.log(`📄 Sending full sheet for OCR evaluation (${questions.length} questions)...`);

            const response = await fetch(this.ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'full-sheet',
                    images,
                    questions
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Full sheet OCR evaluation complete:', result);
            return result;

        } catch (error) {
            console.error('❌ Full sheet OCR evaluation failed:', error);
            return {
                extractedText: '',
                results: questions.map(q => ({
                    questionId: q.id,
                    questionNumber: 0,
                    extractedAnswer: '',
                    score: 0,
                    maxMarks: q.marks || 5,
                    improvements: ['Evaluation failed: ' + error.message],
                    feedback: 'Could not process the image.'
                })),
                totalScore: 0,
                totalMaxMarks: questions.reduce((sum, q) => sum + (q.marks || 5), 0),
                overallFeedback: 'Failed to process the answer sheet. Please try again with a clearer photo.'
            };
        }
    }
};

// Make globally available
window.OCRAPI = OCRAPI;

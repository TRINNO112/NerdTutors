// ==================== OCR SCAN - BATCH INTEGRATION ====================
// Firebase module for loading question batches and saving OCR results
// This runs as type="module" alongside the non-module OCR scripts

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    collection,
    getDocs,
    addDoc,
    query,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// ==================== STATE ====================
window.OCRBatchState = {
    batches: [],
    selectedBatch: null,
    currentUser: null
};

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
    window.OCRBatchState.currentUser = user;
    if (user) {
        console.log('📦 OCR Batch: User logged in:', user.email);
        await loadBatches();
    } else {
        console.log('📦 OCR Batch: No user logged in');
        populateDropdowns([]);
    }
});

// ==================== LOAD BATCHES ====================
async function loadBatches() {
    try {
        const q = query(collection(db, 'questionBatches'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const batches = [];
        snapshot.forEach(docSnap => {
            batches.push({ id: docSnap.id, ...docSnap.data() });
        });

        window.OCRBatchState.batches = batches;
        console.log(`📦 Loaded ${batches.length} question batches`);
        populateDropdowns(batches);
    } catch (error) {
        console.error('📦 Error loading batches:', error);
        populateDropdowns([]);
    }
}

// ==================== POPULATE DROPDOWNS ====================
function populateDropdowns(batches) {
    const selectors = ['singleBatchSelect', 'fullSheetBatchSelect'];

    selectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (!select) return;

        select.innerHTML = '';

        if (batches.length === 0) {
            select.innerHTML = '<option value="">-- No batches available --</option>';
            return;
        }

        select.innerHTML = '<option value="">-- Select a batch --</option>';
        batches.forEach(batch => {
            const qCount = batch.questions?.length || 0;
            const totalMarks = batch.totalMarks || 0;
            const opt = document.createElement('option');
            opt.value = batch.id;
            opt.textContent = `${batch.name} (${qCount} Q, ${totalMarks} marks)`;
            select.appendChild(opt);
        });

        // Listen for selection changes
        select.addEventListener('change', () => onBatchSelected(selectorId));
    });
}

// ==================== ON BATCH SELECTED ====================
function onBatchSelected(selectorId) {
    const select = document.getElementById(selectorId);
    const batchId = select.value;

    // Determine which preview to update
    const isSingle = selectorId === 'singleBatchSelect';
    const previewId = isSingle ? 'singleBatchPreview' : 'fullSheetBatchPreview';
    const nameId = isSingle ? 'singleBatchName' : 'fullSheetBatchName';
    const qCountId = isSingle ? 'singleBatchQCount' : 'fullSheetBatchQCount';
    const marksId = isSingle ? 'singleBatchMarks' : 'fullSheetBatchMarks';
    const questionsId = isSingle ? 'singleBatchQuestions' : 'fullSheetBatchQuestions';

    const preview = document.getElementById(previewId);

    if (!batchId) {
        window.OCRBatchState.selectedBatch = null;
        if (preview) preview.style.display = 'none';
        // Disable the Continue button when no batch selected
        const nextBtnId = isSingle ? 'singleNextStep1' : 'fullSheetNextStep1';
        const nextBtn = document.getElementById(nextBtnId);
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const batch = window.OCRBatchState.batches.find(b => b.id === batchId);
    if (!batch) return;

    window.OCRBatchState.selectedBatch = batch;

    // Enable the Continue button when batch is selected
    const nextBtnId = isSingle ? 'singleNextStep1' : 'fullSheetNextStep1';
    const nextBtn = document.getElementById(nextBtnId);
    if (nextBtn) nextBtn.disabled = false;

    // Show preview
    if (preview) preview.style.display = 'block';

    document.getElementById(nameId).textContent = batch.name;
    document.getElementById(qCountId).textContent = batch.questions?.length || 0;
    document.getElementById(marksId).textContent = batch.totalMarks || 0;

    // Show question previews
    const questionsDiv = document.getElementById(questionsId);
    if (questionsDiv && batch.questions) {
        questionsDiv.innerHTML = batch.questions.map((q, i) =>
            `<div style="padding: 0.25rem 0; border-bottom: 1px solid #e0e0e0;">
                <strong>Q${i + 1}</strong> (${q.marks}m): ${q.text.substring(0, 80)}${q.text.length > 80 ? '...' : ''}
            </div>`
        ).join('');
    }
}

// ==================== SAVE RESULTS TO FIRESTORE ====================
window.OCRBatchSave = async function (mode, batch, results) {
    const user = window.OCRBatchState.currentUser;
    if (!user) {
        console.warn('📦 No user logged in, cannot save results');
        return;
    }

    try {
        // Calculate totals
        let totalEarned = 0;
        let totalMaxMarks = batch.totalMarks || 0;

        const resultItems = [];

        if (mode === 'single') {
            // Single mode: results is an array with one result object
            const r = results[0];
            const firstQ = batch.questions[0];
            const earned = r?.score || r?.earnedMarks || 0;
            totalEarned = earned;
            totalMaxMarks = firstQ?.marks || 5;

            resultItems.push({
                questionText: firstQ?.text || '',
                extractedAnswer: r?.extractedText || r?.studentAnswer || '',
                marks: firstQ?.marks || 5,
                earnedMarks: earned,
                feedback: r?.feedback || '',
                improvements: r?.improvements || []
            });
        } else {
            // Full sheet mode: results is the API response (could be array or object)
            const answers = Array.isArray(results) ? results : (results?.answers || results?.results || []);

            batch.questions.forEach((q, i) => {
                const answer = answers[i] || {};
                const earned = answer.score || answer.earnedMarks || 0;
                totalEarned += earned;

                resultItems.push({
                    questionText: q.text,
                    extractedAnswer: answer.extractedText || answer.studentAnswer || '',
                    marks: q.marks,
                    earnedMarks: earned,
                    feedback: answer.feedback || '',
                    improvements: answer.improvements || []
                });
            });
        }

        const percentage = totalMaxMarks > 0
            ? Math.round((totalEarned / totalMaxMarks) * 100)
            : 0;

        const payload = {
            studentId: user.uid,
            studentName: user.displayName || user.email || 'Anonymous',
            testType: 'ocr',
            batchName: batch.name,
            batchId: batch.id,
            totalQuestions: batch.questions.length,
            totalScore: `${totalEarned}/${totalMaxMarks}`,
            percentage: `${percentage}%`,
            results: resultItems,
            submittedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'testResults'), payload);
        console.log('✅ OCR results saved to Firestore!');
    } catch (error) {
        console.error('❌ Failed to save OCR results:', error);
    }
};

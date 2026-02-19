// ==================== BATCH MANAGER ====================
// Admin page for creating and managing question batches
// Stores batches in Firestore 'questionBatches' collection

import { auth, db } from './firebase-config.js';
import {
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Admin emails
const ADMIN_EMAILS = [
    'kaushtubh457@gmail.com',
    'jatinthacker000@gmail.com'
];

// State
let batches = [];
let editingBatchId = null;
let questionCounter = 0;

// ==================== AUTH ====================
const googleProvider = new GoogleAuthProvider();

document.getElementById('googleSignIn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed: ' + error.message, 'error');
    }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload();
});

onAuthStateChanged(auth, async (user) => {
    if (user && ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('batchContainer').style.display = 'block';
        document.getElementById('userEmail').textContent = user.email;
        await loadBatches();
    } else if (user) {
        showToast('Access denied. Not an admin account.', 'error');
        await signOut(auth);
    } else {
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('batchContainer').style.display = 'none';
    }
});

// ==================== LOAD BATCHES ====================
async function loadBatches() {
    const spinner = document.getElementById('loadingSpinner');
    const grid = document.getElementById('batchesGrid');
    const empty = document.getElementById('emptyState');

    spinner.style.display = 'block';
    grid.style.display = 'none';
    empty.style.display = 'none';

    try {
        const q = query(collection(db, 'questionBatches'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        batches = [];
        snapshot.forEach(docSnap => {
            batches.push({ id: docSnap.id, ...docSnap.data() });
        });

        spinner.style.display = 'none';
        document.getElementById('batchCount').textContent = `All Batches (${batches.length})`;

        if (batches.length === 0) {
            empty.style.display = 'block';
        } else {
            grid.style.display = 'grid';
            renderBatches();
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        spinner.style.display = 'none';
        showToast('Failed to load batches', 'error');
    }
}

function renderBatches() {
    const grid = document.getElementById('batchesGrid');

    grid.innerHTML = batches.map(batch => {
        const questions = batch.questions || [];
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        const dateStr = batch.createdAt?.toDate
            ? batch.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Unknown date';

        const previewQuestions = questions.slice(0, 3).map((q, i) =>
            `<div class="batch-q-preview">Q${i + 1}. ${escapeHTML(q.text)}</div>`
        ).join('');

        const moreCount = questions.length > 3 ? `<div class="batch-q-preview" style="color:#1e3c72;font-weight:600;">+ ${questions.length - 3} more questions</div>` : '';

        const categoryBadge = batch.category
            ? `<span class="batch-category-badge">${escapeHTML(batch.category)}</span>`
            : '';

        return `
            <div class="batch-card" data-id="${batch.id}">
                <div class="batch-card-header">
                    <div>
                        <div class="batch-card-title">📦 ${escapeHTML(batch.name)}</div>
                        ${categoryBadge}
                    </div>
                    <div class="batch-card-actions">
                        <button class="btn-icon edit" onclick="editBatch('${batch.id}')" title="Edit">✏️</button>
                        <button class="btn-icon delete" onclick="deleteBatch('${batch.id}', '${escapeHTML(batch.name)}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="batch-card-stats">
                    <div class="batch-stat">📝 <strong>${questions.length}</strong> Questions</div>
                    <div class="batch-stat">🎯 <strong>${totalMarks}</strong> Total Marks</div>
                </div>
                <div class="batch-card-questions">
                    ${previewQuestions}
                    ${moreCount}
                </div>
                <div class="batch-card-date">Created: ${dateStr}</div>
            </div>
        `;
    }).join('');

    // Add click-to-edit on entire card (for accessibility and mobile)
    grid.querySelectorAll('.batch-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking edit/delete buttons
            if (e.target.closest('.btn-icon')) return;
            const batchId = card.dataset.id;
            if (batchId) window.editBatch(batchId);
        });
    });
}

// ==================== MODAL MANAGEMENT ====================
const modal = document.getElementById('batchModal');
const modalTitle = document.getElementById('modalTitle');
const batchNameInput = document.getElementById('batchName');
const batchCategorySelect = document.getElementById('batchCategory');
const questionsContainer = document.getElementById('questionsContainer');

document.getElementById('btnCreateBatch').addEventListener('click', () => {
    editingBatchId = null;
    modalTitle.textContent = '📦 Create New Batch';
    batchNameInput.value = '';
    batchCategorySelect.value = '';
    questionsContainer.innerHTML = '';
    questionCounter = 0;
    updateQuestionCount();
    addQuestionItem(); // Start with one question
    resetCsvUpload();
    modal.classList.add('active');
});

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancelModal').addEventListener('click', closeModal);
document.getElementById('btnAddQuestion').addEventListener('click', addQuestionItem);

// Close modal on overlay click
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

function closeModal() {
    modal.classList.remove('active');
    editingBatchId = null;
}

function updateQuestionCount() {
    const badge = document.getElementById('questionCountBadge');
    const count = questionsContainer.querySelectorAll('.modal-q-item').length;
    badge.textContent = count;
}

function addQuestionItem(data = null) {
    questionCounter++;
    const num = questionCounter;

    const item = document.createElement('div');
    item.className = 'modal-q-item';
    item.dataset.num = num;
    item.innerHTML = `
        <div class="modal-q-item-header">
            <span class="modal-q-number">Q${questionsContainer.querySelectorAll('.modal-q-item').length + 1}</span>
            <button class="btn-remove-q" onclick="removeQuestionItem(this)">✕</button>
        </div>
        <div class="form-group">
            <label>Question Text *</label>
            <textarea data-field="text" rows="2" placeholder="Type the question here...">${data?.text || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Model Answer <span class="optional-tag">optional</span></label>
            <textarea data-field="modelAnswer" rows="2" placeholder="Type the correct answer...">${data?.modelAnswer || ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group form-group-marks">
                <label>Marks *</label>
                <input type="number" data-field="marks" min="1" max="100" value="${data?.marks || 5}" placeholder="5">
            </div>
        </div>
    `;

    questionsContainer.appendChild(item);
    updateQuestionCount();

    // Scroll to new item
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Global function for inline onclick
window.removeQuestionItem = function (btn) {
    const item = btn.closest('.modal-q-item');
    item.remove();
    // Re-number remaining questions
    const items = questionsContainer.querySelectorAll('.modal-q-item');
    items.forEach((el, i) => {
        el.querySelector('.modal-q-number').textContent = `Q${i + 1}`;
    });
    updateQuestionCount();
};

// ==================== CSV / EXCEL UPLOAD ====================
const csvUploadZone = document.getElementById('csvUploadZone');
const csvFileInput = document.getElementById('csvFileInput');
const csvStatus = document.getElementById('csvStatus');

csvUploadZone.addEventListener('click', () => csvFileInput.click());

// Drag & drop
csvUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvUploadZone.classList.add('drag-over');
});
csvUploadZone.addEventListener('dragleave', () => {
    csvUploadZone.classList.remove('drag-over');
});
csvUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    csvUploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
});

csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCsvFile(file);
});

// Download Template
document.getElementById('btnDownloadTemplate').addEventListener('click', () => {
    const template = `question,modelAnswer,marks
What is GDP?,Gross Domestic Product is the total value of goods and services produced in a country,5
Define inflation,A sustained increase in the general price level of goods and services over time,3
Explain the law of demand,As the price of a good increases the quantity demanded decreases and vice versa,4
`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_batch_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Template downloaded!', 'success');
});

// Format Guide toggle
document.getElementById('btnFormatGuide').addEventListener('click', () => {
    const guide = document.getElementById('formatGuide');
    const btn = document.getElementById('btnFormatGuide');
    if (guide.style.display === 'none') {
        guide.style.display = 'block';
        btn.textContent = '✕ Hide Format Guide';
    } else {
        guide.style.display = 'none';
        btn.textContent = '❓ View Format Guide';
    }
});

function resetCsvUpload() {
    csvFileInput.value = '';
    csvStatus.style.display = 'none';
    csvStatus.innerHTML = '';
}

async function handleCsvFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
        // Try loading SheetJS for Excel parsing
        csvStatus.style.display = 'block';
        csvStatus.innerHTML = '<span style="color:#f59e0b;">⏳ Loading Excel parser...</span>';

        try {
            // Dynamically load SheetJS if not already loaded
            if (typeof XLSX === 'undefined') {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            }

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            importRows(rows, file.name);
        } catch (error) {
            console.error('Excel parse error:', error);
            csvStatus.innerHTML = '<span style="color:#ef4444;">❌ Failed to parse Excel file. Try CSV instead.</span>';
        }
    } else if (ext === 'csv') {
        const text = await file.text();
        const rows = parseCsv(text);
        importRows(rows, file.name);
    } else {
        csvStatus.style.display = 'block';
        csvStatus.innerHTML = '<span style="color:#ef4444;">❌ Unsupported file type. Use .csv or .xlsx</span>';
    }
}

function parseCsv(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length < 1 || !values[0]) continue;

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
}

function importRows(rows, filename) {
    if (rows.length === 0) {
        csvStatus.style.display = 'block';
        csvStatus.innerHTML = '<span style="color:#ef4444;">❌ No data rows found in file</span>';
        return;
    }

    let imported = 0;
    rows.forEach(row => {
        // Try to find question text in various column names
        const text = row.question || row.Question || row.text || row.Text ||
            row['question text'] || row['Question Text'] || row.q || '';
        if (!text.trim()) return;

        const modelAnswer = row.modelAnswer || row['model answer'] || row['Model Answer'] ||
            row.modelanswer || row.answer || row.Answer || '';
        const marks = parseInt(row.marks || row.Marks || row.mark || row.Mark || row.score || row.Score) || 5;

        addQuestionItem({ text: text.trim(), modelAnswer: modelAnswer.trim(), marks });
        imported++;
    });

    csvStatus.style.display = 'block';
    if (imported > 0) {
        csvStatus.innerHTML = `<span style="color:#22c55e;">✅ Imported <strong>${imported}</strong> questions from <strong>${filename}</strong></span>`;
        showToast(`Imported ${imported} questions from CSV`, 'success');
    } else {
        csvStatus.innerHTML = '<span style="color:#ef4444;">❌ No valid questions found. Ensure columns: question, modelAnswer, marks</span>';
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ==================== SAVE BATCH ====================
document.getElementById('btnSaveBatch').addEventListener('click', async () => {
    const name = batchNameInput.value.trim();
    if (!name) {
        showToast('Please enter a batch name', 'error');
        batchNameInput.focus();
        return;
    }

    const category = batchCategorySelect.value;
    if (!category) {
        showToast('Please select a category', 'error');
        batchCategorySelect.focus();
        return;
    }

    // Collect questions
    const items = questionsContainer.querySelectorAll('.modal-q-item');
    if (items.length === 0) {
        showToast('Please add at least one question', 'error');
        return;
    }

    const questions = [];
    let valid = true;

    items.forEach((item, index) => {
        const text = item.querySelector('[data-field="text"]').value.trim();
        const modelAnswer = item.querySelector('[data-field="modelAnswer"]').value.trim();
        const marks = parseInt(item.querySelector('[data-field="marks"]').value) || 5;

        if (!text) {
            showToast(`Question #${index + 1} is empty`, 'error');
            item.querySelector('[data-field="text"]').focus();
            valid = false;
            return;
        }

        questions.push({ text, modelAnswer, category, marks });
    });

    if (!valid) return;

    const saveBtn = document.getElementById('btnSaveBatch');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
        const batchData = {
            name,
            category,
            questions,
            totalMarks,
            questionCount: questions.length,
            createdBy: auth.currentUser.email,
            updatedAt: serverTimestamp()
        };

        if (editingBatchId) {
            // Update existing
            await updateDoc(doc(db, 'questionBatches', editingBatchId), batchData);
            showToast('Batch updated successfully!', 'success');
        } else {
            // Create new
            batchData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'questionBatches'), batchData);
            showToast('Batch created successfully!', 'success');
        }

        closeModal();
        await loadBatches();
    } catch (error) {
        console.error('Error saving batch:', error);
        showToast('Failed to save batch: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Batch';
    }
});

// ==================== EDIT BATCH ====================
window.editBatch = function (batchId) {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    editingBatchId = batchId;
    modalTitle.textContent = '✏️ Edit Batch';
    batchNameInput.value = batch.name;
    batchCategorySelect.value = batch.category || '';
    questionsContainer.innerHTML = '';
    questionCounter = 0;
    resetCsvUpload();

    (batch.questions || []).forEach(q => addQuestionItem(q));

    if (batch.questions?.length === 0) addQuestionItem();

    updateQuestionCount();
    modal.classList.add('active');
};

// ==================== DELETE BATCH ====================
window.deleteBatch = async function (batchId, batchName) {
    if (!confirm(`Delete batch "${batchName}"?\n\nThis cannot be undone.`)) return;

    try {
        await deleteDoc(doc(db, 'questionBatches', batchId));
        showToast('Batch deleted', 'success');
        await loadBatches();
    } catch (error) {
        console.error('Error deleting batch:', error);
        showToast('Failed to delete batch', 'error');
    }
};

// ==================== UTILS ====================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

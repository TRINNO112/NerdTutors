import { 
    db, 
    auth,
    collection, 
    doc, 
    setDoc, 
    getDocs,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    query,
    orderBy
} from './firebaseConfig.js';

// DOM Elements
const loginSection = document.getElementById('loginSection');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const questionInput = document.getElementById('questionInput');
const modelAnswerInput = document.getElementById('modelAnswerInput');
const questionsList = document.getElementById('questionsList');
const submissionsList = document.getElementById('submissionsList');

// Auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        showAdminPanel();
    } else {
        showLoginSection();
    }
});

// Login
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
});

// Show/Hide sections
function showAdminPanel() {
    loginSection.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadQuestions();
    loadSubmissions();
}

function showLoginSection() {
    loginSection.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

// Add new question
addQuestionBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    const modelAnswer = modelAnswerInput.value.trim();
    
    if (!question || !modelAnswer) {
        alert('Please fill in both question and model answer.');
        return;
    }
    
    try {
        const questionId = 'q_' + Date.now();
        await setDoc(doc(db, 'questions', questionId), {
            question: question,
            modelAnswer: modelAnswer,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.email
        });
        
        alert('Question added successfully!');
        questionInput.value = '';
        modelAnswerInput.value = '';
        loadQuestions();
    } catch (error) {
        alert('Failed to add question: ' + error.message);
    }
});

// Load questions
async function loadQuestions() {
    try {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        questionsList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const questionCard = createQuestionCard(doc.id, data);
            questionsList.appendChild(questionCard);
        });
        
        if (querySnapshot.empty) {
            questionsList.innerHTML = '<p class="no-data">No questions added yet.</p>';
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        questionsList.innerHTML = '<p class="error">Failed to load questions.</p>';
    }
}

// Create question card
function createQuestionCard(id, data) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div class="question-header">
            <h4>Question ID: ${id}</h4>
            <button class="btn-delete" data-id="${id}">Delete</button>
        </div>
        <div class="question-content">
            <p><strong>Question:</strong> ${data.question}</p>
            <p><strong>Model Answer:</strong> ${data.modelAnswer.substring(0, 200)}...</p>
            <p class="timestamp">Created: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : 'Unknown'}</p>
        </div>
    `;
    
    // Add delete functionality
    card.querySelector('.btn-delete').addEventListener('click', async (e) => {
        if (confirm('Are you sure you want to delete this question?')) {
            try {
                await deleteDoc(doc(db, 'questions', e.target.dataset.id));
                loadQuestions();
            } catch (error) {
                alert('Failed to delete question: ' + error.message);
            }
        }
    });
    
    return card;
}

// Load submissions
async function loadSubmissions() {
    try {
        const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        submissionsList.innerHTML = '';
        
        let count = 0;
        querySnapshot.forEach((doc) => {
            if (count < 10) { // Show only recent 10 submissions
                const data = doc.data();
                const submissionCard = createSubmissionCard(doc.id, data);
                submissionsList.appendChild(submissionCard);
                count++;
            }
        });
        
        if (querySnapshot.empty) {
            submissionsList.innerHTML = '<p class="no-data">No submissions yet.</p>';
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        submissionsList.innerHTML = '<p class="error">Failed to load submissions.</p>';
    }
}

// Create submission card
function createSubmissionCard(id, data) {
    const card = document.createElement('div');
    card.className = 'submission-card';
    
    const scoreClass = data.score >= 80 ? 'excellent' : data.score >= 60 ? 'good' : 'needs-improvement';
    
    card.innerHTML = `
        <div class="submission-header">
            <h4>${data.studentName}</h4>
            <span class="score-badge ${scoreClass}">${data.score}/100</span>
        </div>
        <div class="submission-content">
            <p><strong>Question:</strong> ${data.question.substring(0, 100)}...</p>
            <p><strong>Answer Preview:</strong> ${data.studentAnswer.substring(0, 150)}...</p>
            <p class="timestamp">Submitted: ${data.submittedAt ? new Date(data.submittedAt.toDate()).toLocaleString() : 'Unknown'}</p>
            <button class="btn-view-details" data-id="${id}">View Details</button>
        </div>
    `;
    
    // Add view details functionality
    card.querySelector('.btn-view-details').addEventListener('click', () => {
        showSubmissionDetails(data);
    });
    
    return card;
}

// Show submission details
function showSubmissionDetails(data) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Submission Details</h2>
            <p><strong>Student:</strong> ${data.studentName}</p>
            <p><strong>Score:</strong> ${data.score}/100</p>
            <div class="detail-section">
                <h3>Question</h3>
                <p>${data.question}</p>
            </div>
            <div class="detail-section">
                <h3>Student Answer</h3>
                <p>${data.studentAnswer}</p>
            </div>
            <div class="detail-section">
                <h3>AI Feedback</h3>
                <p>${data.feedback}</p>
            </div>
            <div class="detail-section">
                <h3>Areas for Improvement</h3>
                <ul>
                    ${data.improvements.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}
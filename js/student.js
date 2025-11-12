import { 
    db, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    serverTimestamp,
    query,
    orderBy
} from './firebaseConfig.js';

let currentQuestion = null;
let studentData = {};

// DOM Elements
const nameSection = document.getElementById('nameSection');
const testSection = document.getElementById('testSection');
const resultsSection = document.getElementById('resultsSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const questionSelect = document.getElementById('questionSelect');
const studentNameInput = document.getElementById('studentName');
const startTestBtn = document.getElementById('startTest');
const submitAnswerBtn = document.getElementById('submitAnswer');
const resetTestBtn = document.getElementById('resetTest');
const newTestBtn = document.getElementById('newTest');
const studentAnswer = document.getElementById('studentAnswer');
const wordCount = document.getElementById('wordCount');

// Load available questions
async function loadQuestions() {
    try {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        questionSelect.innerHTML = '<option value="">Select a question...</option>';
        
        querySnapshot.forEach((doc) => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().question.substring(0, 100) + '...';
            questionSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please refresh the page.');
    }
}

// Start test
startTestBtn.addEventListener('click', async () => {
    const name = studentNameInput.value.trim();
    const questionId = questionSelect.value;
    
    if (!name || !questionId) {
        alert('Please enter your name and select a question.');
        return;
    }
    
    try {
        const questionDoc = await getDoc(doc(db, 'questions', questionId));
        if (!questionDoc.exists()) {
            alert('Question not found.');
            return;
        }
        
        currentQuestion = {
            id: questionId,
            ...questionDoc.data()
        };
        
        studentData = {
            name: name,
            questionId: questionId
        };
        
        // Display question
        document.getElementById('displayName').textContent = `Student: ${name}`;
        document.getElementById('questionText').textContent = currentQuestion.question;
        
        // Show test section
        nameSection.classList.add('hidden');
        testSection.classList.remove('hidden');
    } catch (error) {
        console.error('Error starting test:', error);
        alert('Failed to start test. Please try again.');
    }
});

// Word count
studentAnswer.addEventListener('input', () => {
    const words = studentAnswer.value.trim().split(/\s+/).filter(word => word.length > 0);
    wordCount.textContent = words.length;
});

// Submit answer
submitAnswerBtn.addEventListener('click', async () => {
    const answer = studentAnswer.value.trim();
    
    if (!answer) {
        alert('Please write your answer before submitting.');
        return;
    }
    
    loadingSpinner.classList.remove('hidden');
    
    try {
        // Call Vercel function to evaluate
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentName: studentData.name,
                questionId: studentData.questionId,
                question: currentQuestion.question,
                studentAnswer: answer,
                modelAnswer: currentQuestion.modelAnswer
            })
        });
        
        if (!response.ok) {
            throw new Error('Evaluation failed');
        }
        
        const result = await response.json();
        
        // Save submission to Firebase
        const submissionId = `${studentData.questionId}_${Date.now()}`;
        await setDoc(doc(db, 'submissions', submissionId), {
            studentName: studentData.name,
            questionId: studentData.questionId,
            question: currentQuestion.question,
            studentAnswer: answer,
            score: result.score,
            feedback: result.feedback,
            improvements: result.improvements,
            submittedAt: serverTimestamp()
        });
        
        // Display results
        displayResults(result);
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Failed to submit answer. Please try again.');
    } finally {
        loadingSpinner.classList.add('hidden');
    }
});

// Display results
function displayResults(result) {
    document.getElementById('scoreValue').textContent = result.score;
    document.getElementById('feedbackContent').innerHTML = `<p>${result.feedback}</p>`;
    
    // Display improvements as list
    const improvementsList = result.improvements.map(item => `<li>${item}</li>`).join('');
    document.getElementById('improvementsContent').innerHTML = `<ul>${improvementsList}</ul>`;
    
    // Update score circle color based on score
    const scoreCircle = document.querySelector('.score-circle');
    if (result.score >= 80) {
        scoreCircle.className = 'score-circle excellent';
    } else if (result.score >= 60) {
        scoreCircle.className = 'score-circle good';
    } else {
        scoreCircle.className = 'score-circle needs-improvement';
    }
    
    testSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
}

// Reset test
resetTestBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to start a new test? Your current answer will be lost.')) {
        resetToStart();
    }
});

newTestBtn.addEventListener('click', resetToStart);

function resetToStart() {
    studentAnswer.value = '';
    studentNameInput.value = '';
    questionSelect.value = '';
    wordCount.textContent = '0';
    
    nameSection.classList.remove('hidden');
    testSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

// Initialize
loadQuestions();
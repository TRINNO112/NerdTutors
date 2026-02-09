// Firebase imports
import { auth, db } from './firebase-config.js';
import {
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ==================== APP STATE ====================
const appState = {
    questions: [],
    currentQuestionIndex: 0,
    answers: [], // { questionId, selectedOption, isCorrect }
    studentName: '',
    studentId: '',
    startTime: null,
    endTime: null
};

// ==================== LOCAL STORAGE KEYS ====================
const STORAGE_KEYS = {
    SAVED_NAME: 'nerdtutors_mcq_name',
    REMEMBER_NAME: 'nerdtutors_mcq_remember'
};

// ==================== DOM ELEMENTS ====================
const elements = {
    loadingState: document.getElementById('loadingState'),
    setupContainer: document.getElementById('setupContainer'),
    quizContainer: document.getElementById('quizContainer'),
    resultsContainer: document.getElementById('resultsContainer'),

    // Setup - Name
    nameGroup: document.getElementById('nameGroup'),
    studentName: document.getElementById('studentName'),
    rememberName: document.getElementById('rememberName'),
    savedNameDisplay: document.getElementById('savedNameDisplay'),
    savedNameValue: document.getElementById('savedNameValue'),
    changeNameBtn: document.getElementById('changeNameBtn'),
    startQuizBtn: document.getElementById('startQuizBtn'),
    questionCountInfo: document.getElementById('questionCountInfo'),

    // Quiz
    progressFill: document.getElementById('progressFill'),
    currentQuestionNum: document.getElementById('currentQuestionNum'),
    totalQuestions: document.getElementById('totalQuestions'),
    categoryBadge: document.getElementById('categoryBadge'),
    difficultyBadge: document.getElementById('difficultyBadge'),
    questionText: document.getElementById('questionText'),
    optionsContainer: document.getElementById('optionsContainer'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),

    // Results
    resultsEmoji: document.getElementById('resultsEmoji'),
    studentNameResult: document.getElementById('studentNameResult'),
    scoreCircle: document.getElementById('scoreCircle'),
    scorePercentage: document.getElementById('scorePercentage'),
    correctCount: document.getElementById('correctCount'),
    incorrectCount: document.getElementById('incorrectCount'),
    skippedCount: document.getElementById('skippedCount'),
    timeTaken: document.getElementById('timeTaken'),
    reviewBtn: document.getElementById('reviewBtn'),
    retryBtn: document.getElementById('retryBtn'),
    reviewSection: document.getElementById('reviewSection'),
    reviewList: document.getElementById('reviewList')
};

// ==================== SAVED NAME MANAGEMENT ====================
function loadSavedName() {
    const savedName = localStorage.getItem(STORAGE_KEYS.SAVED_NAME);
    const rememberEnabled = localStorage.getItem(STORAGE_KEYS.REMEMBER_NAME) === 'true';

    if (savedName && rememberEnabled) {
        appState.studentName = savedName;
        showSavedNameUI(savedName);
        return true;
    }
    return false;
}

function showSavedNameUI(name) {
    elements.nameGroup.style.display = 'none';
    elements.savedNameDisplay.style.display = 'flex';
    elements.savedNameValue.textContent = name;
}

function showNameInputUI() {
    elements.nameGroup.style.display = 'block';
    elements.savedNameDisplay.style.display = 'none';
    elements.studentName.value = '';
    appState.studentName = '';
}

function saveNameToStorage(name) {
    localStorage.setItem(STORAGE_KEYS.SAVED_NAME, name);
    localStorage.setItem(STORAGE_KEYS.REMEMBER_NAME, 'true');
}

function clearSavedName() {
    localStorage.removeItem(STORAGE_KEYS.SAVED_NAME);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_NAME);
}

// ==================== AUTHENTICATION ====================
async function setupAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                appState.studentId = user.uid;
                resolve(user);
            } else {
                try {
                    const credential = await signInAnonymously(auth);
                    appState.studentId = credential.user.uid;
                    resolve(credential.user);
                } catch (error) {
                    console.error('Auth error:', error);
                    reject(error);
                }
            }
        });
    });
}

// ==================== LOAD MCQ QUESTIONS ====================
async function loadMCQQuestions() {
    try {
        const questionsRef = collection(db, 'questions');
        let q = query(questionsRef, where('type', '==', 'mcq'), where('status', '==', 'active'));

        const snapshot = await getDocs(q);
        const allQuestions = [];

        snapshot.forEach((doc) => {
            allQuestions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Loaded ${allQuestions.length} MCQ questions`);
        return allQuestions;

    } catch (error) {
        console.error('Error loading questions:', error);
        return [];
    }
}

// ==================== UPDATE QUESTION COUNT INFO ====================
async function updateQuestionCountInfo() {
    const allQuestions = await loadMCQQuestions();
    elements.questionCountInfo.textContent = `${allQuestions.length} questions available`;

    if (allQuestions.length === 0) {
        elements.startQuizBtn.disabled = true;
        elements.questionCountInfo.innerHTML = `<span style="color: #ef4444;">No MCQ questions available. Please check back later.</span>`;
    } else {
        elements.startQuizBtn.disabled = false;
    }
}

// ==================== START QUIZ ====================
async function startQuiz() {
    // Get student name
    let studentName = appState.studentName; // Already set if using saved name

    // If not using saved name, get from input
    if (!studentName) {
        studentName = elements.studentName.value.trim();
        if (!studentName) {
            alert('Please enter your name');
            return;
        }

        // Check if should save name
        if (elements.rememberName.checked) {
            saveNameToStorage(studentName);
        }
    }

    appState.studentName = studentName;

    // Load ALL questions (no filtering)
    const allQuestions = await loadMCQQuestions();

    if (allQuestions.length === 0) {
        alert('No MCQ questions available. Please check back later.');
        return;
    }

    // Shuffle questions
    appState.questions = shuffleArray(allQuestions);

    appState.answers = new Array(appState.questions.length).fill(null).map(() => ({
        questionId: '',
        selectedOption: null,
        isCorrect: false
    }));

    // Initialize answers with question IDs
    appState.questions.forEach((q, i) => {
        appState.answers[i].questionId = q.id;
    });

    appState.currentQuestionIndex = 0;
    appState.startTime = new Date();

    // Show quiz
    elements.setupContainer.style.display = 'none';
    elements.quizContainer.style.display = 'block';
    elements.totalQuestions.textContent = appState.questions.length;

    displayQuestion();
}

// ==================== DISPLAY QUESTION ====================
function displayQuestion() {
    const question = appState.questions[appState.currentQuestionIndex];
    const answer = appState.answers[appState.currentQuestionIndex];

    // Update progress
    const progress = ((appState.currentQuestionIndex + 1) / appState.questions.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.currentQuestionNum.textContent = appState.currentQuestionIndex + 1;

    // Update badges
    elements.categoryBadge.textContent = question.category || 'General';
    elements.difficultyBadge.textContent = question.difficulty || 'Medium';
    elements.difficultyBadge.className = `difficulty-badge ${(question.difficulty || 'Medium').toLowerCase()}`;

    // Update question text
    elements.questionText.textContent = question.text;

    // Generate options
    const options = [
        { letter: 'A', text: question.options?.A || '' },
        { letter: 'B', text: question.options?.B || '' },
        { letter: 'C', text: question.options?.C || '' },
        { letter: 'D', text: question.options?.D || '' }
    ];

    elements.optionsContainer.innerHTML = '';

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (answer.selectedOption === option.letter) {
            btn.classList.add('selected');
        }

        btn.innerHTML = `
            <span class="option-letter">${option.letter}</span>
            <span class="option-text">${option.text}</span>
        `;

        btn.addEventListener('click', () => selectOption(option.letter));
        elements.optionsContainer.appendChild(btn);
    });

    // Update navigation buttons
    elements.prevBtn.disabled = appState.currentQuestionIndex === 0;

    if (appState.currentQuestionIndex === appState.questions.length - 1) {
        elements.nextBtn.textContent = 'Submit Quiz ✓';
        elements.nextBtn.onclick = finishQuiz;
    } else {
        elements.nextBtn.textContent = 'Next →';
        elements.nextBtn.onclick = nextQuestion;
    }
}

// ==================== SELECT OPTION ====================
function selectOption(letter) {
    const question = appState.questions[appState.currentQuestionIndex];

    appState.answers[appState.currentQuestionIndex] = {
        questionId: question.id,
        selectedOption: letter,
        isCorrect: letter === question.correctAnswer
    };

    // Update UI
    const optionBtns = elements.optionsContainer.querySelectorAll('.option-btn');
    optionBtns.forEach((btn, i) => {
        const optionLetter = ['A', 'B', 'C', 'D'][i];
        btn.classList.remove('selected');
        if (optionLetter === letter) {
            btn.classList.add('selected');
        }
    });
}

// ==================== NAVIGATION ====================
function nextQuestion() {
    if (appState.currentQuestionIndex < appState.questions.length - 1) {
        appState.currentQuestionIndex++;
        displayQuestion();
    }
}

function prevQuestion() {
    if (appState.currentQuestionIndex > 0) {
        appState.currentQuestionIndex--;
        displayQuestion();
    }
}

// ==================== FINISH QUIZ ====================
async function finishQuiz() {
    appState.endTime = new Date();

    // Calculate results
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    appState.answers.forEach(answer => {
        if (answer.selectedOption === null) {
            skipped++;
        } else if (answer.isCorrect) {
            correct++;
        } else {
            incorrect++;
        }
    });

    const totalQuestions = appState.questions.length;
    const percentage = Math.round((correct / totalQuestions) * 100);

    // Calculate time taken
    const timeTaken = Math.round((appState.endTime - appState.startTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;

    // Update results UI
    elements.quizContainer.style.display = 'none';
    elements.resultsContainer.style.display = 'block';

    elements.studentNameResult.textContent = `Great job, ${appState.studentName}!`;
    elements.scorePercentage.textContent = `${percentage}%`;
    elements.correctCount.textContent = correct;
    elements.incorrectCount.textContent = incorrect;
    elements.skippedCount.textContent = skipped;
    elements.timeTaken.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;

    // Set emoji and circle color based on score
    if (percentage >= 80) {
        elements.resultsEmoji.textContent = '🎉';
        elements.scoreCircle.className = 'score-circle high';
    } else if (percentage >= 50) {
        elements.resultsEmoji.textContent = '👍';
        elements.scoreCircle.className = 'score-circle medium';
    } else {
        elements.resultsEmoji.textContent = '💪';
        elements.scoreCircle.className = 'score-circle low';
    }

    // Save results to Firebase
    await saveResults(correct, incorrect, skipped, percentage, timeTaken);
}

// ==================== SAVE RESULTS ====================
async function saveResults(correct, incorrect, skipped, percentage, timeTaken) {
    try {
        const results = appState.questions.map((q, i) => ({
            questionId: q.id,
            questionText: q.text,
            selectedOption: appState.answers[i].selectedOption,
            correctAnswer: q.correctAnswer,
            isCorrect: appState.answers[i].isCorrect,
            marks: 1,
            earnedMarks: appState.answers[i].isCorrect ? 1 : 0
        }));

        await addDoc(collection(db, 'testResults'), {
            studentId: appState.studentId,
            studentName: appState.studentName,
            testType: 'mcq',
            totalQuestions: appState.questions.length,
            totalScore: `${correct}/${appState.questions.length}`,
            percentage: `${percentage}%`,
            correctAnswers: correct,
            incorrectAnswers: incorrect,
            skippedQuestions: skipped,
            timeTaken: timeTaken,
            results: results,
            submittedAt: serverTimestamp()
        });

        console.log('Results saved successfully');

    } catch (error) {
        console.error('Error saving results:', error);
    }
}

// ==================== REVIEW ANSWERS ====================
function showReview() {
    elements.reviewSection.style.display = 'block';
    elements.reviewList.innerHTML = '';

    appState.questions.forEach((question, i) => {
        const answer = appState.answers[i];
        const options = question.options || { A: '', B: '', C: '', D: '' };

        let statusClass = 'skipped';
        if (answer.selectedOption !== null) {
            statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        }

        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${statusClass}`;
        reviewItem.innerHTML = `
            <div class="review-question">Q${i + 1}: ${question.text}</div>
            <div class="review-answer">
                <span class="review-your-answer">
                    Your Answer: ${answer.selectedOption ? `${answer.selectedOption}) ${options[answer.selectedOption]}` : 'Skipped'}
                </span>
                ${!answer.isCorrect ? `
                    <span class="review-correct-answer">
                        Correct: ${question.correctAnswer}) ${options[question.correctAnswer]}
                    </span>
                ` : ''}
            </div>
        `;

        elements.reviewList.appendChild(reviewItem);
    });

    elements.reviewBtn.style.display = 'none';
}

// ==================== RETRY QUIZ ====================
function retryQuiz() {
    // Reset state
    appState.questions = [];
    appState.answers = [];
    appState.currentQuestionIndex = 0;
    appState.startTime = null;
    appState.endTime = null;

    // Show setup
    elements.resultsContainer.style.display = 'none';
    elements.reviewSection.style.display = 'none';
    elements.reviewBtn.style.display = 'inline-block';
    elements.setupContainer.style.display = 'block';

    // Reload saved name if available
    loadSavedName();
}

// ==================== UTILITY FUNCTIONS ====================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    elements.startQuizBtn.addEventListener('click', startQuiz);
    elements.prevBtn.addEventListener('click', prevQuestion);
    elements.reviewBtn.addEventListener('click', showReview);
    elements.retryBtn.addEventListener('click', retryQuiz);

    // Change name button
    elements.changeNameBtn.addEventListener('click', () => {
        clearSavedName();
        showNameInputUI();
    });
}

// ==================== INITIALIZATION ====================
async function init() {
    try {
        // Setup auth
        await setupAuth();

        // Check for saved name
        const hasSavedName = loadSavedName();

        // Setup event listeners
        setupEventListeners();

        // Load initial question count
        await updateQuestionCountInfo();

        // Hide loading, show setup
        elements.loadingState.style.display = 'none';
        elements.setupContainer.style.display = 'block';

        console.log('MCQ Quiz initialized');

    } catch (error) {
        console.error('Initialization error:', error);
        elements.loadingState.innerHTML = '<p style="color: #ef4444;">Failed to load quiz. Please refresh the page.</p>';
    }
}

// Start the app
init();

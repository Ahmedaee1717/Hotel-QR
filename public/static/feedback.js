// Feedback Form - One Question at a Time with Animations
let formData = null;
let currentStep = 0;
let totalSteps = 0;
let responses = {};
let brandColors = {
    primary: '#972626',
    secondary: '#681529'
};

// Extract form ID from URL
const pathParts = window.location.pathname.split('/');
const formId = pathParts[pathParts.length - 1];

// Load form data and branding
async function loadForm() {
    try {
        const res = await fetch('/api/feedback/forms/' + formId);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Failed to load form');

        formData = data.form;
        
        // Load property branding colors
        await loadPropertyBranding(formData.property_id);
        
        // Set form metadata
        document.getElementById('formName').textContent = formData.form_name;
        document.getElementById('formDescription').textContent = formData.form_description || '';
        document.getElementById('propertyName').textContent = formData.property_name;

        // Calculate total steps (guest info fields + questions)
        totalSteps = 0;
        if (formData.require_room_number) totalSteps++;
        if (formData.require_guest_name) totalSteps++;
        if (formData.require_email) totalSteps++;
        if (formData.require_phone) totalSteps++;
        totalSteps += formData.questions.length;

        document.getElementById('totalQuestions').textContent = totalSteps;

        // Start the form
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('formContainer').classList.remove('hidden');
        
        setupEventListeners();
        renderCurrentStep();
        
    } catch (error) {
        console.error('Load form error:', error);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('errorScreen').classList.remove('hidden');
        document.getElementById('errorText').textContent = error.message || 'This form is not available';
    }
}

// Load property branding colors from admin settings
async function loadPropertyBranding(propertyId) {
    try {
        const res = await fetch('/api/property/' + propertyId);
        const data = await res.json();
        
        if (data.success && data.property) {
            brandColors.primary = data.property.primary_color || '#972626';
            brandColors.secondary = data.property.secondary_color || '#681529';
            
            // Apply brand colors to CSS variables
            document.documentElement.style.setProperty('--primary-color', brandColors.primary);
            document.documentElement.style.setProperty('--secondary-color', brandColors.secondary);
        }
    } catch (error) {
        console.error('Failed to load branding:', error);
    }
}

// Render current step
function renderCurrentStep() {
    const questionContent = document.getElementById('questionContent');
    const currentQuestionNum = document.getElementById('currentQuestion');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Update progress
    currentQuestionNum.textContent = currentStep + 1;
    const progressPercent = ((currentStep + 1) / totalSteps) * 100;
    progressBar.style.width = progressPercent + '%';
    progressText.textContent = Math.round(progressPercent) + '%';

    // Show/hide navigation buttons
    prevBtn.style.display = currentStep > 0 ? 'flex' : 'none';
    nextBtn.style.display = currentStep < totalSteps - 1 ? 'flex' : 'none';
    submitBtn.style.display = currentStep === totalSteps - 1 ? 'flex' : 'none';

    // Get current question data
    let stepIndex = 0;
    let questionHTML = '';

    // Guest info fields
    if (formData.require_room_number && stepIndex === currentStep) {
        questionHTML = renderGuestInfoField('room_number', 'Room Number', 'text', 'e.g., 303', true);
    } else if (formData.require_room_number) stepIndex++;

    if (formData.require_guest_name && stepIndex === currentStep) {
        questionHTML = renderGuestInfoField('guest_name', 'Your Name', 'text', 'Full name', true);
    } else if (formData.require_guest_name) stepIndex++;

    if (formData.require_email && stepIndex === currentStep) {
        questionHTML = renderGuestInfoField('guest_email', 'Email Address', 'email', 'your@email.com', true);
    } else if (formData.require_email) stepIndex++;

    if (formData.require_phone && stepIndex === currentStep) {
        questionHTML = renderGuestInfoField('guest_phone', 'Phone Number', 'tel', '+1234567890', true);
    } else if (formData.require_phone) stepIndex++;

    // Form questions
    const questionIndex = currentStep - stepIndex;
    if (questionIndex >= 0 && questionIndex < formData.questions.length) {
        const question = formData.questions[questionIndex];
        questionHTML = renderQuestion(question, questionIndex);
    }

    // Animate transition
    questionContent.classList.add('question-exit');
    setTimeout(() => {
        questionContent.innerHTML = questionHTML;
        questionContent.classList.remove('question-exit');
        questionContent.classList.add('question-enter');
        setTimeout(() => {
            questionContent.classList.remove('question-enter');
        }, 400);
    }, 400);
}

// Render guest info field
function renderGuestInfoField(fieldName, label, type, placeholder, required) {
    const value = responses[fieldName] || '';
    return `
        <div class="flex-1 flex flex-col justify-center">
            <div class="mb-8">
                <div class="text-sm font-semibold text-gray-500 mb-2">GUEST INFORMATION</div>
                <h2 class="text-3xl font-bold text-gray-900 mb-4">${label}${required ? '<span class="text-red-500">*</span>' : ''}</h2>
                <p class="text-gray-600">Please provide your ${label.toLowerCase()} to help us serve you better.</p>
            </div>
            <input 
                type="${type}" 
                id="currentAnswer" 
                value="${value}"
                class="w-full px-6 py-4 text-xl border-2 rounded-xl focus:ring-4 focus:ring-opacity-50 transition-all"
                style="border-color: ${brandColors.primary}; focus:ring-color: ${brandColors.primary};"
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
                autofocus>
        </div>
    `;
}

// Render question based on type
function renderQuestion(question, index) {
    let inputHTML = '';
    const savedAnswer = responses['q_' + question.question_id] || '';

    switch (question.question_type) {
        case 'text':
            inputHTML = `
                <input 
                    type="text" 
                    id="currentAnswer" 
                    value="${savedAnswer}"
                    class="w-full px-6 py-4 text-xl border-2 rounded-xl focus:ring-4 focus:ring-opacity-50"
                    style="border-color: ${brandColors.primary};"
                    placeholder="Type your answer here..."
                    ${question.is_required ? 'required' : ''}
                    autofocus>
            `;
            break;

        case 'textarea':
            inputHTML = `
                <textarea 
                    id="currentAnswer" 
                    rows="5"
                    class="w-full px-6 py-4 text-lg border-2 rounded-xl focus:ring-4 focus:ring-opacity-50 resize-none"
                    style="border-color: ${brandColors.primary};"
                    placeholder="Share your thoughts..."
                    ${question.is_required ? 'required' : ''}
                    autofocus>${savedAnswer}</textarea>
            `;
            break;

        case 'rating':
            inputHTML = `
                <div class="star-rating" id="currentAnswer" data-question="${question.question_id}">
                    ${[5, 4, 3, 2, 1].map(i => `
                        <span class="star ${parseInt(savedAnswer) >= i ? 'active' : ''}" 
                              data-value="${i}" 
                              onclick="setRating(${question.question_id}, ${i})">★</span>
                    `).join('')}
                </div>
                <input type="hidden" id="ratingValue" value="${savedAnswer}">
            `;
            break;

        case 'scale':
            inputHTML = `
                <div class="scale-input" id="currentAnswer">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `
                        <button type="button" 
                                class="scale-btn ${parseInt(savedAnswer) === i ? 'active' : ''}"
                                data-value="${i}"
                                onclick="setScale(${question.question_id}, ${i})">${i}</button>
                    `).join('')}
                </div>
                <div class="flex justify-between text-sm text-gray-500 mt-3">
                    <span>Not at all</span>
                    <span>Extremely</span>
                </div>
                <input type="hidden" id="scaleValue" value="${savedAnswer}">
            `;
            break;

        case 'multiple_choice':
            const options = question.options || [];
            inputHTML = `
                <div class="space-y-3" id="currentAnswer">
                    ${options.map(opt => `
                        <div class="choice-option ${savedAnswer === opt ? 'active' : ''}"
                             data-value="${opt}"
                             onclick="selectChoice(this, '${opt}')">
                            ${opt}
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="choiceValue" value="${savedAnswer}">
            `;
            break;

        case 'yes_no':
            inputHTML = `
                <div class="grid grid-cols-2 gap-4" id="currentAnswer">
                    <div class="choice-option ${savedAnswer === 'Yes' ? 'active' : ''}"
                         data-value="Yes"
                         onclick="selectChoice(this, 'Yes')">
                        <i class="fas fa-check-circle text-3xl mb-2"></i>
                        <div class="text-xl font-bold">Yes</div>
                    </div>
                    <div class="choice-option ${savedAnswer === 'No' ? 'active' : ''}"
                         data-value="No"
                         onclick="selectChoice(this, 'No')">
                        <i class="fas fa-times-circle text-3xl mb-2"></i>
                        <div class="text-xl font-bold">No</div>
                    </div>
                </div>
                <input type="hidden" id="choiceValue" value="${savedAnswer}">
            `;
            break;

        case 'nps':
            inputHTML = `
                <div class="scale-input" id="currentAnswer" style="max-width: 100%;">
                    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `
                        <button type="button" 
                                class="scale-btn ${parseInt(savedAnswer) === i ? 'active' : ''}"
                                data-value="${i}"
                                onclick="setScale(${question.question_id}, ${i})">${i}</button>
                    `).join('')}
                </div>
                <div class="flex justify-between text-sm text-gray-500 mt-3">
                    <span>Not at all likely</span>
                    <span>Extremely likely</span>
                </div>
                <input type="hidden" id="scaleValue" value="${savedAnswer}">
            `;
            break;
    }

    return `
        <div class="flex-1 flex flex-col justify-center">
            <div class="mb-8">
                <div class="text-sm font-semibold text-gray-500 mb-2">QUESTION ${index + 1}</div>
                <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    ${question.question_text}
                    ${question.is_required ? '<span class="text-red-500">*</span>' : ''}
                </h2>
            </div>
            ${inputHTML}
        </div>
    `;
}

// Rating functions
function setRating(questionId, value) {
    const container = document.querySelector('.star-rating[data-question="' + questionId + '"]');
    const stars = container.querySelectorAll('.star');
    document.getElementById('ratingValue').value = value;
    
    stars.forEach(star => {
        if (parseInt(star.dataset.value) <= value) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function setScale(questionId, value) {
    const buttons = document.querySelectorAll('.scale-btn');
    document.getElementById('scaleValue').value = value;
    
    buttons.forEach(btn => {
        if (parseInt(btn.dataset.value) === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function selectChoice(element, value) {
    const container = element.parentElement;
    const options = container.querySelectorAll('.choice-option');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('choiceValue').value = value;
}

// Save current answer
function saveCurrentAnswer() {
    const answerInput = document.getElementById('currentAnswer');
    const ratingValue = document.getElementById('ratingValue');
    const scaleValue = document.getElementById('scaleValue');
    const choiceValue = document.getElementById('choiceValue');

    let stepIndex = 0;
    
    // Guest info fields
    if (formData.require_room_number) {
        if (stepIndex === currentStep) {
            responses.room_number = answerInput.value;
            return true;
        }
        stepIndex++;
    }
    
    if (formData.require_guest_name) {
        if (stepIndex === currentStep) {
            responses.guest_name = answerInput.value;
            return true;
        }
        stepIndex++;
    }
    
    if (formData.require_email) {
        if (stepIndex === currentStep) {
            responses.guest_email = answerInput.value;
            return true;
        }
        stepIndex++;
    }
    
    if (formData.require_phone) {
        if (stepIndex === currentStep) {
            responses.guest_phone = answerInput.value;
            return true;
        }
        stepIndex++;
    }

    // Form questions
    const questionIndex = currentStep - stepIndex;
    if (questionIndex >= 0 && questionIndex < formData.questions.length) {
        const question = formData.questions[questionIndex];
        const questionKey = 'q_' + question.question_id;
        
        if (ratingValue) {
            responses[questionKey] = ratingValue.value;
        } else if (scaleValue) {
            responses[questionKey] = scaleValue.value;
        } else if (choiceValue) {
            responses[questionKey] = choiceValue.value;
        } else if (answerInput) {
            responses[questionKey] = answerInput.value;
        }
        
        // Validate required fields
        if (question.is_required && !responses[questionKey]) {
            alert('This question is required. Please provide an answer.');
            return false;
        }
    }
    
    return true;
}

// Setup navigation handlers (called after form loads)
function setupEventListeners() {
    // Navigation handlers
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentStep > 0) {
            saveCurrentAnswer();
            currentStep--;
            renderCurrentStep();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (saveCurrentAnswer() && currentStep < totalSteps - 1) {
            currentStep++;
            renderCurrentStep();
        }
    });

    // Submit form
    document.getElementById('submitBtn').addEventListener('click', async () => {
        if (!saveCurrentAnswer()) return;
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
        
        try {
            const submission = {
                form_id: formId,
                room_number: responses.room_number,
                guest_name: responses.guest_name,
                guest_email: responses.guest_email,
                guest_phone: responses.guest_phone,
                submission_source: 'web',
                answers: []
            };
            
            formData.questions.forEach(q => {
                const value = responses['q_' + q.question_id];
                if (value) {
                    const answer = {
                        question_id: q.question_id,
                        answer_text: null,
                        answer_numeric: null
                    };
                    
                    if (['rating', 'scale', 'nps'].includes(q.question_type)) {
                        answer.answer_numeric = parseFloat(value);
                    } else {
                        answer.answer_text = value;
                    }
                    
                    submission.answers.push(answer);
                }
            });
            
            const res = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission)
            });
            
            const data = await res.json();
            
            if (!data.success) throw new Error(data.error || 'Failed to submit');
            
            document.getElementById('formContainer').classList.add('hidden');
            document.getElementById('thankYouScreen').classList.remove('hidden');
            document.getElementById('thankYouText').textContent = formData.thank_you_message || 'Thank You!';
            
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit feedback. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Feedback';
        }
    });
}

// Start loading when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadForm);
} else {
    loadForm();
}

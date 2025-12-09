let formData = null;
const formId = new URLSearchParams(window.location.search).get('id');

async function loadForm() {
    try {
        const res = await fetch('/api/feedback/forms/' + formId);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Failed to load form');

        formData = data.form;
        
        document.getElementById('formName').textContent = formData.form_name;
        document.getElementById('formDescription').textContent = formData.form_description || '';
        document.getElementById('propertyName').textContent = formData.property_name;

        const guestFields = document.getElementById('guestFields');
        const fields = [];
        
        if (formData.require_room_number) {
            fields.push('<div><label class="block text-sm font-semibold mb-2">Room Number *</label><input type="text" name="room_number" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-600" placeholder="e.g., 303"></div>');
        }
        if (formData.require_guest_name) {
            fields.push('<div><label class="block text-sm font-semibold mb-2">Your Name *</label><input type="text" name="guest_name" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-600" placeholder="Full name"></div>');
        }
        if (formData.require_email) {
            fields.push('<div><label class="block text-sm font-semibold mb-2">Email *</label><input type="email" name="guest_email" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-600" placeholder="your@email.com"></div>');
        }
        if (formData.require_phone) {
            fields.push('<div><label class="block text-sm font-semibold mb-2">Phone *</label><input type="tel" name="guest_phone" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-600" placeholder="+1234567890"></div>');
        }

        guestFields.innerHTML = fields.join('');

        const questionsSection = document.getElementById('questionsSection');
        questionsSection.innerHTML = formData.questions.map((q, idx) => {
            let inputHtml = '';
            
            switch(q.question_type) {
                case 'text':
                    inputHtml = '<input type="text" name="q_' + q.question_id + '" ' + (q.is_required ? 'required' : '') + ' class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-600" placeholder="Your answer">';
                    break;
                case 'textarea':
                    inputHtml = '<textarea name="q_' + q.question_id + '" rows="4" ' + (q.is_required ? 'required' : '') + ' class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-600" placeholder="Your answer"></textarea>';
                    break;
                case 'rating':
                    inputHtml = '<div class="star-rating" data-question="' + q.question_id + '">';
                    for (let i = 5; i >= 1; i--) {
                        inputHtml += '<span class="star" data-value="' + i + '" onclick="setRating(' + q.question_id + ', ' + i + ')">★</span>';
                    }
                    inputHtml += '</div><input type="hidden" name="q_' + q.question_id + '" ' + (q.is_required ? 'required' : '') + '>';
                    break;
                case 'scale':
                    inputHtml = '<div class="flex justify-between items-center gap-2">';
                    for (let i = 1; i <= 10; i++) {
                        inputHtml += '<button type="button" onclick="setScale(' + q.question_id + ', ' + i + ')" class="scale-btn w-12 h-12 border-2 rounded-lg font-bold hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all" data-question="' + q.question_id + '" data-value="' + i + '">' + i + '</button>';
                    }
                    inputHtml += '</div><input type="hidden" name="q_' + q.question_id + '" ' + (q.is_required ? 'required' : '') + '>';
                    break;
                case 'multiple_choice':
                    const options = q.options || [];
                    inputHtml = '<div class="space-y-2">';
                    options.forEach(opt => {
                        inputHtml += '<label class="flex items-center space-x-3 p-3 border rounded-lg hover:bg-purple-50 cursor-pointer transition-all"><input type="radio" name="q_' + q.question_id + '" value="' + opt + '" ' + (q.is_required ? 'required' : '') + ' class="w-5 h-5 text-purple-600"><span class="flex-1">' + opt + '</span></label>';
                    });
                    inputHtml += '</div>';
                    break;
                case 'yes_no':
                    inputHtml = '<div class="flex gap-4">';
                    inputHtml += '<label class="flex-1 flex items-center justify-center space-x-2 p-4 border-2 rounded-lg hover:bg-green-50 hover:border-green-600 cursor-pointer transition-all"><input type="radio" name="q_' + q.question_id + '" value="Yes" ' + (q.is_required ? 'required' : '') + ' class="w-5 h-5"><span class="font-semibold">Yes</span></label>';
                    inputHtml += '<label class="flex-1 flex items-center justify-center space-x-2 p-4 border-2 rounded-lg hover:bg-red-50 hover:border-red-600 cursor-pointer transition-all"><input type="radio" name="q_' + q.question_id + '" value="No" ' + (q.is_required ? 'required' : '') + ' class="w-5 h-5"><span class="font-semibold">No</span></label>';
                    inputHtml += '</div>';
                    break;
                case 'nps':
                    inputHtml = '<div class="space-y-3"><div class="flex justify-between text-sm text-gray-600 mb-2"><span>Not at all likely</span><span>Extremely likely</span></div><div class="grid grid-cols-11 gap-2">';
                    for (let i = 0; i <= 10; i++) {
                        inputHtml += '<button type="button" onclick="setNPS(' + q.question_id + ', ' + i + ')" class="nps-btn aspect-square border-2 rounded-lg font-bold hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all" data-question="' + q.question_id + '" data-value="' + i + '">' + i + '</button>';
                    }
                    inputHtml += '</div></div><input type="hidden" name="q_' + q.question_id + '" ' + (q.is_required ? 'required' : '') + '>';
                    break;
            }

            return '<div class="bg-gray-50 p-6 rounded-xl"><label class="block mb-4"><span class="text-lg font-semibold text-gray-900">' + (idx + 1) + '. ' + q.question_text + (q.is_required ? '<span class="text-red-500">*</span>' : '') + '</span></label>' + inputHtml + '</div>';
        }).join('');

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('formContainer').classList.remove('hidden');

    } catch (error) {
        console.error('Load form error:', error);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('errorText').textContent = error.message || 'This form is not available';
    }
}

function setRating(questionId, value) {
    const container = document.querySelector('.star-rating[data-question="' + questionId + '"]');
    const stars = container.querySelectorAll('.star');
    const input = document.querySelector('input[name="q_' + questionId + '"]');
    
    input.value = value;
    
    stars.forEach(star => {
        if (parseInt(star.dataset.value) <= value) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function setScale(questionId, value) {
    const input = document.querySelector('input[name="q_' + questionId + '"]');
    const buttons = document.querySelectorAll('button[data-question="' + questionId + '"]');
    
    input.value = value;
    
    buttons.forEach(btn => {
        if (parseInt(btn.dataset.value) === value) {
            btn.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
        } else {
            btn.classList.remove('bg-purple-600', 'text-white', 'border-purple-600');
        }
    });
}

function setNPS(questionId, value) {
    const input = document.querySelector('input[name="q_' + questionId + '"]');
    const buttons = document.querySelectorAll('button.nps-btn[data-question="' + questionId + '"]');
    
    input.value = value;
    
    buttons.forEach(btn => {
        if (parseInt(btn.dataset.value) === value) {
            btn.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
        } else {
            btn.classList.remove('bg-purple-600', 'text-white', 'border-purple-600');
        }
    });
}

document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formElement = e.target;
    const submitBtn = formElement.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
    
    try {
        const formDataObj = new FormData(formElement);
        
        const submission = {
            form_id: formId,
            room_number: formDataObj.get('room_number'),
            guest_name: formDataObj.get('guest_name'),
            guest_email: formDataObj.get('guest_email'),
            guest_phone: formDataObj.get('guest_phone'),
            submission_source: 'web',
            answers: []
        };
        
        formData.questions.forEach(q => {
            const value = formDataObj.get('q_' + q.question_id);
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
        document.getElementById('thankYouMessage').classList.remove('hidden');
        document.getElementById('thankYouText').textContent = formData.thank_you_message || 'Thank you for your feedback!';
        
    } catch (error) {
        console.error('Submit error:', error);
        alert('Failed to submit feedback. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Feedback';
    }
});

loadForm();

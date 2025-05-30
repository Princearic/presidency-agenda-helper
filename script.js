const { jsPDF } = window.jspdf || {};
const form = document.getElementById('agenda-form');
const loadAgendaSelect = document.getElementById('load-agenda');
const messageBox = document.getElementById('message-box');
const messageIcon = document.getElementById('message-icon');
const messageText = document.getElementById('message-text');
let messageTimeout;
let ministeringAssignmentCount = 0;
let lessonCount = 0;
let activityCount = 0;
let autosaveTimeout;
let currentModalType = '';
let currentModalIndex = -1;

// Date Formatting
function formatDate(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

// Theme Handling
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-toggle').innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    updateThemeColor(document.getElementById('theme-color-picker').value);
}

// Theme Color Handling
function darkenColor(hex, percent) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const factor = (100 - percent) / 100;
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function updateThemeColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', color);
    root.style.setProperty('--accent-color-light', darkenColor(color, -20));
    root.style.setProperty('--accent-color-dark', darkenColor(color, 10));
    document.querySelectorAll('button:not(.btn-primary):not(.btn-success):not(.btn-danger)').forEach(el => {
        el.style.borderColor = color;
        el.style.backgroundColor = darkenColor(color, 10);
    });
    localStorage.setItem('themeColor', color);
}

// Accordion State Handling
function saveAccordionStates() {
    const states = {};
    document.querySelectorAll('details').forEach(d => {
        states[d.id] = d.open;
    });
    localStorage.setItem('accordionStates', JSON.stringify(states));
}

function applyAccordionStates() {
    const states = JSON.parse(localStorage.getItem('accordionStates') || '{}');
    document.querySelectorAll('details').forEach(d => {
        if (states[d.id] !== undefined) {
            d.open = states[d.id];
        }
    });
}

// Show Message
function showMessage(message, isError = false, duration = 4000) {
    console.log(`${isError ? 'Error' : 'Message'}: ${message}`);
    messageText.textContent = message;
    messageIcon.className = `fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
    messageBox.classList.remove('error');
    if (isError) messageBox.classList.add('error');
    messageBox.classList.add('show');
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
        messageBox.classList.remove('show');
    }, duration);
}

// Modal Handling
function openLoadModal() {
    document.getElementById('load-modal').classList.remove('hidden');
    populateLoadAgendaDropdown();
}

function closeLoadModal() {
    document.getElementById('load-modal').classList.add('hidden');
}

function openItemModal(type, index) {
    console.log('Opening item modal:', { type, index });
    currentModalType = type;
    currentModalIndex = index;
    const modalTitle = document.getElementById('item-modal-title');
    const modalForm = document.getElementById('item-modal-form');
    const isEdit = index !== -1;
    modalTitle.textContent = isEdit ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    modalForm.innerHTML = '';

    let data = {};
    if (isEdit) {
        const formData = getFormData();
        if (type === 'assignment') data = formData.ministeringAssignments[index] || {};
        else if (type === 'lesson') data = formData.lessons[index] || {};
        else if (type === 'activity') data = formData.activities[index] || {};
    }

    if (type === 'assignment') {
        modalForm.innerHTML = `
            <div>
                <label for="modal-task" class="block font-medium">Task:<span class="text-red-500">*</span></label>
                <input type="text" id="modal-task" value="${sanitizeInput(data.task || '')}" placeholder="Assignment description" required class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
            <div>
                <label for="modal-assigned" class="block font-medium">Assigned To:</label>
                <input type="text" id="modal-assigned" value="${sanitizeInput(data.assignedTo || '')}" placeholder="Name" class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
            <div>
                <label for="modal-status" class="block font-medium">Status:</label>
                <select id="modal-status" class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                    <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Done" ${data.status === 'Done' ? 'selected' : ''}>Done</option>
                </select>
            </div>
        `;
    } else if (type === 'lesson') {
        modalForm.innerHTML = `
            <div>
                <label for="modal-date" class="block font-medium">Date:</label>
                <input type="date" id="modal-date" value="${sanitizeInput(data.date || '')}" class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
            <div>
                <label for="modal-name" class="block font-medium">Teacher Name:<span class="text-red-500">*</span></label>
                <input type="text" id="modal-name" value="${sanitizeInput(data.name || '')}" placeholder="Name" required class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
        `;
    } else if (type === 'activity') {
        modalForm.innerHTML = `
            <div>
                <label for="modal-date" class="block font-medium">Date:</label>
                <input type="date" id="modal-date" value="${sanitizeInput(data.date || '')}" class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
            <div>
                <label for="modal-desc" class="block font-medium">Activity:<span class="text-red-500">*</span></label>
                <input type="text" id="modal-desc" value="${sanitizeInput(data.description || '')}" placeholder="Activity description" required class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
            <div>
                <label for="modal-assigned" class="block font-medium">Assigned To:</label>
                <input type="text" id="modal-assigned" value="${sanitizeInput(data.assignedTo || '')}" placeholder="Name(s)" class="w-full p-2 border border-gray-300 rounded-md mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
            </div>
        `;
    }
    document.getElementById('item-modal').classList.remove('hidden');
    document.getElementById('item-modal-error').classList.add('hidden');
}

function closeItemModal() {
    document.getElementById('item-modal').classList.add('hidden');
    currentModalType = '';
    currentModalIndex = -1;
}

// Get Saved Agenda Keys
function getSavedAgendaKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('agenda_') && key !== 'agenda_draft') {
            keys.push(key);
        }
    }
    return keys.sort();
}

// Get Previous Agenda Key
function getPreviousAgendaKey(currentDate) {
    console.log('Finding previous agenda key for date:', currentDate);
    const keys = getSavedAgendaKeys();
    if (!currentDate) return null;
    const currentDateObj = new Date(currentDate + 'T00:00:00');
    let previousKey = null;
    let latestDate = null;
    keys.forEach(key => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            const agendaDate = data['meeting-date'];
            if (agendaDate && agendaDate < currentDate) {
                const agendaDateObj = new Date(agendaDate + 'T00:00:00');
                if (!latestDate || agendaDateObj > latestDate) {
                    latestDate = agendaDateObj;
                    previousKey = key;
                }
            }
        } catch (e) {
            console.error('Error parsing agenda date:', e);
        }
    });
    console.log('Previous agenda key:', previousKey);
    return previousKey;
}

// Populate Load Agenda Dropdown
function populateLoadAgendaDropdown() {
    const keys = getSavedAgendaKeys();
    loadAgendaSelect.innerHTML = '<option value="">-- Select an Agenda --</option>';
    keys.forEach(key => {
        let displayName = key.replace('agenda_', '');
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data['meeting-date']) {
                displayName = `Agenda ${formatDate(data['meeting-date'])}`;
            }
        } catch (e) {
            console.error('Error parsing stored agenda data:', e);
        }
        const option = document.createElement('option');
        option.value = key;
        option.textContent = displayName;
        loadAgendaSelect.appendChild(option);
    });
}

// Clear Dynamic Lists
function clearDynamicLists() {
    document.getElementById('ministering-assignments-list').innerHTML = '';
    document.getElementById('lessons-list').innerHTML = '';
    document.getElementById('activities-list').innerHTML = '';
    document.getElementById('previous-ideas-list').innerHTML = '';
    document.getElementById('previous-items-list').innerHTML = '';
    document.getElementById('review-items-list').innerHTML = '';
    ministeringAssignmentCount = 0;
    lessonCount = 0;
    activityCount = 0;
}

// Clear Form
function clearForm() {
    form.reset();
    clearDynamicLists();
    document.getElementById('previous-assignments-display').style.display = 'none';
    localStorage.removeItem('agenda_draft');
    resetValidation();
    showMessage('Form cleared');
}

// Sanitize Input
function sanitizeInput(value) {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
}

// Add Ministering Assignment
function addMinisteringAssignment(task = '', assignedTo = '', status = 'Pending', confirmed = false) {
    console.log('Adding ministering assignment:', { task, assignedTo, status, confirmed });
    ministeringAssignmentCount++;
    const list = document.getElementById('ministering-assignments-list');
    const li = document.createElement('li');
    li.className = 'dynamic-item';
    li.id = `min-assign-${ministeringAssignmentCount}`;
    li.innerHTML = `
        <span>Task: ${sanitizeInput(task)} ${assignedTo ? `(Assigned to: <span class="assigned-name">${sanitizeInput(assignedTo)}</span>, Status: ${status})` : `(Status: ${status})`}</span>
        <button type="button" class="btn-edit" onclick="openItemModal('assignment', ${ministeringAssignmentCount - 1})" aria-label="Edit assignment"><i class="fas fa-edit"></i></button>
        <button type="button" class="btn-danger" onclick="removeItem('min-assign-${ministeringAssignmentCount}')" aria-label="Remove assignment"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(li);
    triggerAutosave();
    updateReviewItems();
    showMessage('Assignment confirmed');
}

// Add Lesson
function addLesson(date = '', name = '', confirmed = false) {
    console.log('Adding lesson:', { date, name, confirmed });
    lessonCount++;
    const list = document.getElementById('lessons-list');
    const li = document.createElement('li');
    li.className = 'dynamic-item';
    li.id = `lesson-${lessonCount}`;
    li.innerHTML = `
        <span>Lesson - Date: ${sanitizeInput(formatDate(date))}, Teacher: <span class="assigned-name">${sanitizeInput(name)}</span></span>
        <button type="button" class="btn-edit" onclick="openItemModal('lesson', ${lessonCount - 1})" aria-label="Edit lesson"><i class="fas fa-edit"></i></button>
        <button type="button" class="btn-danger" onclick="removeItem('lesson-${lessonCount}')" aria-label="Remove lesson"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(li);
    triggerAutosave();
    updateReviewItems();
    showMessage('Lesson confirmed');
}

// Add Activity
function addActivity(date = '', description = '', assignedTo = '', confirmed = false) {
    console.log('Adding activity:', { date, description, assignedTo, confirmed });
    activityCount++;
    const list = document.getElementById('activities-list');
    const li = document.createElement('li');
    li.className = 'dynamic-item';
    li.id = `activity-${activityCount}`;
    li.innerHTML = `
        <span>Activity - Date: ${sanitizeInput(formatDate(date))}, Description: ${sanitizeInput(description)}${assignedTo ? `, Assigned to: <span class="assigned-name">${sanitizeInput(assignedTo)}</span>` : ''}</span>
        <button type="button" class="btn-edit" onclick="openItemModal('activity', ${activityCount - 1})" aria-label="Edit activity"><i class="fas fa-edit"></i></button>
        <button type="button" class="btn-danger" onclick="removeItem('activity-${activityCount}')" aria-label="Remove activity"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(li);
    triggerAutosave();
    updateReviewItems();
    showMessage('Activity confirmed');
}

// Update Item
function updateItem(type, index, data) {
    console.log('Updating item:', { type, index, data });
    const formData = getFormData();
    if (type === 'assignment' && formData.ministeringAssignments[index]) {
        formData.ministeringAssignments[index] = {
            task: data.task,
            assignedTo: data.assignedTo,
            status: data.status,
            confirmed: formData.ministeringAssignments[index].confirmed || false,
        };
        const li = document.getElementById(`min-assign-${index + 1}`);
        li.querySelector('span').innerHTML = `Task: ${sanitizeInput(data.task)} ${data.assignedTo ? `(Assigned to: <span class="assigned-name">${sanitizeInput(data.assignedTo)}</span>, Status: ${data.status})` : `(Status: ${data.status})`}`;
        showMessage('Assignment updated');
    } else if (type === 'lesson' && formData.lessons[index]) {
        formData.lessons[index] = {
            date: data.date,
            name: data.name,
            confirmed: formData.lessons[index].confirmed || false,
        };
        const li = document.getElementById(`lesson-${index + 1}`);
        li.querySelector('span').innerHTML = `Lesson - Date: ${sanitizeInput(formatDate(data.date))}, Teacher: <span class="assigned-name">${sanitizeInput(data.name)}</span>`;
        showMessage('Lesson updated');
    } else if (type === 'activity' && formData.activities[index]) {
        formData.activities[index] = {
            date: data.date,
            description: data.description,
            assignedTo: data.assignedTo,
            confirmed: formData.activities[index].confirmed || false,
        };
        const li = document.getElementById(`activity-${index + 1}`);
        li.querySelector('span').innerHTML = `Activity - Date: ${sanitizeInput(formatDate(data.date))}, Description: ${sanitizeInput(data.description)}${data.assignedTo ? `, Assigned to: <span class="assigned-name">${sanitizeInput(data.assignedTo)}</span>` : ''}`;
        showMessage('Activity updated');
    }
    triggerAutosave();
    updateReviewItems();
}

// Remove Item
function removeItem(id) {
    console.log('Removing item:', id);
    const element = document.getElementById(id);
    if (element) {
        element.remove();
        triggerAutosave();
        updateReviewItems();
        showMessage('Item removed');
    }
}

// Get Form Data
function getFormData() {
    const data = {
        'meeting-date': document.getElementById('meeting-date').value,
        'conducting': document.getElementById('conducting').value,
        'opening-prayer': document.getElementById('opening-prayer').value,
        'ministering-discussion': document.getElementById('ministering-discussion').value,
        'sunday-discussion': document.getElementById('sunday-discussion').value,
        'skills-ideas': document.getElementById('skills-ideas').value,
        'temple-history': document.getElementById('temple-history').value,
        'spirit-unity': document.getElementById('spirit-unity').value,
        'leadership-instruction': document.getElementById('leadership-instruction').value,
        'closing-prayer': document.getElementById('closing-prayer').value,
        ministeringAssignments: [],
        lessons: [],
        activities: [],
        followUpStatus: {},
    };
    for (let i = 1; i <= ministeringAssignmentCount; i++) {
        const li = document.getElementById(`min-assign-${i}`);
        if (li) {
            const text = li.querySelector('span').textContent;
            const statusMatch = text.match(/Status: (.*?)(?:\)|$)/);
            const assignedMatch = text.match(/Assigned to: (.*?)(?:, Status|$)/);
            const taskMatch = text.match(/^Task: (.*?)(?: \()?/);
            if (taskMatch && statusMatch) {
                data.ministeringAssignments.push({
                    task: taskMatch[1],
                    assignedTo: assignedMatch ? assignedMatch[1] : '',
                    status: statusMatch[1],
                    confirmed: true,
                });
            }
        }
    }
    for (let i = 1; i <= lessonCount; i++) {
        const li = document.getElementById(`lesson-${i}`);
        if (li) {
            const text = li.querySelector('span').textContent;
            const match = text.match(/Lesson - Date: (.*?), Teacher: (.*)/);
            if (match) {
                const dateRaw = match[1] === '' ? '' : match[1].split('/').reverse().join('-');
                data.lessons.push({
                    date: dateRaw,
                    name: match[2],
                    confirmed: true,
                });
            }
        }
    }
    for (let i = 1; i <= activityCount; i++) {
        const li = document.getElementById(`activity-${i}`);
        if (li) {
            const text = li.querySelector('span').textContent;
            const assignedMatch = text.match(/Assigned to: (.*)$/);
            const descMatch = text.match(/Description: (.*?)(?:, Assigned to|$)/);
            const dateMatch = text.match(/Date: (.*?)(?:, Description|$)/);
            if (descMatch) {
                const dateRaw = dateMatch && dateMatch[1] !== '' ? dateMatch[1].split('/').reverse().join('-') : '';
                data.activities.push({
                    date: dateRaw,
                    description: descMatch[1],
                    assignedTo: assignedMatch ? assignedMatch[1] : '',
                    confirmed: true,
                });
            }
        }
    }
    const checkboxes = document.querySelectorAll('#previous-ideas-list input[type="checkbox"], #previous-items-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        data.followUpStatus[checkbox.dataset.id] = checkbox.checked;
    });
    return data;
}

// Update Previous Ideas
function updatePreviousIdeas() {
    console.log('Updating previous ideas');
    const previousIdeasList = document.getElementById('previous-ideas-list');
    previousIdeasList.innerHTML = '';
    const currentDate = document.getElementById('meeting-date').value;
    const previousKey = getPreviousAgendaKey(currentDate);
    const formData = getFormData();
    const followUpStatus = formData.followUpStatus || {};
    if (!previousKey) {
        console.log('No previous agenda found');
        return;
    }
    try {
        const previousData = JSON.parse(localStorage.getItem(previousKey));
        const ideas = [
            { id: 'skills', label: 'Skills/Service', value: previousData['skills-ideas'] },
            { id: 'sunday', label: 'Sunday Discussion', value: previousData['sunday-discussion'] },
            { id: 'temple', label: 'Temple & Family History', value: previousData['temple-history'] },
            { id: 'spirit', label: 'Spirit/Unity', value: previousData['spirit-unity'] },
        ];
        let hasItems = false;
        ideas.forEach((idea, index) => {
            if (idea.value) {
                const li = document.createElement('li');
                li.className = 'dynamic-item';
                const dataId = `idea-${idea.id}-${index + 1}`;
                const isChecked = followUpStatus[dataId] || false;
                li.innerHTML = `
                    <label class="flex items-center">
                        <input type="checkbox" data-id="${dataId}" ${isChecked ? 'checked' : ''} aria-label="Check off idea: ${idea.label}">
                        <span class="${isChecked ? 'checked-item' : ''}">${idea.label}: ${sanitizeInput(idea.value)}</span>
                    </label>
                `;
                previousIdeasList.appendChild(li);
                hasItems = true;
            }
        });
        document.getElementById('previous-assignments-display').style.display = hasItems || document.getElementById('previous-items-list').children.length > 0 ? 'block' : 'none';
    } catch (e) {
        console.error('Error updating previous ideas:', e);
    }
}

// Update Previous Items
function updatePreviousItems() {
    console.log('Updating previous items');
    const previousItemsList = document.getElementById('previous-items-list');
    previousItemsList.innerHTML = '';
    const currentDate = document.getElementById('meeting-date').value;
    const previousKey = getPreviousAgendaKey(currentDate);
    const formData = getFormData();
    const followUpStatus = formData.followUpStatus || {};
    let hasItems = false;
    if (previousKey) {
        try {
            const previousData = JSON.parse(localStorage.getItem(previousKey));
            previousData.ministeringAssignments?.forEach((assign, index) => {
                const li = document.createElement('li');
                li.className = 'dynamic-item';
                const dataId = `assign-min-${index + 1}`;
                const isChecked = followUpStatus[dataId] || false;
                li.innerHTML = `
                    <label class="flex items-center">
                        <input type="checkbox" data-id="${dataId}" ${isChecked ? 'checked' : ''} aria-label="Check off assignment: ${assign.task}">
                        <span class="${isChecked ? 'checked-item' : ''}">Task: ${sanitizeInput(assign.task)} ${assign.assignedTo ? `(Assigned to: <span class="assigned-name">${sanitizeInput(assign.assignedTo)}</span>, Status: ${assign.status})` : `(Status: ${assign.status})`}</span>
                    </label>
                `;
                previousItemsList.appendChild(li);
                hasItems = true;
            });
            previousData.lessons?.forEach((lesson, index) => {
                const li = document.createElement('li');
                li.className = 'dynamic-item';
                const dataId = `lesson-${index + 1}`;
                const isChecked = followUpStatus[dataId] || false;
                li.innerHTML = `
                    <label class="flex items-center">
                        <input type="checkbox" data-id="${dataId}" ${isChecked ? 'checked' : ''} aria-label="Check off lesson: ${lesson.name}">
                        <span class="${isChecked ? 'checked-item' : ''}">Lesson - Date: ${sanitizeInput(formatDate(lesson.date))}, Teacher: <span class="assigned-name">${sanitizeInput(lesson.name)}</span></span>
                    </label>
                `;
                previousItemsList.appendChild(li);
                hasItems = true;
            });
            previousData.activities?.forEach((activity, index) => {
                const li = document.createElement('li');
                li.className = 'dynamic-item';
                const dataId = `activity-${index + 1}`;
                const isChecked = followUpStatus[dataId] || false;
                li.innerHTML = `
                    <label class="flex items-center">
                        <input type="checkbox" data-id="${dataId}" ${isChecked ? 'checked' : ''} aria-label="Check off activity: ${activity.description}">
                        <span class="${isChecked ? 'checked-item' : ''}">Activity - Date: ${sanitizeInput(formatDate(activity.date))}, Description: ${sanitizeInput(activity.description)}${activity.assignedTo ? `, Assigned to: <span class="assigned-name">${sanitizeInput(activity.assignedTo)}</span>` : ''}</span>
                    </label>
                `;
                previousItemsList.appendChild(li);
                hasItems = true;
            });
        } catch (e) {
            console.error('Error updating previous items:', e);
        }
    }
    document.getElementById('previous-assignments-display').style.display = hasItems || document.getElementById('previous-ideas-list').children.length > 0 ? 'block' : 'none';
}

// Update Review Items
function updateReviewItems() {
    console.log('Updating review items');
    const reviewList = document.getElementById('review-items-list');
    reviewList.innerHTML = '';
    const formData = getFormData();
    const items = [
        ...formData.ministeringAssignments.map(a => `Ministering Assignment: ${a.task} ${a.assignedTo ? `(Assigned to: <span class="assigned-name">${a.assignedTo}</span>, Status: ${a.status})` : `(Status: ${a.status})`}`),
        ...formData.lessons.map(l => `Lesson - Date: ${formatDate(l.date)}, Teacher: <span class="assigned-name">${l.name}</span>`),
        ...formData.activities.map(a => `Activity - Date: ${formatDate(a.date)}, Description: ${a.description}${a.assignedTo ? `, Assigned to: <span class="assigned-name">${a.assignedTo}</span>` : ''}`),
    ];
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        div.innerHTML = item;
        reviewList.appendChild(div);
    });
}

// Populate Form
function populateForm(data) {
    console.log('Populating form with data:', data);
    clearDynamicLists();
    document.getElementById('meeting-date').value = data['meeting-date'] || '';
    document.getElementById('conducting').value = data['conducting'] || '';
    document.getElementById('opening-prayer').value = data['opening-prayer'] || '';
    document.getElementById('ministering-discussion').value = data['ministering-discussion'] || '';
    document.getElementById('sunday-discussion').value = data['sunday-discussion'] || '';
    document.getElementById('skills-ideas').value = data['skills-ideas'] || '';
    document.getElementById('temple-history').value = data['temple-history'] || '';
    document.getElementById('spirit-unity').value = data['spirit-unity'] || '';
    document.getElementById('leadership-instruction').value = data['leadership-instruction'] || '';
    document.getElementById('closing-prayer').value = data['closing-prayer'] || '';
    data.ministeringAssignments?.forEach(a => addMinisteringAssignment(a.task, a.assignedTo, a.status, a.confirmed));
    data.lessons?.forEach(l => addLesson(l.date, l.name, l.confirmed));
    data.activities?.forEach(a => addActivity(a.date, a.description, a.assignedTo, a.confirmed));
    updatePreviousIdeas();
    updatePreviousItems();
    updateReviewItems();
    resetValidation();
    applyAccordionStates();
}

// Save Agenda
function saveAgenda() {
    console.log('Saving agenda');
    const formData = getFormData();
    if (!formData['meeting-date'] || !formData['conducting'] || !formData['opening-prayer']) {
        showMessage('Please fill in all required fields', true);
        validateForm();
        return;
    }
    const key = `agenda_${formData['meeting-date']}`;
    localStorage.setItem(key, JSON.stringify(formData));
    localStorage.removeItem('agenda_draft');
    showMessage('Agenda saved');
}

// Autosave
function triggerAutosave() {
    console.log('Triggering autosave');
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
        const formData = getFormData();
        localStorage.setItem('agenda_draft', JSON.stringify(formData));
        console.log('Autosaved draft');
    }, 1000);
}

// Validate Form
function validateForm() {
    console.log('Validating form');
    const fields = ['meeting-date', 'conducting', 'opening-prayer'];
    let isValid = true;
    fields.forEach(id => {
        const input = document.getElementById(id);
        const error = document.getElementById(`${id}-error`);
        if (!input.value) {
            input.classList.add('error-border');
            error.classList.remove('hidden');
            isValid = false;
        } else {
            input.classList.remove('error-border');
            error.classList.add('hidden');
        }
    });
    return isValid;
}

// Reset Validation
function resetValidation() {
    console.log('Resetting validation');
    const fields = ['meeting-date', 'conducting', 'opening-prayer'];
    fields.forEach(id => {
        const input = document.getElementById(id);
        const error = document.getElementById(`${id}-error`);
        input.classList.remove('error-border');
        error.classList.add('hidden');
    });
}

// Create New Agenda
function createNewAgenda() {
    console.log('Creating new agenda');
    clearForm();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('meeting-date').value = today;
    localStorage.removeItem('accordionStates');
    document.querySelectorAll('details').forEach(d => d.removeAttribute('open'));
    updatePreviousIdeas();
    updatePreviousItems();
    showMessage('New agenda created');
}

// Export as PDF
function exportAsPDF() {
    console.log('Exporting as PDF');
    if (!jsPDF) {
        showMessage('PDF library not loaded', true);
        return;
    }
    const formData = getFormData();
    if (!formData['meeting-date']) {
        showMessage('Please enter a meeting date', true);
        return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Presidency Meeting Agenda', 20, 20);
    doc.setFontSize(12);
    let y = 30;

    const addSection = (title, content, isList = false) => {
        if (content && (isList ? content.length : content)) {
            doc.text(title, 20, y);
            y += 10;
            if (isList) {
                content.forEach(item => {
                    const lines = doc.splitTextToSize(item, 160);
                    lines.forEach(line => {
                        doc.text(line, 25, y);
                        y += 7;
                    });
                });
            } else {
                const lines = doc.splitTextToSize(content, 160);
                lines.forEach(line => {
                    doc.text(line, 25, y);
                    y += 7;
                });
            }
            y += 5;
        }
    };

    addSection('Meeting Details', [
        `Date: ${formatDate(formData['meeting-date']) || ''}`,
        `Conducting: ${formData['conducting'] || ''}`,
        `Opening Prayer: ${formData['opening-prayer'] || ''}`,
    ], true);

    const previousKey = getPreviousAgendaKey(formData['meeting-date']);
    if (previousKey) {
        try {
            const previousData = JSON.parse(localStorage.getItem(previousKey));
            const followUpStatus = formData.followUpStatus || {};
            const ideas = [
                previousData['skills-ideas'] ? `Skills/Service: ${previousData['skills-ideas']}` : '',
                previousData['sunday-discussion'] ? `Sunday Discussion: ${previousData['sunday-discussion']}` : '',
                previousData['temple-history'] ? `Temple & Family History: ${previousData['temple-history']}` : '',
                previousData['spirit-unity'] ? `Spirit/Unity: ${previousData['spirit-unity']}` : '',
            ].filter(i => i).map((idea, index) => {
                const dataId = `idea-${['skills', 'sunday', 'temple', 'spirit'][index]}-${index + 1}`;
                return `${followUpStatus[dataId] ? '[x]' : '[ ]'} ${idea}`;
            });
            addSection('Ideas from Previous Meeting', ideas, true);
            const previousItems = [
                ...(previousData.ministeringAssignments?.map((a, i) => `${followUpStatus[`assign-min-${i + 1}`] ? '[x]' : '[ ]'} Task: ${a.task} ${a.assignedTo ? `(Assigned to: <span class="assigned-name">${a.assignedTo}</span>, Status: ${a.status})` : `(Status: ${a.status})`}`) || []),
                ...(previousData.lessons?.map((l, i) => `${followUpStatus[`lesson-${i + 1}`] ? '[x]' : '[ ]'} Lesson - Date: ${formatDate(l.date)}, Teacher: <span class="assigned-name">${l.name}</span>`) || []),
                ...(previousData.activities?.map((a, i) => `${followUpStatus[`activity-${i + 1}`] ? '[x]' : '[ ]'} Activity - Date: ${formatDate(a.date)}, Description: ${a.description}${a.assignedTo ? `, Assigned to: <span class="assigned-name">${a.assignedTo}</span>` : ''}`) || []),
            ];
            addSection('Assignments from Previous Meeting', previousItems, true);
        } catch (e) {
            console.error('Error exporting previous items to PDF:', e);
        }
    }

    addSection('Ministering', formData['ministering-discussion']);
    addSection('Ministering Assignments', formData.ministeringAssignments.map(a => `Task: ${a.task} ${a.assignedTo ? `(Assigned to: <span class="assigned-name">${a.assignedTo}</span>, Status: ${a.status})` : `(Status: ${a.status})`}`), true);
    addSection('Sunday Quorum/Class Meetings', formData['sunday-discussion']);
    addSection('Upcoming Lessons', formData.lessons.map(l => `Date: ${formatDate(l.date)}, Teacher: <span class="assigned-name">${l.name}</span>`), true);
    addSection('Service & Activities', formData['skills-ideas']);
    addSection('Planned Service/Activities', formData.activities.map(a => `Date: ${formatDate(a.date)}, Description: ${a.description}${a.assignedTo ? `, Assigned to: <span class="assigned-name">${a.assignedTo}</span>` : ''}`), true);
    addSection('Temple & Family History / Sharing the Gospel', formData['temple-history']);
    addSection('Inviting the Spirit / Fostering Unity', formData['spirit-unity']);
    addSection('Leadership Instruction', formData['leadership-instruction']);
    addSection('Review & Closing', [
        ...formData.ministeringAssignments.map(a => `Ministering Assignment: ${a.task} ${a.assignedTo ? `(Assigned to: <span class="assigned-name">${a.assignedTo}</span>, Status: ${a.status})` : `(Status: ${a.status})`}`),
        ...formData.lessons.map(l => `Lesson - Date: ${formatDate(l.date)}, Teacher: <span class="assigned-name">${l.name}</span>`),
        ...formData.activities.map(a => `Activity - Date: ${formatDate(a.date)}, Description: ${a.description}${a.assignedTo ? `, Assigned to: <span class="assigned-name">${a.assignedTo}</span>` : ''}`),
        `Closing Prayer: ${formData['closing-prayer'] || ''}`,
    ], true);

    doc.save(`agenda_${formData['meeting-date'] || 'export'}.pdf`);
    showMessage('PDF exported');
}

// Initialize
function init() {
    console.log('Initializing app');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    const savedThemeColor = localStorage.getItem('themeColor') || '#4f46e5';
    updateThemeColor(savedThemeColor);
    document.getElementById('theme-color-picker').value = savedThemeColor;

    const draft = localStorage.getItem('agenda_draft');
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            populateForm(draftData);
        } catch (e) {
            console.error('Error loading draft:', e);
        }
    } else {
        document.getElementById('meeting-date').value = new Date().toISOString().split('T')[0];
        updatePreviousIdeas();
        updatePreviousItems();
    }

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('theme-color-picker').addEventListener('input', (e) => updateThemeColor(e.target.value));
    document.getElementById('view-past-button').addEventListener('click', openLoadModal);
    document.getElementById('load-button').addEventListener('click', () => {
        const key = loadAgendaSelect.value;
        if (key) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                populateForm(data);
                closeLoadModal();
                showMessage('Agenda loaded');
            } catch (e) {
                showMessage('Error loading agenda', true);
                console.error('Error loading agenda:', e);
            }
        }
    });
    document.getElementById('close-modal-button').addEventListener('click', closeLoadModal);
    document.getElementById('save-button').addEventListener('click', saveAgenda);
    document.getElementById('mobile-save-button').addEventListener('click', saveAgenda);
    document.getElementById('create-new-button').addEventListener('click', createNewAgenda);
    document.getElementById('mobile-create-new-button').addEventListener('click', createNewAgenda);
    document.getElementById('export-pdf-button').addEventListener('click', exportAsPDF);
    document.getElementById('mobile-export-pdf-button').addEventListener('click', exportAsPDF);
    document.getElementById('clear-button').addEventListener('click', clearForm);
    document.getElementById('mobile-clear-button').addEventListener('click', clearForm);
    document.getElementById('item-modal-confirm').addEventListener('click', () => {
        console.log('Confirming item modal:', { type: currentModalType, index: currentModalIndex });
        const modalForm = document.getElementById('item-modal-form');
        const requiredInputs = modalForm.querySelectorAll('input[required], select[required]');
        let isValid = true;
        requiredInputs.forEach(input => {
            if (!input.value) {
                input.classList.add('error-border');
                isValid = false;
            } else {
                input.classList.remove('error-border');
            }
        });
        if (!isValid) {
            document.getElementById('item-modal-error').classList.remove('hidden');
            return;
        }
        if (currentModalType === 'assignment') {
            const task = document.getElementById('modal-task').value;
            const assignedTo = document.getElementById('modal-assigned').value;
            const status = document.getElementById('modal-status').value;
            if (currentModalIndex === -1) {
                addMinisteringAssignment(task, assignedTo, status, true);
            } else {
                updateItem('assignment', currentModalIndex, { task, assignedTo, status });
            }
        } else if (currentModalType === 'lesson') {
            const date = document.getElementById('modal-date').value;
            const name = document.getElementById('modal-name').value;
            if (currentModalIndex === -1) {
                addLesson(date, name, true);
            } else {
                updateItem('lesson', currentModalIndex, { date, name });
            }
        } else if (currentModalType === 'activity') {
            const date = document.getElementById('modal-date').value;
            const description = document.getElementById('modal-desc').value;
            const assignedTo = document.getElementById('modal-assigned').value;
            if (currentModalIndex === -1) {
                addActivity(date, description, assignedTo, true);
            } else {
                updateItem('activity', currentModalIndex, { date, description, assignedTo });
            }
        }
        closeItemModal();
    });
    document.getElementById('item-modal-cancel').addEventListener('click', closeItemModal);
    document.getElementById('meeting-date').addEventListener('change', () => {
        updatePreviousIdeas();
        updatePreviousItems();
        triggerAutosave();
    });
    document.querySelectorAll('#previous-ideas-list, #previous-items-list').forEach(list => {
        list.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const li = e.target.closest('li');
                const span = li.querySelector('span');
                if (e.target.checked) {
                    span.classList.add('checked-item');
                } else {
                    span.classList.remove('checked-item');
                }
                triggerAutosave();
            }
        });
    });
    form.addEventListener('input', triggerAutosave);
    document.querySelectorAll('details').forEach(d => {
        d.addEventListener('toggle', saveAccordionStates);
    });
}

// Start the app
init();

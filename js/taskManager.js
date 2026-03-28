/**
 * taskManager.js
 * Manages task creation, completion toggling, deletion, and notes
 * within a specific list.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};

    /**
     * Create the DOM element for a single task and append it to the list's task container.
     * @param {HTMLElement} taskListEl - The .task-list container element.
     * @param {object} task - Task data { id, text, completed, notes }.
     * @param {function} onMutate - Callback fired on any data change (for persistence).
     */
    function renderTask(taskListEl, task, onMutate) {
        var item = document.createElement('div');
        item.className = 'task-item' + (task.completed ? ' completed' : '');
        item.dataset.taskId = task.id;

        // Checkbox
        var checkWrap = document.createElement('label');
        checkWrap.className = 'task-checkbox';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.title = 'Mark complete';
        checkbox.addEventListener('change', function (e) {
            e.stopPropagation();
            task.completed = checkbox.checked;
            item.classList.toggle('completed', task.completed);
            onMutate();
        });
        checkWrap.appendChild(checkbox);

        // Text
        var textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;

        // Notes indicator
        var notesIndicator = document.createElement('span');
        notesIndicator.className = 'task-notes-indicator';
        notesIndicator.textContent = task.notes ? '📝' : '';

        // Delete button
        var btnDel = document.createElement('button');
        btnDel.className = 'btn-delete-task';
        btnDel.title = 'Delete task';
        btnDel.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btnDel.addEventListener('click', function (e) {
            e.stopPropagation();
            item.classList.add('removing');
            item.addEventListener('animationend', function () {
                item.remove();
                onMutate('delete', task.id);
            }, { once: true });
        });

        // Click on task row → open modal
        item.addEventListener('click', function (e) {
            if (e.target === checkbox || e.target === btnDel || btnDel.contains(e.target)) return;
            App.modal.openModal(task.text, task.notes, function (updatedNotes) {
                task.notes = updatedNotes;
                notesIndicator.textContent = updatedNotes ? '📝' : '';
                onMutate();
            });
        });

        item.appendChild(checkWrap);
        item.appendChild(textSpan);
        item.appendChild(notesIndicator);
        item.appendChild(btnDel);
        taskListEl.appendChild(item);
    }

    /**
     * Build the "add task" input for a list card.
     * @param {HTMLElement} taskListEl - The .task-list container.
     * @param {object} listData - The list data object (has .tasks array).
     * @param {function} onMutate - Persistence callback.
     * @returns {HTMLElement} The wrapper element.
     */
    function createAddTaskInput(taskListEl, listData, onMutate) {
        var wrapper = document.createElement('div');
        wrapper.className = 'add-task-wrapper';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'add-task-input';
        input.placeholder = 'Add a task…';
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                var text = input.value.trim();
                if (!text) return;
                var task = {
                    id: generateId(),
                    text: text,
                    completed: false,
                    notes: ''
                };
                listData.tasks.push(task);
                renderTask(taskListEl, task, onMutate);
                input.value = '';
                onMutate();
            }
        });

        wrapper.appendChild(input);
        return wrapper;
    }

    /** Generate a simple unique ID. */
    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    App.tasks = {
        renderTask: renderTask,
        createAddTaskInput: createAddTaskInput
    };
})();

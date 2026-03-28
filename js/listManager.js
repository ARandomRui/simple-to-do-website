/**
 * listManager.js
 * Handles creating and deleting list cards, and maintains the
 * master lists data array.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};
    var container = document.getElementById('list-container');

    /** @type {Array<{id: string, title: string, tasks: Array}>} */
    var lists = [];

    /** Persist current state to localStorage. */
    function persist() {
        App.storage.save(lists);
    }

    /**
     * Handle a mutation callback from task operations.
     */
    function createMutateHandler(listId) {
        return function (action, taskId) {
            if (action === 'delete') {
                var list = lists.find(function (l) { return l.id === listId; });
                if (list) {
                    list.tasks = list.tasks.filter(function (t) { return t.id !== taskId; });
                }
            }
            persist();
        };
    }

    /**
     * Build and append a list card to the container.
     */
    function renderList(listData) {
        var card = document.createElement('div');
        card.className = 'list-card';
        card.dataset.listId = listData.id;

        // Header
        var header = document.createElement('div');
        header.className = 'list-header';

        var titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'list-title';
        titleInput.value = listData.title;
        titleInput.placeholder = 'List title…';
        titleInput.addEventListener('input', function () {
            listData.title = titleInput.value;
            persist();
        });

        var btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete-list';
        btnDelete.title = 'Delete list';
        btnDelete.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btnDelete.addEventListener('click', function () {
            card.classList.add('removing');
            card.addEventListener('animationend', function () {
                card.remove();
                lists = lists.filter(function (l) { return l.id !== listData.id; });
                persist();
                App.layout.updateLayout();
            }, { once: true });
        });

        header.appendChild(titleInput);
        header.appendChild(btnDelete);

        // Task list container
        var taskListEl = document.createElement('div');
        taskListEl.className = 'task-list';

        // Render existing tasks
        var mutateHandler = createMutateHandler(listData.id);
        listData.tasks.forEach(function (task) {
            App.tasks.renderTask(taskListEl, task, mutateHandler);
        });

        // Add-task input
        var addTaskEl = App.tasks.createAddTaskInput(taskListEl, listData, mutateHandler);

        card.appendChild(header);
        card.appendChild(taskListEl);
        card.appendChild(addTaskEl);
        container.appendChild(card);

        App.layout.updateLayout();
    }

    /** Generate a simple unique ID. */
    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create a brand-new list and render it.
     */
    function createList(title) {
        var listData = {
            id: generateId(),
            title: title || '',
            tasks: []
        };
        lists.push(listData);
        persist();
        renderList(listData);
    }

    App.lists = {
        setLists: function (data) { lists = data; },
        getLists: function () { return lists; },
        renderList: renderList,
        createList: createList
    };
})();

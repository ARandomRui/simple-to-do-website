/**
 * modalManager.js
 * Controls the task-detail modal for viewing/editing task notes.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};

    var overlay = document.getElementById('task-modal-overlay');
    var titleEl = document.getElementById('modal-task-title');
    var notesEl = document.getElementById('modal-notes');
    var btnClose = document.getElementById('btn-modal-close');
    var btnSave = document.getElementById('btn-modal-save');

    var currentCallback = null;

    function openModal(taskName, notes, onSave) {
        titleEl.textContent = taskName;
        notesEl.value = notes || '';
        currentCallback = onSave;
        overlay.classList.remove('hidden');
        notesEl.focus();
    }

    function closeModal() {
        overlay.classList.add('hidden');
        currentCallback = null;
    }

    function handleSave() {
        if (currentCallback) {
            currentCallback(notesEl.value);
        }
        closeModal();
    }

    // Event listeners
    btnClose.addEventListener('click', closeModal);
    btnSave.addEventListener('click', handleSave);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
            closeModal();
        }
    });

    App.modal = {
        openModal: openModal,
        closeModal: closeModal
    };
})();

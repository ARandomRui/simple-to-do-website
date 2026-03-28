/**
 * storageManager.js
 * Handles localStorage persistence for all list/task data.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};

    var STORAGE_KEY = 'todo-app-lists';

    App.storage = {
        /** Save the current lists array to localStorage. */
        save: function (lists) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
            }
        },

        /** Load lists array from localStorage. */
        load: function () {
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                return [];
            }
        }
    };
})();

/**
 * storageManager.js
 * Handles localStorage persistence for all list/task data.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};

    var STORAGE_KEY = 'todo-app-lists';
    var CALENDAR_KEY = 'todo-app-calendar';
    var ALARMS_KEY = 'todo-app-alarms';

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
        },

        /** Save calendar events to localStorage (separate key to avoid collisions). */
        saveCalendar: function (events) {
            try {
                localStorage.setItem(CALENDAR_KEY, JSON.stringify(events));
            } catch (e) {
                console.warn('Failed to save calendar to localStorage:', e);
            }
        },

        /** Load calendar events from localStorage. */
        loadCalendar: function () {
            try {
                var raw = localStorage.getItem(CALENDAR_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Failed to load calendar from localStorage:', e);
                return [];
            }
        },

        /** Save alarms to localStorage. */
        saveAlarms: function (alarms) {
            try {
                localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
            } catch (e) {
                console.warn('Failed to save alarms to localStorage:', e);
            }
        },

        /** Load alarms from localStorage. */
        loadAlarms: function () {
            try {
                var raw = localStorage.getItem(ALARMS_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Failed to load alarms from localStorage:', e);
                return [];
            }
        }
    };
})();

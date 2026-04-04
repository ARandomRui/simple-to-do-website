/**
 * app.js
 * Entry point — loads saved data, renders lists, initializes calendar
 * and alarms, and handles tab switching between views.
 */

(function () {
    'use strict';

    var App = window.App;

    // --- Tab Switching ---
    var tabButtons = document.querySelectorAll('.tab-btn');
    var listsView = document.getElementById('lists-view');
    var calendarView = document.getElementById('calendar-view');
    var alarmView = document.getElementById('alarm-view');
    var btnNewList = document.getElementById('btn-new-list');

    /** Switch between views and update header button visibility. */
    function switchTab(tabName) {
        tabButtons.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Hide all views first
        listsView.classList.remove('active-view');
        calendarView.classList.remove('active-view');
        alarmView.classList.remove('active-view');

        // Show "New List" only on lists tab
        btnNewList.classList.toggle('hidden-action', tabName !== 'lists');

        // Show the selected view
        if (tabName === 'lists') {
            listsView.classList.add('active-view');
        } else if (tabName === 'calendar') {
            calendarView.classList.add('active-view');
        } else if (tabName === 'alarm') {
            alarmView.classList.add('active-view');
        }
    }

    function init() {
        // Load and render saved lists
        var savedLists = App.storage.load();
        App.lists.setLists(savedLists);
        savedLists.forEach(function (listData) {
            App.lists.renderList(listData);
        });

        // Initialize calendar
        App.calendar.init();

        // Initialize alarms (starts the 1-second check interval)
        App.alarm.init();

        // Wire up "New List" button
        btnNewList.addEventListener('click', function () {
            App.lists.createList('');
        });

        // Wire up tab buttons
        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(btn.dataset.tab);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();

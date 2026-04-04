/**
 * calendarManager.js
 * Renders a month-view calendar grid, handles day selection,
 * event CRUD (including yearly repeats), and wires up the
 * event creation modal.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};

    // --- DOM references ---
    var calPing = document.getElementById('cal-ping');
    var grid = document.getElementById('cal-grid');
    var monthTitle = document.getElementById('cal-month-title');
    var btnPrev = document.getElementById('btn-cal-prev');
    var btnNext = document.getElementById('btn-cal-next');
    var btnToday = document.getElementById('btn-cal-today');
    var panelDateTitle = document.getElementById('panel-date-title');
    var panelEventsList = document.getElementById('panel-events-list');
    var panelEmpty = document.getElementById('panel-empty');
    var btnAddEvent = document.getElementById('btn-add-event');

    // Event modal DOM
    var eventOverlay = document.getElementById('event-modal-overlay');
    var eventTitleInput = document.getElementById('event-title-input');
    var eventDateInput = document.getElementById('event-date-input');
    var eventTypeSelect = document.getElementById('event-type-select');
    var eventNotesInput = document.getElementById('event-notes-input');
    var btnEventSave = document.getElementById('btn-event-save');
    var btnEventClose = document.getElementById('btn-event-modal-close');

    // --- State ---
    var currentYear;
    var currentMonth; // 0-indexed
    var selectedDate = null; // 'YYYY-MM-DD'
    var events = []; // { id, title, date, type, notes, yearlyRepeat }

    var MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // --- Helpers ---
    /** Generate a simple unique ID without crypto API. */
    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    /** Format a Date to 'YYYY-MM-DD'. */
    function toDateStr(year, month, day) {
        var m = String(month + 1).padStart(2, '0');
        var d = String(day).padStart(2, '0');
        return year + '-' + m + '-' + d;
    }

    /** Get today's date string. */
    function todayStr() {
        var now = new Date();
        return toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
    }

    /** Human-readable date for panel header. */
    function formatPanelDate(dateStr) {
        var parts = dateStr.split('-');
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10) - 1;
        var d = parseInt(parts[2], 10);
        var dt = new Date(y, m, d);
        var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[dt.getDay()] + ', ' + MONTH_NAMES[m] + ' ' + d;
    }

    /** Get tomorrow's date string based on system clock. */
    function tomorrowStr() {
        var now = new Date();
        var tmrw = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return toDateStr(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate());
    }

    /**
     * Show/hide the red ping badge on the Calendar tab
     * based on whether there are events scheduled for tomorrow.
     */
    function checkTomorrowPing() {
        var tmrwEvents = getEventsForDate(tomorrowStr());
        if (tmrwEvents.length > 0) {
            calPing.classList.remove('hidden');
        } else {
            calPing.classList.add('hidden');
        }
    }

    /** Persist events to localStorage. */
    function persist() {
        App.storage.saveCalendar(events);
    }

    /**
     * Get events matching a specific date, including yearly repeats.
     * Yearly events match if month and day are the same regardless of year.
     */
    function getEventsForDate(dateStr) {
        var parts = dateStr.split('-');
        var targetMonth = parts[1];
        var targetDay = parts[2];

        return events.filter(function (ev) {
            if (ev.yearlyRepeat) {
                var evParts = ev.date.split('-');
                return evParts[1] === targetMonth && evParts[2] === targetDay;
            }
            return ev.date === dateStr;
        });
    }

    // --- Rendering ---

    /** Build the calendar grid for the given month. */
    function renderMonth(year, month) {
        currentYear = year;
        currentMonth = month;
        monthTitle.textContent = MONTH_NAMES[month] + ' ' + year;

        grid.innerHTML = '';

        var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var daysInPrevMonth = new Date(year, month, 0).getDate();
        var today = todayStr();

        // Previous month's trailing days
        for (var p = firstDay - 1; p >= 0; p--) {
            var prevDay = daysInPrevMonth - p;
            var prevMonth = month - 1;
            var prevYear = year;
            if (prevMonth < 0) { prevMonth = 11; prevYear--; }
            var prevStr = toDateStr(prevYear, prevMonth, prevDay);
            grid.appendChild(createDayCell(prevDay, prevStr, true, today));
        }

        // Current month's days
        for (var d = 1; d <= daysInMonth; d++) {
            var dateStr = toDateStr(year, month, d);
            grid.appendChild(createDayCell(d, dateStr, false, today));
        }

        // Next month's leading days to fill out the grid (complete rows of 7)
        var totalCells = grid.children.length;
        var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (var n = 1; n <= remaining; n++) {
            var nextMonth = month + 1;
            var nextYear = year;
            if (nextMonth > 11) { nextMonth = 0; nextYear++; }
            var nextStr = toDateStr(nextYear, nextMonth, n);
            grid.appendChild(createDayCell(n, nextStr, true, today));
        }
    }

    /** Create a single day cell element. */
    function createDayCell(dayNum, dateStr, isOtherMonth, todayString) {
        var cell = document.createElement('div');
        cell.className = 'cal-day';
        if (isOtherMonth) cell.classList.add('other-month');
        if (dateStr === todayString) cell.classList.add('today');
        if (dateStr === selectedDate) cell.classList.add('selected');
        cell.dataset.date = dateStr;

        var num = document.createElement('span');
        num.className = 'day-number';
        num.textContent = dayNum;
        cell.appendChild(num);

        // Event dots
        var dayEvents = getEventsForDate(dateStr);
        if (dayEvents.length > 0) {
            var dots = document.createElement('div');
            dots.className = 'day-dots';
            // Show up to 5 dots to avoid clutter
            var shown = Math.min(dayEvents.length, 5);
            for (var i = 0; i < shown; i++) {
                var dot = document.createElement('span');
                dot.className = 'day-dot dot-' + dayEvents[i].type;
                dots.appendChild(dot);
            }
            cell.appendChild(dots);
        }

        cell.addEventListener('click', function () {
            selectDay(dateStr);
        });

        return cell;
    }

    /** Highlight the selected day and populate the panel. */
    function selectDay(dateStr) {
        selectedDate = dateStr;

        // Update selected class on grid
        var allDays = grid.querySelectorAll('.cal-day');
        for (var i = 0; i < allDays.length; i++) {
            allDays[i].classList.toggle('selected', allDays[i].dataset.date === dateStr);
        }

        panelDateTitle.textContent = formatPanelDate(dateStr);
        renderPanelEvents(dateStr);
    }

    /** Render the events list in the day panel. */
    function renderPanelEvents(dateStr) {
        panelEventsList.innerHTML = '';
        var dayEvents = getEventsForDate(dateStr);

        if (dayEvents.length === 0) {
            panelEmpty.style.display = '';
        } else {
            panelEmpty.style.display = 'none';
            dayEvents.forEach(function (ev) {
                panelEventsList.appendChild(createEventItem(ev));
            });
        }
    }

    /** Create a single event row in the panel. */
    function createEventItem(ev) {
        var item = document.createElement('div');
        item.className = 'event-item';

        // Type badge icon
        var badge = document.createElement('div');
        badge.className = 'event-type-badge badge-' + ev.type;
        var icons = { event: 'E', task: 'T', yearly: 'Y' };
        badge.textContent = icons[ev.type] || 'E';

        // Info block
        var info = document.createElement('div');
        info.className = 'event-info';

        var title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = ev.title;
        info.appendChild(title);

        if (ev.notes) {
            var preview = document.createElement('div');
            preview.className = 'event-notes-preview';
            preview.textContent = ev.notes;
            info.appendChild(preview);
        }

        if (ev.yearlyRepeat) {
            var tag = document.createElement('span');
            tag.className = 'yearly-tag';
            tag.textContent = '↻ Yearly';
            info.appendChild(tag);
        }

        // Delete button
        var btnDel = document.createElement('button');
        btnDel.className = 'btn-delete-event';
        btnDel.title = 'Delete event';
        btnDel.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btnDel.addEventListener('click', function () {
            deleteEvent(ev.id);
        });

        item.appendChild(badge);
        item.appendChild(info);
        item.appendChild(btnDel);
        return item;
    }

    // --- CRUD ---

    /** Add a new event and refresh the view. */
    function addEvent(eventData) {
        events.push(eventData);
        persist();
        renderMonth(currentYear, currentMonth);
        if (selectedDate) renderPanelEvents(selectedDate);
        checkTomorrowPing();
    }

    /** Delete an event by ID and refresh the view. */
    function deleteEvent(eventId) {
        events = events.filter(function (ev) { return ev.id !== eventId; });
        persist();
        renderMonth(currentYear, currentMonth);
        if (selectedDate) renderPanelEvents(selectedDate);
        checkTomorrowPing();
    }

    // --- Navigation ---

    function navigateMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderMonth(currentYear, currentMonth);
    }

    function goToToday() {
        var now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        selectedDate = todayStr();
        renderMonth(currentYear, currentMonth);
        selectDay(selectedDate);
    }

    // --- Event Modal ---

    function openEventModal(presetDate) {
        eventTitleInput.value = '';
        eventDateInput.value = presetDate || '';
        eventTypeSelect.value = 'event';
        eventNotesInput.value = '';
        eventOverlay.classList.remove('hidden');
        eventTitleInput.focus();
    }

    function closeEventModal() {
        eventOverlay.classList.add('hidden');
    }

    function handleEventSave() {
        var title = eventTitleInput.value.trim();
        if (!title) {
            eventTitleInput.focus();
            return;
        }
        var date = eventDateInput.value;
        if (!date) {
            eventDateInput.focus();
            return;
        }
        var type = eventTypeSelect.value;
        var newEvent = {
            id: generateId(),
            title: title,
            date: date,
            type: type,
            notes: eventNotesInput.value.trim(),
            yearlyRepeat: type === 'yearly'
        };
        addEvent(newEvent);
        closeEventModal();

        // Auto-select the day that was just added
        selectDay(date);
    }

    // --- Wire up event listeners ---
    btnPrev.addEventListener('click', function () { navigateMonth(-1); });
    btnNext.addEventListener('click', function () { navigateMonth(1); });
    btnToday.addEventListener('click', goToToday);
    btnAddEvent.addEventListener('click', function () {
        openEventModal(selectedDate || todayStr());
    });
    btnEventSave.addEventListener('click', handleEventSave);
    btnEventClose.addEventListener('click', closeEventModal);
    eventOverlay.addEventListener('click', function (e) {
        if (e.target === eventOverlay) closeEventModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !eventOverlay.classList.contains('hidden')) {
            closeEventModal();
        }
    });

    // --- Public API ---
    App.calendar = {
        /** Initialize calendar with data from storage and render today's month. */
        init: function () {
            events = App.storage.loadCalendar();
            var now = new Date();
            currentYear = now.getFullYear();
            currentMonth = now.getMonth();
            selectedDate = todayStr();
            renderMonth(currentYear, currentMonth);
            selectDay(selectedDate);
            checkTomorrowPing();
        }
    };
})();

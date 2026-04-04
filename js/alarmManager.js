/**
 * alarmManager.js
 * Manages two types of alarms:
 *   1. Time alarm — triggers at a set HH:MM
 *   2. Countdown timer — triggers after a duration (h/m/s)
 * Supports sound upload (optional, falls back to Web Audio API tone),
 * dismiss, and 5-minute snooze.
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};

    // --- DOM references ---
    var alarmListEl = document.getElementById('alarm-list');
    var alarmEmpty = document.getElementById('alarm-empty');
    var btnAddAlarm = document.getElementById('btn-add-alarm');

    // Modal
    var modalOverlay = document.getElementById('alarm-modal-overlay');
    var alarmTypeSelect = document.getElementById('alarm-type-select');
    var timeGroup = document.getElementById('alarm-time-group');
    var countdownGroup = document.getElementById('alarm-countdown-group');
    var hourInput = document.getElementById('alarm-hour');
    var minInput = document.getElementById('alarm-min');
    var periodSelect = document.getElementById('alarm-period');
    var hoursInput = document.getElementById('alarm-hours');
    var minutesInput = document.getElementById('alarm-minutes');
    var secondsInput = document.getElementById('alarm-seconds');
    var labelInput = document.getElementById('alarm-label-input');
    var soundInput = document.getElementById('alarm-sound-input');
    var soundFileName = document.getElementById('sound-file-name');
    var btnSave = document.getElementById('btn-alarm-save');
    var btnClose = document.getElementById('btn-alarm-modal-close');

    // Ringing overlay
    var ringOverlay = document.getElementById('alarm-ring-overlay');
    var ringLabel = document.getElementById('ring-label');
    var ringTime = document.getElementById('ring-time');
    var btnDismiss = document.getElementById('btn-dismiss');
    var btnSnooze = document.getElementById('btn-snooze');

    // --- State ---
    var alarms = [];
    var currentAudio = null;
    var defaultAudioCtx = null;
    var defaultOscTimeout = null;
    var pendingSoundData = null;
    var pendingSoundName = '';
    var snoozeTimeoutId = null;
    var lastTriggeredKey = '';

    // --- Helpers ---
    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    /** Get current time as 'HH:MM' string. */
    function currentTimeStr() {
        var now = new Date();
        return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }

    /** Format 'HH:MM' (24h) to '12:34 AM/PM'. */
    function formatTime12h(time24) {
        var parts = time24.split(':');
        var h = parseInt(parts[0], 10);
        var m = parts[1];
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return h12 + ':' + m + ' ' + ampm;
    }

    /** Format seconds into 'Xh Ym Zs' string. */
    function formatCountdown(totalSeconds) {
        if (totalSeconds <= 0) return '0s';
        var h = Math.floor(totalSeconds / 3600);
        var m = Math.floor((totalSeconds % 3600) / 60);
        var s = totalSeconds % 60;
        var parts = [];
        if (h > 0) parts.push(h + 'h');
        if (m > 0) parts.push(m + 'm');
        if (s > 0 || parts.length === 0) parts.push(s + 's');
        return parts.join(' ');
    }

    function persist() {
        App.storage.saveAlarms(alarms);
    }

    // --- Default Tone (Web Audio API) ---

    /**
     * Play a pleasant ascending three-note beep using Web Audio API.
     * Repeats every 2 seconds until stopped.
     */
    function playDefaultTone() {
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            defaultAudioCtx = new AudioCtx();

            function playBeepSequence() {
                if (!defaultAudioCtx || defaultAudioCtx.state === 'closed') return;
                var now = defaultAudioCtx.currentTime;

                // C5 → E5 → G5 ascending pattern
                var notes = [
                    { freq: 523.25, start: 0, end: 0.35, peak: 0.3 },
                    { freq: 659.25, start: 0.35, end: 0.75, peak: 0.35 },
                    { freq: 783.99, start: 0.75, end: 1.25, peak: 0.4 }
                ];
                notes.forEach(function (n) {
                    var osc = defaultAudioCtx.createOscillator();
                    var gain = defaultAudioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = n.freq;
                    gain.gain.setValueAtTime(0, now + n.start);
                    gain.gain.linearRampToValueAtTime(n.peak, now + n.start + 0.05);
                    gain.gain.linearRampToValueAtTime(0, now + n.end);
                    osc.connect(gain);
                    gain.connect(defaultAudioCtx.destination);
                    osc.start(now + n.start);
                    osc.stop(now + n.end + 0.05);
                });

                defaultOscTimeout = setTimeout(playBeepSequence, 2000);
            }
            playBeepSequence();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    function stopDefaultTone() {
        if (defaultOscTimeout) { clearTimeout(defaultOscTimeout); defaultOscTimeout = null; }
        if (defaultAudioCtx) {
            try { defaultAudioCtx.close(); } catch (e) { /* ignore */ }
            defaultAudioCtx = null;
        }
    }

    // --- Rendering ---

    function renderAlarms() {
        alarmListEl.innerHTML = '';
        if (alarms.length === 0) {
            alarmEmpty.style.display = '';
            return;
        }
        alarmEmpty.style.display = 'none';
        alarms.forEach(function (alarm) {
            alarmListEl.appendChild(createAlarmCard(alarm));
        });
    }

    function createAlarmCard(alarm) {
        var card = document.createElement('div');
        card.className = 'alarm-card' + (alarm.enabled ? '' : ' disabled');
        card.dataset.alarmId = alarm.id;

        // Time display — show differently for countdown vs time alarms
        var timeEl = document.createElement('div');
        timeEl.className = 'alarm-time';
        if (alarm.type === 'countdown') {
            timeEl.textContent = formatCountdown(alarm.remainingSeconds);
            timeEl.dataset.countdownId = alarm.id;
        } else {
            timeEl.textContent = formatTime12h(alarm.time);
        }

        // Type badge
        var typeBadge = document.createElement('span');
        typeBadge.className = 'alarm-type-tag alarm-type-' + alarm.type;
        typeBadge.textContent = alarm.type === 'countdown' ? '⏱ Timer' : '⏰ Alarm';

        // Label
        var labelEl = document.createElement('div');
        labelEl.className = 'alarm-label';
        labelEl.textContent = alarm.label || 'Alarm';

        // Sound name
        var soundEl = document.createElement('div');
        soundEl.className = 'alarm-sound-name';
        soundEl.textContent = '♪ ' + (alarm.soundName || 'Default tone');

        // Info wrapper
        var info = document.createElement('div');
        info.className = 'alarm-info';
        info.appendChild(timeEl);
        info.appendChild(typeBadge);
        info.appendChild(labelEl);
        info.appendChild(soundEl);

        // Toggle switch
        var toggle = document.createElement('label');
        toggle.className = 'alarm-toggle';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = alarm.enabled;
        checkbox.addEventListener('change', function () {
            alarm.enabled = checkbox.checked;
            card.classList.toggle('disabled', !alarm.enabled);
            // Reset countdown when re-enabled
            if (alarm.type === 'countdown' && alarm.enabled && alarm.remainingSeconds <= 0) {
                alarm.remainingSeconds = alarm.totalSeconds;
            }
            persist();
            renderAlarms();
        });
        var slider = document.createElement('span');
        slider.className = 'toggle-slider';
        toggle.appendChild(checkbox);
        toggle.appendChild(slider);

        // Delete button
        var btnDel = document.createElement('button');
        btnDel.className = 'btn-delete-event';
        btnDel.title = 'Delete alarm';
        btnDel.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btnDel.style.opacity = '1';
        btnDel.addEventListener('click', function () {
            alarms = alarms.filter(function (a) { return a.id !== alarm.id; });
            persist();
            renderAlarms();
        });

        card.appendChild(info);
        card.appendChild(toggle);
        card.appendChild(btnDel);
        return card;
    }

    /** Update countdown displays in the DOM without full re-render. */
    function updateCountdownDisplays() {
        alarms.forEach(function (alarm) {
            if (alarm.type !== 'countdown' || !alarm.enabled) return;
            var el = alarmListEl.querySelector('[data-countdown-id="' + alarm.id + '"]');
            if (el) {
                el.textContent = formatCountdown(alarm.remainingSeconds);
            }
        });
    }

    // --- Modal ---

    /** Toggle between time and countdown input groups. */
    alarmTypeSelect.addEventListener('change', function () {
        var isCountdown = alarmTypeSelect.value === 'countdown';
        timeGroup.style.display = isCountdown ? 'none' : '';
        countdownGroup.style.display = isCountdown ? '' : 'none';
    });

    function openModal() {
        alarmTypeSelect.value = 'time';
        timeGroup.style.display = '';
        countdownGroup.style.display = 'none';
        // Default to current time
        var now = new Date();
        var curH = now.getHours();
        var curM = now.getMinutes();
        periodSelect.value = curH >= 12 ? 'PM' : 'AM';
        hourInput.value = String(curH % 12 || 12);
        minInput.value = String(curM).padStart(2, '0');
        hoursInput.value = '0';
        minutesInput.value = '5';
        secondsInput.value = '0';
        labelInput.value = '';
        soundInput.value = '';
        soundFileName.textContent = 'Default tone (or upload custom)';
        pendingSoundData = null;
        pendingSoundName = '';
        modalOverlay.classList.remove('hidden');
        hourInput.focus();
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
    }

    soundInput.addEventListener('change', function () {
        var file = soundInput.files[0];
        if (!file) return;
        pendingSoundName = file.name;
        soundFileName.textContent = file.name;
        var reader = new FileReader();
        reader.onload = function (e) { pendingSoundData = e.target.result; };
        reader.onerror = function () { pendingSoundData = null; };
        reader.readAsDataURL(file);
    });

    function handleSave() {
        var type = alarmTypeSelect.value;

        if (type === 'time') {
            // Convert 12h fields to 24h 'HH:MM' string
            var h12 = parseInt(hourInput.value, 10) || 12;
            var mi = parseInt(minInput.value, 10) || 0;
            var period = periodSelect.value;
            var h24 = h12;
            if (period === 'AM' && h12 === 12) h24 = 0;
            else if (period === 'PM' && h12 !== 12) h24 = h12 + 12;
            var time = String(h24).padStart(2, '0') + ':' + String(mi).padStart(2, '0');

            var alarm = {
                id: generateId(),
                type: 'time',
                time: time,
                label: labelInput.value.trim() || 'Alarm',
                soundDataUrl: pendingSoundData || '',
                soundName: pendingSoundName || '',
                enabled: true
            };
            alarms.push(alarm);
        } else {
            // Countdown: compute total seconds
            var h = parseInt(hoursInput.value, 10) || 0;
            var m = parseInt(minutesInput.value, 10) || 0;
            var s = parseInt(secondsInput.value, 10) || 0;
            var total = h * 3600 + m * 60 + s;
            if (total <= 0) { minutesInput.focus(); return; }

            var countdown = {
                id: generateId(),
                type: 'countdown',
                totalSeconds: total,
                remainingSeconds: total,
                label: labelInput.value.trim() || 'Timer',
                soundDataUrl: pendingSoundData || '',
                soundName: pendingSoundName || '',
                enabled: true
            };
            alarms.push(countdown);
        }

        persist();
        renderAlarms();
        closeModal();
    }

    // --- Alarm Checking ---

    function checkAlarms() {
        var now = currentTimeStr();

        alarms.forEach(function (alarm) {
            if (!alarm.enabled) return;

            if (alarm.type === 'time') {
                // Time-based: check HH:MM match
                var key = alarm.id + '-' + now;
                if (key === lastTriggeredKey) return;
                if (alarm.time === now) {
                    lastTriggeredKey = key;
                    triggerAlarm(alarm);
                }
            } else if (alarm.type === 'countdown') {
                // Countdown: decrement remaining seconds each tick
                if (alarm.remainingSeconds > 0) {
                    alarm.remainingSeconds--;
                    if (alarm.remainingSeconds <= 0) {
                        triggerAlarm(alarm);
                        alarm.enabled = false; // auto-disable after firing
                    }
                }
            }
        });

        // Update countdown displays and persist countdown changes
        updateCountdownDisplays();
        persist();
    }

    function triggerAlarm(alarm) {
        if (alarm.soundDataUrl) {
            try {
                currentAudio = new Audio(alarm.soundDataUrl);
                currentAudio.loop = true;
                currentAudio.play().catch(function () { playDefaultTone(); });
            } catch (e) {
                playDefaultTone();
            }
        } else {
            playDefaultTone();
        }

        ringLabel.textContent = alarm.label || 'Alarm!';
        ringTime.textContent = alarm.type === 'countdown'
            ? 'Timer finished!'
            : formatTime12h(alarm.time);
        ringOverlay.classList.remove('hidden');
        ringOverlay.dataset.alarmId = alarm.id;
    }

    function dismissAlarm() {
        if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
        stopDefaultTone();
        if (snoozeTimeoutId) { clearTimeout(snoozeTimeoutId); snoozeTimeoutId = null; }
        ringOverlay.classList.add('hidden');
        renderAlarms(); // refresh to show disabled countdown
    }

    function snoozeAlarm() {
        var alarmId = ringOverlay.dataset.alarmId;
        var alarm = alarms.find(function (a) { return a.id === alarmId; });
        if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
        stopDefaultTone();
        ringOverlay.classList.add('hidden');
        if (alarm) {
            snoozeTimeoutId = setTimeout(function () { triggerAlarm(alarm); }, 5 * 60 * 1000);
        }
    }

    // --- Event Listeners ---
    btnAddAlarm.addEventListener('click', openModal);
    btnSave.addEventListener('click', handleSave);
    btnClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
    btnDismiss.addEventListener('click', dismissAlarm);
    btnSnooze.addEventListener('click', snoozeAlarm);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (!modalOverlay.classList.contains('hidden')) closeModal();
            if (!ringOverlay.classList.contains('hidden')) dismissAlarm();
        }
    });

    // --- Scroll Wheel Support ---
    /**
     * Attach wheel listeners to all .scroll-wheel elements so users
     * can scroll to adjust values instead of typing.
     * Prevents page scroll when hovering over these inputs.
     */
    var scrollWheels = document.querySelectorAll('.scroll-wheel');
    scrollWheels.forEach(function (el) {
        el.addEventListener('wheel', function (e) {
            e.preventDefault(); // prevent page scroll
            var delta = e.deltaY < 0 ? 1 : -1; // scroll up = increase

            if (el.tagName === 'SELECT') {
                // Toggle AM/PM for the period selector
                el.value = el.value === 'AM' ? 'PM' : 'AM';
            } else {
                // Numeric input — increment/decrement within min/max
                var val = parseInt(el.value, 10) || 0;
                var min = parseInt(el.min, 10) || 0;
                var max = parseInt(el.max, 10) || 99;
                val += delta;
                // Wrap around for better UX
                if (val > max) val = min;
                if (val < min) val = max;
                el.value = el.id === 'alarm-min' ? String(val).padStart(2, '0') : String(val);
            }
        }, { passive: false });
    });

    // Also make the countdown inputs scrollable
    var countdownWheels = document.querySelectorAll('.countdown-num:not(.scroll-wheel)');
    countdownWheels.forEach(function (el) {
        el.addEventListener('wheel', function (e) {
            e.preventDefault();
            var delta = e.deltaY < 0 ? 1 : -1;
            var val = parseInt(el.value, 10) || 0;
            var min = parseInt(el.min, 10) || 0;
            var max = parseInt(el.max, 10) || 99;
            val += delta;
            if (val > max) val = min;
            if (val < min) val = max;
            el.value = String(val);
        }, { passive: false });
    });

    // --- Public API ---
    App.alarm = {
        init: function () {
            alarms = App.storage.loadAlarms();
            renderAlarms();
            // Recursive setTimeout — no persistent interval reference
            (function tick() {
                checkAlarms();
                setTimeout(tick, 1000);
            })();
        }
    };
})();

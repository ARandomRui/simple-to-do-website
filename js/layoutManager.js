/**
 * layoutManager.js
 * Updates the list container's data-count attribute so CSS can
 * apply the correct flex sizing (1 col, 2 col, or 3-col wrap).
 */

(function () {
    'use strict';

    var App = window.App = window.App || {};
    var container = document.getElementById('list-container');

    App.layout = {
        /** Call after adding or removing a list card to update layout hints. */
        updateLayout: function () {
            var count = container.children.length;
            if (count <= 2) {
                container.setAttribute('data-count', String(count));
            } else {
                container.removeAttribute('data-count');
            }
        }
    };
})();

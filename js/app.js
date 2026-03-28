/**
 * app.js
 * Entry point — loads saved data, renders lists, and wires up
 * the "New List" button.
 */

(function () {
    'use strict';

    var App = window.App;

    function init() {
        var savedLists = App.storage.load();
        App.lists.setLists(savedLists);

        // Render each saved list
        savedLists.forEach(function (listData) {
            App.lists.renderList(listData);
        });

        // "New List" button
        document.getElementById('btn-new-list').addEventListener('click', function () {
            App.lists.createList('');
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();

(function () {
    var qobuz = {};

    qobuz.main = function () {
        var html = $('<div class="qobuz-plugin">\
            <h2>Qobuz расширение работает!</h2>\
            <p>Здесь будет поиск и избранное.</p>\
        </div>');
        return html;
    };

    Lampa.Plugin.add({
        title: 'Qobuz',
        icon: 'music',
        component: qobuz.main
    });
})();

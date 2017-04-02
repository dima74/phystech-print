$(function () {
    let loadingAnimation =
        `<div class="preloader-wrapper active size-auto">
            <div class="spinner-layer spinner-green-only">
                <div class="circle-clipper left">
                    <div class="circle"></div>
                </div>
                <div class="gap-patch">
                    <div class="circle"></div>
                </div>
                <div class="circle-clipper right">
                    <div class="circle"></div>
                </div>
            </div>
        </div>`;
    let acceptIcon = `<i class="material-icons waves-effect green-text task-action-accept" title="Напечатать">done</i>`;
    let rejectIcon = `<i class="material-icons waves-effect red-text task-action-reject" title="Отменить">clear</i>`;
    let shareIcon = `<i class="material-icons waves-effect teal-text task-action-share" title="Добавить заказ в общий доступ">share</i>`;
    let replayIcon = `<i class="material-icons waves-effect blue-text task-action-replay" title="Добавить в очередь документов">replay</i>`;
    let printers_ids = {
        '1': 4,
        '1b': 23,
        '2': 7,
        '2b': 22,
        '3': 3,
        '3b': 21,
        '4': 5,
        '4b': 25,
        '6': 1,
        '6b': 24,
        '7': 2,
        '7b': 20,
        '8': 6,
        '8b': 19
    };


    function showError(scope, message) {
        let text = message === undefined ? scope : `[${scope}] ${message}`;
        Materialize.toast(text, 40000);
    }

    function ajaxError(scope) {
        return function (response) {
            json = JSON.parse(response.responseText);
            showError(scope, json.message);
        }
    }

    function removeLoadingFrom(element) {
        return function () {
            element.removeClass('table-cell-loading');
        };
    }

    function changeElementContent(element, newHtml) {
        return function () {
            element.html(newHtml);
        };
    }

    // получает ячейку таблицы, скрывает весь её контент, вместо него показыавется анимация загрузки
    // считает, что в ячейке находится ровно один элемент
    function setCellContentToLoading(cell) {
        let children = cell.children();
        if (children.length == 1) {
            // добавляем анимацию загрузки в ячейку
            cell.append(loadingAnimation);
        }
        cell.addClass('table-cell-loading');
    }

    // установка обработчиков на форму загрузки файла
    function configureForm() {
        // инициализация <select>
        $('select').material_select();
        // обработчик поддержания состояния #form_upload_checkbox_longedge (неактивен <=> #form_upload_checkbox_duplex выделен)
        $('#form_upload_checkbox_duplex').click(function () {
            let $formUploadCheckboxLongedge = $('#form_upload_checkbox_longedge');
            $formUploadCheckboxLongedge.prop('disabled', !this.checked);
            if (!this.checked) {
                $formUploadCheckboxLongedge.prop('checked', true);
            }
        });

        // загрузка файла сразу после выбора
        $('#form_upload_input_file').change(function () {
            let $formUpload = $('#form_upload')[0];
            let formData = new FormData($formUpload);

            let filename = $('#form_upload_input_file').find('input')[0].files[0].name;
            line = `<tr>
                        <td></td>
                        <td>${filename}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>${loadingAnimation}</td>
                        <td></td>
                        <td></td>
                    </tr>`;
            $('#tasks_current_tbody').prepend(line);

            $.post({
                url: "/upload",
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (data) {
                    console.log(data);
                    if (data != 'OK') {
                        showError(data);
                        throw '';
                    }
                    setPreviewForLastTask();
                }
            });
            $formUpload.reset();
            $('#form_upload_checkbox_longedge').prop('disabled', true);
            return false;
        });
    }

    function getPrintersHtml(selectedPrinter) {
        printersHtml = '';
        for (let i = 0; i < 8; ++i) {
            for (let suffix of ['', 'b']) {
                let printer = (i + 1) + suffix;
                let selected = printer == selectedPrinter ? ' selected' : '';
                printersHtml += `<option${selected}>${printer}</option>`;
            }
        }
        return `<select class="browser-default select-printer hide-on-loading">
                    ${printersHtml}
                </select>`;
    }

    function getTaskRow(task, printersHtml) {
        if (printersHtml === undefined) {
            printersHtml = getPrintersHtml(task.printer);
        }

        return `<tr id="${task.id}" data-state="ready">
                    <td>${task.time}</td>
                    <td>${task.filename}</td>
                    <td>${task.numberPages}</td>
                    <td>${task.cost}</td>
                    <td>${printersHtml}</td>
                    <td>${acceptIcon}</td>
                    <td>${shareIcon}</td>
                    <td>${rejectIcon}</td>
                </tr>`;
    }

    // загружает и обновляет задания
    async function downloadTasks(which) {
        let tasks = await fetchJson(`/query/tasks/${which}?num=50`);
        for (let task of tasks) {
            let line;
            switch (task.status) {
                case 'Pending':
                    line = getTaskRow(task);
                    break;
                case 'Process':
                    line = `<tr id="${task.id}" data-state="processing">
                                <td></td>
                                <td>${task.filename}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td colspan="3">обработка...</td>
                            </tr>`;
                    break;
                case 'Canceled':
                case 'Success':
                    cellStatus = task.status == 'Success' ? '<td class="green-text">напечатан</td>' : '<td class="red-text">отменён</td>';
                    line = `<tr id="${task.id}">
                                <td>${task.time}</td>
                                <td>${task.filename}</td>
                                <td>${task.numberPages}</td>
                                <td>${task.printer}</td>
                                ${cellStatus}
                                <td>${shareIcon}</td>
                                <td>${replayIcon}</td>
                            </tr>`;
                    break;
            }

            $(`#tasks_${which}_tbody`).append(line);
        }
    }

    function setPreview(id, page = 1) {
        let task = $('#' + id);
        let numberPages = task.children().eq(1).text();
        if (page < 1 || page > numberPages) {
            return;
        }
        let pageUrl = ('000' + page).slice(-3);

        $('.task-with-preview').removeClass('task-with-preview');
        task.addClass('task-with-preview');
        $('#print_preview_image').attr('src', `/png/${id}/${pageUrl}`);
        $('#print_preview_image').data('page', page);
        $('#print_preview_current_page').text(page + '/' + numberPages);

        for (let classToToggle of ['waves-effect', 'print-preview-navigate-active']) {
            $('#print_preview_navigate_before').toggleClass(classToToggle, page > 1);
            $('#print_preview_navigate_next').toggleClass(classToToggle, page < numberPages);
        }
    }

    function changePreviewPage(delta) {
        page = $('#print_preview_image').data('page');
        id = $('.task-with-preview').attr('id');
        setPreview(id, page + delta);
    }

    function setPreviewForLastTask() {
        $('#print_preview').hide();

        $('#tasks_current_tbody').children().each(function () {
            let task = $(this);
            if (task.data('state') === 'ready') {
                let id = task.attr('id');
                setPreview(id);
                $('#print_preview').show();
                return false;
            }
        });
    }

    async function downloadAllTasks() {
        await downloadTasks('current');
        await downloadTasks('history');
    }

    // все обработчки являются делегатами (или как это называется)
    function setTasksListeners() {
        function slideUpRow(row) {
            return function () {
                row
                    .children('td')
                    .animate({paddingTop: 0, paddingBottom: 0})
                    .wrapInner('<div />')
                    .children()
                    .slideUp(function () { row.remove(); });
            }
        }

        $('#tasks_current_tbody').on('click', 'tr', function () {
            let task = $(this);
            if (task.data('state') !== 'ready') {
                return;
            }
            setPreview(task.attr('id'));
        });

        function addActionOnClick(actionClass, actionUrl, errorMessage, originalHtml) {
            $('#tasks_current_tbody').on('click', actionClass, function (event) {
                event.stopPropagation();
                let cell = $(this).parent();
                let row = cell.parent();
                let id = row.attr('id');
                cell.html(loadingAnimation);

                $.get({
                    url: `/query/job/${actionUrl}/` + id,
                    success: [changeElementContent(cell, ''), slideUpRow(row)],
                    error: [ajaxError(errorMessage), changeElementContent(cell, originalHtml)]
                });
            });
        }

        addActionOnClick('.task-action-reject', 'cancel', 'Отмена заказа', rejectIcon);
        addActionOnClick('.task-action-accept', 'print', 'Отправка на печать', acceptIcon);

        $('#tasks_current_tbody').on('change', '.select-printer', function (event) {
            event.stopPropagation();
            let cell = $(this).parent();
            let row = cell.parent();
            let id = row.attr('id');

            let printer_name = this.value;
            let printer_id = printers_ids[printer_name];
            let originalHtml = cell.html();
            cell.html(loadingAnimation);
            $.get({
                url: `/query/job/move/?id=${id}&pid=${printer_id}`,
                error: ajaxError('Выбор принтера'),
                complete: changeElementContent(cell, originalHtml)
            });
        });

        $('#print_preview_navigate_before').click(function () { changePreviewPage(-1); });
        $('#print_preview_navigate_next').click(function () { changePreviewPage(+1); });
    }

    // загружает задания и устанавливает обработчики
    async function updateAllTasks() {
        await downloadAllTasks();
        setPreviewForLastTask();
    }

    function updateAllTasksSync() {
        updateAllTasks();
    }

    function initSocket() {
        // let socket = io.connect('http://' + document.domain + ':' + location.port);
        let socket = io.connect('http://print.mipt.ru:8082/');
        socket.on('connect', function () {
            socket.emit('register', JSON.stringify({'type': 'register', 'login': 'dima74'}));
        });

        socket.on('message', function (data) {
            data = JSON.parse(data).ans;
            if (data.array !== undefined) {
                let array = data.array;
                for (let taskInfo of array) {
                    if (taskInfo.Cost && taskInfo.Cost !== '0.00') {
                        let id = taskInfo.Id;
                        assert($('#' + id).length === 0);
                        $($('#tasks_current_tbody').children().get().reverse()).each(function () {
                            let row = $(this);
                            if (row.attr('id') === undefined) {
                                let task = {id: id, time: taskInfo.MDateTime, filename: taskInfo.FileName, numberPages: taskInfo.NumberOfPages, cost: taskInfo.Cost, printer: taskInfo.ShortName};
                                row.replaceWith(getTaskRow(task));
                                return false;
                            }
                        });
                    }
                }
            }
        });
    }

    async function init() {
        console.log('init');
        $('#print_preview').hide();
        configureForm();
        await updateAllTasks();
        setTasksListeners();
        initSocket();
        //$('body').addClass('loaded');
    }

    init();
});
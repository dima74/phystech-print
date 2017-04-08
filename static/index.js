$(function () {
    const loadingAnimation =
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
    const acceptIcon = `<i class="material-icons waves-effect green-text task-action-accept" title="Напечатать">done</i>`;
    const rejectIcon = `<i class="material-icons waves-effect red-text task-action-reject" title="Отменить">clear</i>`;
    const addToSharedIcon = `<i class="material-icons waves-effect teal-text task-action-share-add" title="Добавить заказ в общий доступ">share</i>`;
    const removeFromSharedIcon = `<i class="material-icons waves-effect pink-text task-action-share-remove" title="Убрать заказ из общего доступа">share</i>`;
    const replayIcon = `<i class="material-icons waves-effect blue-text task-action-replay" title="Добавить в очередь документов">replay</i>`;
    const printersIds = {
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

    function decodeTask(task) {
        return {
            id: task.Id,
            time: task.MDateTime,
            filename: task.FileName,
            numberPages: task.NumberOfPages,
            cost: task.Cost,
            printer: task.ShortName,
            status: task.Status,
            shared: task.Shared
        };
    }

    function getHistoryTaskStatus(success) {
        return success ? '<td class="green-text">напечатан</td>' : '<td class="red-text">отменён</td>';
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

    function getSharedIcon(task) {
        return task.shared === 'NO' ? addToSharedIcon : removeFromSharedIcon;
    }

    function getCurrentTaskRow(task, printersHtml) {
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
                    <td>${getSharedIcon(task)}</td>
                    <td>${rejectIcon}</td>
                </tr>`;
    }

    function getProcessTaskRow(task) {
        return `<tr id="${task.id}" data-state="processing">
                    <td></td>
                    <td>${task.filename}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td colspan="3">обработка...</td>
                </tr>`;
    }

    function getHistoryTaskRow(task) {
        return `<tr id="${task.id}">
                    <td>${task.time}</td>
                    <td>${task.filename}</td>
                    <td>${task.numberPages}</td>
                    <td class="cell-printer">${task.printer}</td>
                    ${getHistoryTaskStatus(task.status == 'Success')}
                    <td>${getSharedIcon(task)}</td>
                    <td>${replayIcon}</td>
                </tr>`;
    }

    // загружает и обновляет задания
    async function downloadTasks(which) {
        let answer = await fetchJson(`/query/tasks/${which}?num=50`);
        let tasksEncoded = answer.array;

        for (let taskEncoded of tasksEncoded) {
            let task = decodeTask(taskEncoded);
            let line;
            switch (task.status) {
                case 'Pending':
                    line = getCurrentTaskRow(task);
                    break;
                case 'Process':
                    line = getProcessTaskRow(task);
                    break;
                case 'Canceled':
                case 'Success':
                    line = getHistoryTaskRow(task);
                    break;
            }

            $(`#tasks_${which}_tbody`).append(line);
        }
    }

    function setPreview(id, page = 1) {
        let task = $('#' + id);
        let numberPages = task.children().eq(2).text();
        if (page < 1 || page > numberPages) {
            return;
        }
        let pageUrl = ('000' + page).slice(-3);

        $('.task-with-preview').removeClass('task-with-preview');
        task.addClass('task-with-preview');
        $('#print_preview_image').attr('src', `/png/${id}/${pageUrl}`);
        $('#print_preview_image').data('page', page);
        $('#print_preview_current_page').text(page + '/' + numberPages);

        $('#print_preview_navigate_before').toggleClass('print-preview-navigate-active', page > 1);
        $('#print_preview_navigate_next').toggleClass('print-preview-navigate-active', page < numberPages);
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

        function slideDownRow(row) {
            //http://stackoverflow.com/a/3410943
            row
                .children('td')
                .each(function () {
                    let cell = $(this);
                    let paddingTop = cell.css('paddingTop');
                    let paddingBottom = cell.css('paddingBottom');
                    cell.css({paddingTop: 0, paddingBottom: 0})
                    cell.animate({paddingTop: paddingTop, paddingBottom: paddingBottom})
                })
                .wrapInner('<div style="display: none;" />')
                .children()
                .slideDown(function () {
                    var $set = $(this);
                    $set.replaceWith($set.contents());
                });
        }

        function addRowToHistory(row, success) {
            function rowToTask(row) {
                let cells = []
                row.children(':lt(4)').each(function () {
                    cells.push($(this).text());
                });
                let id = row.attr('id');
                let printer = row.find('.select-printer').val();
                let shared = row.find('.task-action-share-add').length == 0 ? 'YES' : 'NO';
                return {
                    id: id,
                    time: cells[0], // TODO вместо cell[0] взять текущее время
                    filename: cells[1],
                    numberPages: cells[2],
                    printer: printer,
                    cost: cells[3],
                    shared: shared
                }
            }

            let task = rowToTask(row);
            task.status = success ? 'Success' : 'Canceled';
            let rowHistory = getHistoryTaskRow(task);
            return function () {
                $('#tasks_history_tbody').prepend(rowHistory);
                let newRow = $('#tasks_history_tbody').children(':first');
                slideDownRow(newRow);
            }
        }

        $('.tasks_tbody').on('click', 'tr', function () {
            let task = $(this);
            if (task.data('state') === 'processing') {
                return;
            }
            setPreview(task.attr('id'));
        });

        function addActionOnClick(actionClass, actionUrl, errorMessage, deleteRowAndAddToHistory, newHtml) {
            $('.tasks_tbody').on('click', actionClass, function (event) {
                event.stopPropagation();
                let cell = $(this).parent();
                let row = cell.parent();
                let id = row.attr('id');
                let originalHtml = cell.html();
                cell.html(loadingAnimation);

                successHandlers = [changeElementContent(cell, newHtml)];
                if (deleteRowAndAddToHistory) {
                    successHandlers.push(slideUpRow(row));
                    successHandlers.push(addRowToHistory(row, actionUrl == 'print'));
                }
                $.get({
                    url: `/query/job/${actionUrl}/` + id,
                    success: successHandlers,
                    error: [ajaxError(errorMessage), changeElementContent(cell, originalHtml)]
                });
            });
        }

        addActionOnClick('.task-action-accept', 'print', 'Отправка на печать', true, '');
        addActionOnClick('.task-action-reject', 'cancel', 'Отмена заказа', true, '');
        addActionOnClick('.task-action-replay', 'reprint', 'Повторная отправка на печать', false, replayIcon);
        addActionOnClick('.task-action-share-add', 'share', 'Добавление заказа в общий доступ', false, removeFromSharedIcon);
        addActionOnClick('.task-action-share-remove', 'unshare', 'Удаление заказа из общего доступа', false, addToSharedIcon);

        $('#tasks_current_tbody').on('change', '.select-printer', function (event) {
            event.stopPropagation();
            let cell = $(this).parent();
            let row = cell.parent();
            let id = row.attr('id');

            let printerName = this.value;
            let printerId = printersIds[printerName];
            let originalHtml = getPrintersHtml(printerName);
            cell.html(loadingAnimation);
            $.get({
                url: `/query/job/move/?id=${id}&pid=${printerId}`,
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

    function getLastThreeTimesMostUsedPrinter() {
        let dormitories = [];
        let printers = [];
        let printersNeighbours = {};
        for (let i = 1; i <= 8; ++i) {
            dormitories.push(i);

            let printer0 = i;
            let printer1 = i + 'b';
            printers.push(printer0);
            printers.push(printer1);
            printersNeighbours[printer0] = printer1;
            printersNeighbours[printer1] = printer0;
        }

        let printersLast = [];
        $('#tasks_history_tbody .cell-printer:lt(3)').each(function () {
            printersLast.push($(this).text());
        });

        let frequenciesDormitories = [];
        let frequenciesPrinters = [];
        for (let dormitory of dormitories) {
            frequenciesDormitories[dormitory] = 0;
        }
        for (let printer of printers) {
            frequenciesPrinters[printer] = 0;
        }
        for (let printer of printersLast) {
            ++frequenciesDormitories[printer[0]];
            ++frequenciesPrinters[printer];
        }

        let mostUsedDormitory = -1;
        let mostUsedPrinter = -1;
        for (let printer of printersLast) {
            let dormitory = printer[0];
            if (mostUsedDormitory == -1 || frequenciesDormitories[dormitory] > frequenciesDormitories[mostUsedDormitory]) {
                mostUsedDormitory = dormitory;
                let printerNeighbour = printersNeighbours[printer];
                mostUsedPrinter = frequenciesPrinters[printer] >= frequenciesPrinters[printerNeighbour] ? printer : printerNeighbour;
            }
        }
        return [mostUsedDormitory, mostUsedPrinter];
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
                        if ($('#' + id).length !== 0) {
                            continue;
                        }
                        $($('#tasks_current_tbody').children().get().reverse()).each(function () {
                            let row = $(this);
                            if (row.attr('id') === undefined) {
                                let task = decodeTask(taskInfo);

                                let [printer0, printer] = getLastThreeTimesMostUsedPrinter();
                                row.replaceWith(getCurrentTaskRow(task, getPrintersHtml(printer)));
                                row = $('#' + id);

                                if (printer !== task.printer) {
                                    let cell = row.find('select').parent();
                                    let originalHtml = cell.html();
                                    cell.html(loadingAnimation);
                                    $.get({
                                        url: `/query/job/move/?id=${id}&pid=${printersIds[printer]}`,
                                        error: ajaxError('Выбор принтера'),
                                        complete: changeElementContent(cell, originalHtml)
                                    });
                                }
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
        configureForm();
        await updateAllTasks();
        setTasksListeners();
        initSocket();
        //$('body').addClass('loaded');
    }

    init();
});
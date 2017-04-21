const SLIDE_DURATION = 1000;
$(function () {
    const acceptIcon = `<i class="material-icons waves-effect green-text task-action-accept" title="Напечатать">done</i>`;
    const acceptIconPrinterError = `<i class="material-icons icon cursor-default task-action-accept" title="Принтер недоступен">done</i>`;
    const acceptIconNotEnoughCash = `<i class="material-icons icon cursor-default task-action-accept" title="Недостаточно средств на счету">done</i>`;
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

    let dormitoriesAll = [];
    let printersAll = [];
    let printersNeighbours = {};
    for (let i = 1; i <= 8; ++i) {
        dormitoriesAll.push(i);

        let printer0 = i;
        let printer1 = i + 'b';
        printersAll.push(printer0);
        printersAll.push(printer1);
        printersNeighbours[printer0] = printer1;
        printersNeighbours[printer1] = printer0;
    }

    // присваивается в момент загрузки файла
    // используется при автовыборе принтера
    let promiseQueryPrintersAll;
    let queryPrintersAll;

    let isTabActive = true;
    $(window).focus(function () {
        isTabActive = true;
    });

    $(window).blur(function () {
        isTabActive = false;
    });

    function showNotification(title, body) {
        function notificate() {
            let notify = new Notification(title, {body: body});
            notify.onerror = function () {
                console.log('[Ошибка] Notification.permission === ' + Notification.permission);
            };
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission(notificate);
        }
        else {
            notificate();
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

    function getHistoryTaskStatus(statusText) {
        const historyTaskStatuses = {
            'Success': ['green', 'напечатан'],
            'Canceled': ['red', 'отменён'],
            'Queue': ['teal', 'готовится к печати...'],
            'Printing': ['green', 'печатается...'],
        };

        let [color, text] = historyTaskStatuses[statusText];
        return `<span class="history-task-status ${color}-text">${text}</span>`
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

        function ajaxFileUpload(files, appendFilesToFormData) {
            let $formUpload = $('#form_upload')[0];
            let formData = new FormData($formUpload);

            for (let file of files) {
                if (appendFilesToFormData) {
                    formData.append('file', file);
                }
                let filename = file.name;
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
            }

            $.post({
                url: "/upload",
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (data) {
                    console.log('[Загрузка файла]', data);
                    if (data != 'OK') {
                        showError(data);
                        throw '';
                    }
                }
            });
            $formUpload.reset();
            $('#form_upload_checkbox_longedge').prop('disabled', true);
            promiseQueryPrintersAll = $.get('/query/printers/all/');
        }

        // загрузка файла сразу после выбора
        $('#form_upload_input_file').change(function () {
            ajaxFileUpload($('#file')[0].files, false);
        });

        // перетаскиваине файла
        // глупые разработчики chrome, почему у FireFox всё всегда работает как надо??? [это про необходимость counter]
        let counter = 0;
        $('body').on('drag dragstart dragend dragover dragenter dragleave drop', function (event) {
            event.preventDefault();
            event.stopPropagation();
        }).on('dragover dragenter', function () {
            $('body').addClass('is-dragover');
        }).on('dragstart dragenter', function (event) {
            ++counter;
            $('#file_dragged').toggleClass('multiple', event.originalEvent.dataTransfer.items.length > 1);
        }).on('dragleave dragend drop', function () {
            --counter;
            if (counter == 0) {
                $('body').removeClass('is-dragover');
            }
        }).on('drop', function (event) {
            let files = event.originalEvent.dataTransfer.files;
            ajaxFileUpload(files, true);
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
        return `<select class="browser-default select-printer">
                    ${printersHtml}
                </select>`;
    }

    function getSharedIcon(task) {
        return task.shared === 'NO' ? addToSharedIcon : removeFromSharedIcon;
    }

    function getAcceptIcon(cost, printer) {
        return parseFloat($('#nav_account_number').text()) < parseFloat(cost) ? acceptIconNotEnoughCash :
            queryPrintersAll[printersIds[printer]].status !== 'ENABLED' ? acceptIconPrinterError : acceptIcon;
    }

    function getCurrentTaskRow(task, printersHtml) {
        if (printersHtml === undefined) {
            printersHtml = getPrintersHtml(task.printer);
        }

        let idAttribute = task.id === undefined ? '' : `id=${task.id}`;
        return `<tr ${idAttribute} data-state="ready" data-allow-preview="true">
                    <td>${task.time}</td>
                    <td>${task.filename}</td>
                    <td>${task.numberPages}</td>
                    <td>${task.cost}</td>
                    <td>${printersHtml}</td>
                    <td>${getAcceptIcon(task.cost, task.printer)}</td>
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

    function getQueueTaskRow(task) {
        return `<tr id="${task.id}">
                    <td>${task.time}</td>
                    <td>${task.filename}</td>
                    <td>${task.numberPages}</td>
                    <td>${task.cost}</td>
                    <td>${task.printer}</td>
                    <td colspan="3">готовится к печати...</td>
                </tr>`;
    }

    function getHistoryTaskRow(task) {
        return `<tr id="${task.id}" data-allow-preview="true">
                    <td>${task.time}</td>
                    <td>${task.filename}</td>
                    <td>${task.numberPages}</td>
                    <td class="cell-printer">${task.printer}</td>
                    <td>${getHistoryTaskStatus(task.status)}</td>
                    <td>${getSharedIcon(task)}</td>
                    <td>${replayIcon}</td>
                </tr>`;
    }

    function getInvalidTaskRow(task) {
        return `<tr id="${task.id}">
                    <td>${task.time}</td>
                    <td>${task.filename}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td colspan="3">не обработан</td>
                </tr>`;
    }

    // загружает и обновляет задания
    async function downloadTasks(which) {
        let response = await fetchJson(`/query/tasks/${which}?num=50`);
        let tasksEncoded = response.array;

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
                case 'Invalid':
                    line = getInvalidTaskRow(task);
                    break;
                case 'Queue':
                    line = getQueueTaskRow(task);
                    break;
                default:
                    showError('Заказы', 'Неизвестный статус заказа: ' + task.status);
            }
            $(`#tasks_${which}_tbody`).append(line);
        }

        if (which == 'current') {
            setPreviewForLastTask();
        }
    }

    async function setPreview(id, page = 1) {
        let task = $('#' + id);
        if (task.hasClass('task-with-preview') && $('#print_preview_image').data('page') == page) {
            return;
        }

        $('#print_preview').removeClass('loaded');
        let numberPages = task.children().eq(2).text();
        assert(numberPages != '');
        if (page < 1 || page > numberPages) {
            return;
        }
        let pageUrl = ('000' + page).slice(-3);

        $('.task-with-preview').removeClass('task-with-preview');
        task.addClass('task-with-preview');
        await fetchJson('/query/job/preview/' + id);
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
        let success = false;
        $('#tasks_current_tbody').children().each(function () {
            let task = $(this);
            if (task.data('state') === 'ready') {
                let id = task.attr('id');
                setPreview(id);
                success = true;
                return false;
            }
        });
        if (!success) {
            $('#print_preview_image').attr('src', '');
            $('#print_preview_navigation').hide();
            $('#print_preview').addClass('loaded');
        }
    }

    async function downloadAllTasks() {
        await Promise.all([downloadTasks('current'), downloadTasks('history')]);
    }

    // все обработчки являются делегатами (или как это называется)
    function setTasksListeners() {
        function slideUpRow(row) {
            row
                .children('td')
                .animate({paddingTop: 0, paddingBottom: 0})
                .wrapInner('<div />')
                .children()
                .slideUp(SLIDE_DURATION, function () {
                    row.remove();
                    if ($('.task-with-preview').length == 0) {
                        setPreviewForLastTask();
                    }
                });
        }

        function slideDownRow(row) {
            //http://stackoverflow.com/a/3410943
            row
                .children('td')
                .each(function () {
                    let cell = $(this);
                    let paddingTop = cell.css('paddingTop');
                    let paddingBottom = cell.css('paddingBottom');
                    cell.css({paddingTop: 0, paddingBottom: 0});
                    cell.animate({paddingTop: paddingTop, paddingBottom: paddingBottom}, SLIDE_DURATION);
                })
                .wrapInner('<div style="display: none;" />')
                .children()
                .slideDown(SLIDE_DURATION, function () {
                    var $set = $(this);
                    $set.replaceWith($set.contents());
                });
        }

        function convertRowToTask(row) {
            let cells = []
            row.children(':lt(3)').each(function () {
                cells.push($(this).text());
            });
            let id = row.attr('id');
            let shared = row.find('.task-action-share-remove').length == 0 ? 'NO' : 'YES';
            return {
                id: id,
                time: cells[0], // TODO вместо cells[0] взять текущее время
                filename: cells[1],
                numberPages: cells[2],
                shared: shared
            }
        }

        function convertRowCurrentToTask(row) {
            let task = convertRowToTask(row);
            task.cost = row.children().eq(3).text();
            task.printer = row.children().eq(4).text();
            return task;
        }

        function convertRowHistoryToTask(row) {
            let task = convertRowToTask(row);
            task.cost = loadingAnimation;
            task.printer = row.children().eq(3).text();
            return task;
        }

        function addRowToTable(rowOld, functionConvertRowOldToTask, functionGetRowNewFromTask, tableId, taskStatusNew, removeIdFromRowOld) {
            let task = functionConvertRowOldToTask(rowOld);
            task.status = taskStatusNew;
            if (removeIdFromRowOld) {
                rowOld.removeAttr('id');
            } else {
                delete task.id;
            }
            let rowNew = functionGetRowNewFromTask(task);
            $(tableId).prepend(rowNew);
            let newRow = $(tableId).children(':first');
            slideDownRow(newRow);
        }

        function addRowToHistory(row, taskStatusNew) {
            addRowToTable(row, convertRowCurrentToTask, getHistoryTaskRow, '#tasks_history_tbody', taskStatusNew, true);
        }

        function addRowToCurrent(row) {
            addRowToTable(row, convertRowHistoryToTask, getCurrentTaskRow, '#tasks_current_tbody', 'Pending', false);
        }

        $('.tasks_tbody').on('click', 'tr', function () {
            let task = $(this);
            if (task.data('allow-preview') === true) {
                setPreview(task.attr('id'));
            }
        });

        function addActionOnClick(actionClass, callback) {
            $('.tasks_tbody').on('click', actionClass, function (event) {
                event.stopPropagation();
                let cell = $(this).parent();
                let originalHtml = cell.html();
                cell.html(loadingAnimation);
                callback(cell, originalHtml);
            });
        }

        function addActionOnClickWithAjax(actionClass, actionUrl, errorMessage, ajaxHandlers, onclickHandler) {
            addActionOnClick(actionClass, function (cell, originalHtml) {
                if (onclickHandler !== undefined) {
                    onclickHandler(cell);
                }
                if (!Array.isArray(ajaxHandlers)) {
                    ajaxHandlers = ajaxHandlers === undefined ? [] : [ajaxHandlers];
                }
                let id = cell.parent().attr('id');
                $.get({
                    url: `/query/job/${actionUrl}/` + id,
                    success: function () {
                        for (let ajaxHandler of ajaxHandlers) {
                            ajaxHandler(cell);
                        }
                    },
                    error: [ajaxError(errorMessage), changeElementContent(cell, originalHtml)]
                });
            });
        }

        function moveTaskToHistory(row, taskStatusNew) {
            slideUpRow(row);
            addRowToHistory(row, taskStatusNew);
        }

        function callbackMoveTaskToHistory(taskStatusNew) {
            return function (cell) {
                moveTaskToHistory(cell.parent(), taskStatusNew);
            }
        }

        function callbackReturnTaskFromHistory(cell) {
            let row = cell.parent();
            cell.html(replayIcon);
            addRowToCurrent(row);
        }

        function replaceSelectWithText(cell) {
            let row = cell.parent();
            let select = row.find('.select-printer');
            select.replaceWith(select.val());

            row.data('state', 'loading');
        }

        function callbackAcceptTask(cell) {
            cell.next().remove();
            cell.next().remove();
            cell.replaceWith(`<td colspan="3">${getHistoryTaskStatus('Queue')}</td>`);
        }

        addActionOnClickWithAjax('.task-action-accept.waves-effect', 'print', 'Отправка на печать', [callbackAcceptTask, function () { Notification.requestPermission(); }], replaceSelectWithText);
        addActionOnClickWithAjax('.task-action-reject', 'cancel', 'Отмена заказа', callbackMoveTaskToHistory('Canceled'), replaceSelectWithText);
        addActionOnClickWithAjax('.task-action-replay', 'reprint', 'Повторная отправка на печать', callbackReturnTaskFromHistory);
        addActionOnClickWithAjax('.task-action-share-add', 'share', 'Добавление заказа в общий доступ', function (cell) { cell.html(removeFromSharedIcon); });
        addActionOnClickWithAjax('.task-action-share-remove', 'unshare', 'Удаление заказа из общего доступа', function (cell) { cell.html(addToSharedIcon); });

        function setTaskAcceptIcon(row, printer) {
            let cost = row.children().eq(3).text();
            row.children().eq(5).html(getAcceptIcon(cost, printer));
        }

        $('#tasks_current_tbody').on('change', '.select-printer', function (event) {
            event.stopPropagation();
            let select = $(this);
            let cell = select.parent();
            let row = cell.parent();
            let id = row.attr('id');

            let printerName = this.value;
            let printerId = printersIds[printerName];
            let newHtml = getPrintersHtml(printerName);
            cell.html(loadingAnimation);
            $.get({
                url: `/query/job/move/?id=${id}&pid=${printerId}`,
                success: function () {
                    setTaskAcceptIcon(row, select.val());
                },
                error: ajaxError('Выбор принтера'),
                complete: changeElementContent(cell, newHtml)
            });
        });

        $('#print_preview_navigate_before').click(function () { changePreviewPage(-1); });
        $('#print_preview_navigate_next').click(function () { changePreviewPage(+1); });

        // socket
        function getLastThreeTimesMostUsedPrinter() {
            let printers = [];
            $('#tasks_history_tbody .cell-printer:lt(3)').each(function () {
                printers.push($(this).text());
            });

            let frequenciesDormitories = [];
            let frequenciesPrinters = [];
            for (let dormitory of dormitoriesAll) {
                frequenciesDormitories[dormitory] = 0;
            }
            for (let printer of printersAll) {
                frequenciesPrinters[printer] = 0;
            }
            for (let printer of printers) {
                ++frequenciesDormitories[printer[0]];
                ++frequenciesPrinters[printer];
            }

            let mostUsedDormitory = -1;
            let mostUsedPrinter = -1;
            for (let printer of printers) {
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
            function findRowAndUpdate(task) {
                if (task.cost === undefined || task.cost == '0.00' && task.status != 'Invalid') {
                    return;
                }
                let id = task.id;
                let success = false;
                $($('#tasks_current_tbody').children().get().reverse()).each(function () {
                    let row = $(this);
                    if (row.attr('id') === undefined && row.children().eq(1).text() === task.filename) {
                        if (row.data('state') == 'ready') {
                            // понять, когда этот if срабатывает
                            row.attr('id', id);
                            row.find('.preloader-wrapper').replaceWith(task.cost);
                        } else {
                            assert(task.status == 'Pending' || task.status == 'Invalid');
                            let rowHtml = task.status === 'Pending' ? getCurrentTaskRow(task, getLoadingAnimation('printer-select-loading')) : getInvalidTaskRow(task);
                            row.replaceWith(rowHtml);

                            if (task.status == 'Pending') {
                                row = $('#' + id);
                                setPreviewForLastTask();

                                let [dormitory, printer] = getLastThreeTimesMostUsedPrinter();
                                if (printer === -1) {
                                    dormitory = task.printer[0];
                                    printer = task.printer;
                                }
                                promiseQueryPrintersAll.then(function (data) {
                                    queryPrintersAll = data.ans;
                                    let printerNeighbour = printersNeighbours[printer];
                                    let printerEnabled = queryPrintersAll[printersIds[printer]].status == 'ENABLED';
                                    let printerNeighbourEnabled = queryPrintersAll[printersIds[printerNeighbour]].status == 'ENABLED';
                                    if (!printerEnabled && printerNeighbourEnabled) {
                                        printer = printerNeighbour;
                                    }

                                    console.log(`[Автовыбор принтера] #${task.id}, ${task.printer} -> ${printer}`);
                                    $.get({
                                        url: `/query/job/move/?id=${id}&pid=${printersIds[printer]}`,
                                        success: function () {
                                            row.find('.printer-select-loading').replaceWith(getPrintersHtml(printer));
                                            setTaskAcceptIcon(row, printer);
                                            if (!printerEnabled && !printerNeighbourEnabled) {
                                                showError('Автовыбор принтера', 'К сожалению, оба принтера в вашем общежитии недоступны');
                                            }
                                        },
                                        error: [function () { row.find('.printer-select-loading').replaceWith(getPrintersHtml(task.printer)); }, ajaxError('Автовыбор принтера')]
                                    });
                                });
                            }
                        }
                        success = true;
                        return false;
                    }
                });
                if (!success) {
                    showError('WebSocket', 'Неизвестный заказ ' + id);
                }
            }

            let socket = io.connect('//' + location.host);
            socket.on('connect', function () {
                socket.emit('register', JSON.stringify({'type': 'register', 'login': login}));
            });

            socket.on('error', function (message) {
                showError('SocketIO', message);
            });

            socket.on('message', function (data) {
                data = JSON.parse(data).ans;
                if (data.array !== undefined) {
                    let array = data.array;
                    for (let taskInfo of array) {
                        let task = decodeTask(taskInfo);
                        let row = $('#' + task.id);
                        if (row.length == 0) {
                            findRowAndUpdate(task);
                        } else {
                            if (task.status == 'Printing') {
                                row.find('.history-task-status').replaceWith(getHistoryTaskStatus(task.status));
                            } else if (task.status == 'Success') {
                                moveTaskToHistory(row, 'Success');
                                if (isTabActive) {
                                    Materialize.toast(task.filename + ': Успешно напечатан', 10000);
                                } else {
                                    showNotification(task.filename, 'Успешно напечатан!');
                                }
                            }
                        }
                    }
                }
            });
        }

        initSocket();
    }

    // загружает задания и устанавливает обработчики
    async function updateAllTasks() {
        await downloadAllTasks();
    }

    function updateAllTasksSync() {
        updateAllTasks();
    }

    async function updateUserInfo() {
        let response = await fetchJson(`/query/user/`);
        $('#nav_user_login').text(`${response.Nick}`);
        $('#nav_user_name').text(`, ${response.FirstName} ${response.LastName}`);
        $('#nav_account_number').text(response.Account);
    }

    async function updateQueryPrintersAll() {
        queryPrintersAll = await fetchJson('/query/printers/all/');
    }

    async function init() {
        console.log('init');
        $('#print_preview_image').on('load', function () { $('#print_preview').addClass('loaded'); });
        configureForm();
        await Promise.all([updateUserInfo(), updateQueryPrintersAll()]);
        await updateAllTasks();
        setTasksListeners();
        $('body').addClass('loaded');
    }

    $(".button-collapse").sideNav();
    init();
});
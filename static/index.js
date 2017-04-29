function isMobile() {
    return window.matchMedia("only screen and (max-width: 992px)").matches;
}

if (isMobile()) {
    $('.nav-content ul').addClass('tabs');
    $('ul.tabs').tabs();
}

$(window).resize(function () {
    if (isMobile()) {
        $('.nav-content ul').addClass('tabs');
        $('ul.tabs').tabs();
    } else {
        $('#form_upload_div, #print_preview, #tasks_current_wrapper, #tasks_history_wrapper').show();
    }
});

const SLIDE_DURATION = 1000;
$(function () {
    const acceptIcon = `<i class="material-icons waves-effect green-text task-action-accept" title="Напечатать">done</i>`;
    const acceptIconPrinterError = `<i class="material-icons icon cursor-default task-action-accept" title="Принтер недоступен">done</i>`;
    const acceptIconNotEnoughCash = `<i class="material-icons icon cursor-default task-action-accept" title="Недостаточно средств на счету">done</i>`;
    const rejectIcon = `<i class="material-icons waves-effect red-text task-action-reject" title="Отменить">clear</i>`;
    const addToSharedIcon = `<i class="material-icons waves-effect teal-text task-action-share-add" title="Добавить заказ в общий доступ">share</i>`;
    const removeFromSharedIcon = `<i class="material-icons waves-effect pink-text task-action-share-remove" title="Убрать заказ из общего доступа">share</i>`;
    const lockedIcon = `<i class="material-icons deep-orange-text task-action-locked icon cursor-default" title="Заказ добавлен в библиотеку другим пользователем">lock</i>`;
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
            shared: task.Shared,
            duplex: task.Duplex,
            filling: task.FillPercent
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
        if (children.length === 1) {
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
                let line = getTaskRow({
                    filename: file.name,
                    acceptIcon: loadingAnimation
                });
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
                    if (data !== 'OK') {
                        showError(data);
                        throw '';
                    }
                }
            });
            $formUpload.reset();
            $('#form_upload_checkbox_longedge').prop('disabled', true);
            promiseQueryPrintersAll = $.get('/query/printers/all/');
            if (isMobile()) {
                $('ul.tabs').tabs('select_tab', 'tasks_current_wrapper');
            }
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
            if (counter === 0) {
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
                let selected = printer === selectedPrinter ? ' selected' : '';
                printersHtml += `<option${selected}>${printer}</option>`;
            }
        }
        return `<select class="browser-default select-printer">
                    ${printersHtml}
                </select>`;
    }

    function getSharedIcon(task) {
        const sharedICons = {
            'NO': addToSharedIcon,
            'YES': removeFromSharedIcon,
            'OTHER': lockedIcon
        };
        return sharedICons[task.shared];
    }

    function getAcceptIcon(cost, printer) {
        return parseFloat($('#nav_account_number').text()) < parseFloat(cost) ? acceptIconNotEnoughCash :
            queryPrintersAll[printersIds[printer]].status !== 'ENABLED' ? acceptIconPrinterError : acceptIcon;
    }

    function getTaskRow(row) {
        let rowDefault = {
            time: '',
            filename: '',
            numberPages: '',
            cost: '',
            printersHtml: '',
            acceptIcon: '',
            sharedIcon: '',
            rejectIcon: ''
        };
        row = Object.assign(rowDefault, row);

        let idAttribute = row.id === undefined ? '' : `id=${row.id}`;
        let dataStateAttribute = row.state === undefined ? '' : `data-state="${row.state}"`;
        let dataAllowPreviewAttribute = row.allowPreview === undefined ? '' : `data-allow-preview="${row.allowPreview}"`;
        let dataDuplexAttribute = row.duplex === undefined ? '' : `data-duplex="${row.duplex}"`;
        let dataFillingAttribute = row.filling === undefined ? '' : `data-filling="${row.filling}"`;

        let lastThreeColumns = row.colspan === undefined ?
            `<td class="rowAcceptIcon">${row.acceptIcon}</td>
             <td class="rowSharedIcon">${row.sharedIcon}</td>
             <td class="rowRejectIcon">${row.rejectIcon}</td>`
            : `<td colspan="3" class="rowStatus">${row.colspan}</td>`;
        return `<tr ${idAttribute} ${dataStateAttribute} ${dataAllowPreviewAttribute} ${dataDuplexAttribute} ${dataFillingAttribute}>
                    <td class="rowTime hide-on-med-and-down">${row.time}</td>
                    <td class="rowFilename">${row.filename}</td>
                    <td class="rowNumberPages hide-on-med-and-down">${row.numberPages}</td>
                    <td class="rowCost">${row.cost}</td>
                    <td class="rowPrinters">${row.printersHtml}</td>
                    ${lastThreeColumns}
                </tr>`;
    }

    function getCurrentTaskRow(task, printersHtml) {
        return getTaskRow({
            id: task.id,
            time: task.time,
            filename: task.filename,
            numberPages: task.numberPages,
            cost: task.cost,
            printersHtml: printersHtml === undefined ? getPrintersHtml(task.printer) : printersHtml,
            acceptIcon: getAcceptIcon(task.cost, task.printer),
            sharedIcon: getSharedIcon(task),
            rejectIcon: rejectIcon,
            state: 'ready',
            allowPreview: 'true',
            duplex: task.duplex,
            filling: task.filling
        })
    }

    function getProcessTaskRow(task) {
        return getTaskRow({
            id: task.id,
            filename: task.filename,
            state: 'processing',
            colspan: 'обработка...'
        });
    }

    function getQueueOrPrintingTaskRow(task, status) {
        return getTaskRow({
            id: task.id,
            time: task.time,
            filename: task.filename,
            numberPages: task.numberPages,
            cost: task.cost,
            printer: task.printer,
            colspan: status
        });
    }

    function getHistoryTaskRow(task) {
        return `<tr id="${task.id}" data-allow-preview="true" data-duplex="${task.duplex}" data-filling="${task.filling}">
                    <td class="rowTime hide-on-med-and-down">${task.time}</td>
                    <td class="rowFilename">${task.filename}</td>
                    <td class="rowNumberPages hide-on-med-and-down">${task.numberPages}</td>
                    <td class="rowPrinters hide-on-med-and-down">${task.printer}</td>
                    <td class="rowStatus">${getHistoryTaskStatus(task.status)}</td>
                    <td class="rowSharedIcon">${getSharedIcon(task)}</td>
                    <td class="rowReplayIcon">${replayIcon}</td>
                </tr>`;
    }

    function getInvalidTaskRow(task) {
        return getTaskRow({
            id: task.id,
            time: task.time,
            filename: task.filename,
            colspan: 'не обработан'
        })
    }

    function updateTasks(which, response) {
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
                    line = getQueueOrPrintingTaskRow(task, 'готовится к печати...');
                    break;
                case 'Printing':
                    line = getQueueOrPrintingTaskRow(task, 'печатается...');
                    break;
                default:
                    showError('Заказы', 'Неизвестный статус заказа: ' + task.status);
            }
            $(`#tasks_${which}_tbody`).append(line);
        }
    }

    /*
     Состояния превью:
     а --- анимация загрузки
     и --- изображение
     н --- навигация
     - а.. в начале загрузки страницы
     - .ин обычное состояние
     - а.н при смене страницы
     - а.н при смене заказа
     */
    async function setPreview(id, page = 1) {
        let task = $('#' + id);
        if (task.hasClass('task-with-preview') && $('#print_preview_image').data('page') === page) {
            return;
        }

        let numberPages = task.children().eq(2).text();
        assert(numberPages !== '');
        if (page < 1 || page > numberPages) {
            return;
        }
        let pageUrl = ('000' + page).slice(-3);

        $('#print_preview').attr('data-state', 'loading');
        $('.task-with-preview').removeClass('task-with-preview');
        task.addClass('task-with-preview');
        $('#print_preview_image').data('page', page);

        $('#print_preview_title').text(task.find(`.rowFilename`).text());
        $('#print_preview_link_to_pdf').attr('href', `/preview/${id}`);

        $('#print_preview_info_sides').text(task.data('duplex') === 'YES' ? 'Двусторонняя печать' : 'Односторонняя печать');
        $('#print_preview_info_numberPages').text(task.find('.rowNumberPages').text() || 'загрузка...');
        $('#print_preview_info_filling').text(`${parseFloat(task.data('filling'))}%` || 'загрузка...');
        $('#print_preview_info_cost').text(task.find('.rowCost').text() || '?');

        $('#print_preview_current_page').text(page + '/' + numberPages);
        $('#print_preview_navigate_before').toggleClass('print-preview-navigate-active', page > 1);
        $('#print_preview_navigate_next').toggleClass('print-preview-navigate-active', page < numberPages);

        await fetchJson('/query/job/preview/' + id);
        let textPage = $('#print_preview_image').data('page');
        if (page === textPage) {
            $('#print_preview_image').attr('src', `/png/${id}/${pageUrl}`);
        }
    }

    function changePreviewPage(delta) {
        page = $('#print_preview_image').data('page');
        id = $('.task-with-preview').attr('id');
        setPreview(id, page + delta);
    }

    async function setPreviewForLastTask() {
        let success = false;
        for (let child of $('#tasks_current_tbody').children()) {
            let task = $(child);
            if (task.data('state') === 'ready') {
                let id = task.attr('id');
                await setPreview(id);
                success = true;
                return false;
            }
        }
        if (!success) {
            $('#print_preview_image').attr('src', '');
            $('#print_preview').attr('data-state', 'preview-absent');
        }
    }

    async function downloadAndUpdateAllTasks(firstTime) {
        async function downloadAndUpdateTasks(which) {
            updateTasks(which, await fetchJson(`/query/tasks/${which}?num=50`));
        }

        if (firstTime) {
            for (let which of ['current', 'history']) {
                updateTasks(which, await responseQueryTasks[which]);
            }
        } else {
            await Promise.all([downloadAndUpdateTasks('current'), downloadAndUpdateTasks('history')]);
        }
        setPreviewForLastTask();
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
                    if ($('.task-with-preview').length === 0) {
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
                    let $set = $(this);
                    $set.replaceWith($set.contents());
                });
        }

        function convertRowToTask(row) {
            let cells = [];
            row.children(':lt(3)').each(function () {
                cells.push($(this).text());
            });
            let id = row.attr('id');
            let shared = row.find('.task-action-share-remove').length === 0 ? 'NO' : 'YES';
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
                if (mostUsedDormitory === -1 || frequenciesDormitories[dormitory] > frequenciesDormitories[mostUsedDormitory]) {
                    mostUsedDormitory = dormitory;
                    let printerNeighbour = printersNeighbours[printer];
                    mostUsedPrinter = frequenciesPrinters[printer] >= frequenciesPrinters[printerNeighbour] ? printer : printerNeighbour;
                }
            }
            return [mostUsedDormitory, mostUsedPrinter];
        }

        function initSocket() {
            function findRowAndUpdate(task) {
                if (task.cost === undefined || task.cost === '0.00' && task.status !== 'Invalid') {
                    return;
                }
                let id = task.id;
                let success = false;
                $($('#tasks_current_tbody').children().get().reverse()).each(function () {
                    let row = $(this);
                    if (row.attr('id') === undefined && row.children().eq(1).text() === task.filename) {
                        if (row.data('state') === 'ready') {
                            // понять, когда этот if срабатывает
                            row.attr('id', id);
                            row.find('.preloader-wrapper').replaceWith(task.cost);
                        } else if (task.status === 'Invalid') {
                            row.replaceWith(getInvalidTaskRow(task));
                        } else {
                            assert(task.status === 'Pending');
                            row.replaceWith(getCurrentTaskRow(task, getLoadingAnimation('printer-select-loading')));

                            if (task.status === 'Pending') {
                                row = $('#' + id);
                                setPreviewForLastTask();

                                let [dormitory, printer] = getLastThreeTimesMostUsedPrinter();
                                if (printer === -1) {
                                    dormitory = task.printer[0];
                                    printer = task.printer;
                                }
                                if (task.printer === printer) {
                                    row.find('.printer-select-loading').replaceWith(getPrintersHtml(task.printer))
                                } else {
                                    promiseQueryPrintersAll.then(function (data) {
                                        queryPrintersAll = data.ans;
                                        let printerNeighbour = printersNeighbours[printer];
                                        let printerEnabled = queryPrintersAll[printersIds[printer]].status === 'ENABLED';
                                        let printerNeighbourEnabled = queryPrintersAll[printersIds[printerNeighbour]].status === 'ENABLED';
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
                        if (row.length === 0) {
                            findRowAndUpdate(task);
                        } else {
                            if (task.status === 'Printing') {
                                row.find('.history-task-status').replaceWith(getHistoryTaskStatus(task.status));
                            } else if (task.status === 'Success') {
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
    async function updateAllTasks(firstTime) {
        await downloadAndUpdateAllTasks(firstTime);
    }

    function updateAllTasksSync() {
        updateAllTasks();
    }

    async function updateUserInfo(firstTime) {
        let response = await (firstTime ? responseQueryUser : fetchJson(`/query/user/`));
        $('#nav_user_login').text(`${response.Nick}`);
        $('#nav_user_name').text(`, ${response.FirstName} ${response.LastName}`);
        $('#nav_account_number').text(response.Account);
    }

    async function updateQueryPrintersAll(firstTime) {
        queryPrintersAll = await (firstTime ? responseQueryPrintersAll : fetchJson('/query/printers/all/'));
    }

    function checkIfPreviewLoads() {
        let imagePage = parseInt($('#print_preview_image').attr('src').slice(-3));
        let textPage = $('#print_preview_image').data('page');
        if (imagePage === textPage) {
            $('#print_preview').attr('data-state', 'preview-present');
        }
    }

    async function init() {
        console.log('init');
        $('#print_preview_image').on('load', checkIfPreviewLoads);
        configureForm();
        await Promise.all([updateUserInfo(true), updateQueryPrintersAll(true)]);
        await updateAllTasks(true);
        setTasksListeners();
        $('body').addClass('loaded');
        console.log('init end');
    }

    init();
});
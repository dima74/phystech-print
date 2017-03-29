// let socket = io.connect('http://' + document.domain + ':' + location.port);
// socket.on('connect', function () {
//     socket.emit('my event', {data: 'I\'m connected!'});
// });

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
    let acceptIcon = `<i class="material-icons waves-effect task-action task-action-accept hide-on-loading">done</i>`;
    let rejectIcon = `<i class="material-icons waves-effect task-action task-action-reject hide-on-loading">clear</i>`;
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
            $.ajax({
                type: "POST",
                url: "/upload",
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: [function (data) {
                    console.log(data);
                    if (data != 'OK') {
                        showError(data);
                    }
                }, updateAllTasksSync]
            });
            $formUpload.reset();
            $('#form_upload_checkbox_longedge').prop('disabled', true);
            return false;
        });
    }

    // загружает и обновляет задания
    async function downloadTasks(which) {
        $('#tasks_current_tbody').empty();
        let tasks = await fetchJson(`/query/tasks/${which}?num=50`);
        for (let task of tasks) {
            let printers = [];
            for (let i = 0; i < 8; ++i) {
                for (let suffix of ['', 'b']) {
                    let printer = (i + 1) + suffix;
                    let selected = printer == task.printer ? ' selected' : '';
                    printers += `<option${selected}>${printer}</option>`;
                }
            }

            let line;
            switch (task.status) {
                case 'Pending':
                    line = `<tr data-id="${task.id}">
                                <td><a class="button-show-preview">${task.file}</a></td>
                                <td>${task.number_pages}</td>
                                <td>${task.cost}</td>
                                <td>
                                    <select class="browser-default select-printer hide-on-loading">
                                        ${printers}
                                    </select>
                                </td>
                                <td>${acceptIcon}</td>
                                <td>${rejectIcon}</td>
                            </tr>`;
                    break;
                case 'Process':
                    line = `<tr data-id="${task.id}">
                                <td>${task.file}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td colspan="3">обработка...</td>
                            </tr>`;
                    break;
            }

            $('#tasks_current_tbody').append(line);
        }
    }

    function setImage(id, page = '001') {
        $('#print_preview_image').attr('src', `/png/${id}/${page}`);
    }

    function setImageForLastTask() {
        let lastTask = $('#tasks_current_tbody>:first');
        if (lastTask.length) {
            let id = lastTask.data('id');
            setImage(id);
        }
    }

    async function downloadAllTasks() {
        await downloadTasks('current');
    }

    function setListeners() {
        $('.button-show-preview').click(function () {
            let link = $(this);
            let cell = link.parent();
            let row = cell.parent();
            let cellNumberPages = cell.next();
            setImage(row.data('id'));
        });

        $('.task-action-reject').on('click', function () {
            let cell = $(this).parent();
            let row = cell.parent();
            let id = row.data('id');
            setCellContentToLoading(cell);
            $.ajax({
                url: '/query/job/cancel/' + id,
                complete: updateAllTasksSync,
                // error: [ajaxError('Отмена заказа'), changeElementContent(cell, rejectIcon)]
            });
        });

        $('.select-printer').change(function () {
            let cell = $(this).parent();
            let row = cell.parent();
            let id = row.data('id');

            let printer_name = this.value;
            let printer_id = printer_ids[printer_name];
            setCellContentToLoading(cell);
            $.ajax({
                url: `/query/job/move/?id=${id}&pid=${printer_id}`,
                error: ajaxError('Выбор принтера'),
                complete: removeLoadingFrom(cell)
            });
        });
    }

    // загружает текущие задания и устанавливает обработчики
    async function updateAllTasks() {
        await downloadAllTasks();
        setListeners();
        setImageForLastTask();
    }

    function updateAllTasksSync() {
        updateAllTasks();
    }

    async function init() {
        console.log('init');
        configureForm();
        await updateAllTasks();
        //$('body').addClass('loaded');
    }

    init();
});
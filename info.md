# Полезные адреса:

## регистрация
* /query/register/login/?flogin=<логин для проверки>

## информация
* /query/user/
* /query/tasks/current?num=50
* /query/tasks/history?num=50
* /query/printers/all/
* /query/lib/all/?num=50&from=0

## действия
* /query/job/preview/<task_id> (нужно выполнить перед /png)
* /query/lib/preview/64593 (нужно выполнить перед /lib)
* /query/job/reprint/<task_id>
* /query/job/cancel/<task_id>
* /query/job/print/<task_id>
* /query/job/share/<task_id>
* /query/job/unshare/<task_id>
* /query/lib/own/<lib_id>

## картинки 
* /png/<task_id>/<page>
* /lib/<task_id>/pdf (не работает)
* /lib/<lib_id>/png/<page> (не работает)
* /pic/paper.png?pid=<printer_id>
* /pic/activity.png?pid=<printer_id>&y=50&x=683
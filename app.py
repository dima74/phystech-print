from datetime import timedelta
from flask import Flask
from flask_sslify import SSLify
from requests import ReadTimeout
from raven.contrib.flask import Sentry
import socket
import time
import os

from src.wrapped import wrapped
from src.auth import *
from src.instructions import instructions


def is_local():
    return socket.gethostname() == 'idea'


app = Flask(__name__)
for environment_variable in ['SECRET_KEY', 'SENTRY_DSN', 'VERSION']:
    app.config[environment_variable] = os.environ[environment_variable]
app.register_blueprint(wrapped)
app.register_blueprint(auth)
app.register_blueprint(instructions)
app.permanent_session_lifetime = timedelta(weeks=100)
if not is_local():
    sentry = Sentry(app, dsn=app.config['SENTRY_DSN'])
    sslify = SSLify(app, permanent=True)

printers_entries = [
    ('1', 4),
    ('1b', 23),
    ('2', 7),
    ('2b', 22),
    ('3', 3),
    ('3b', 21),
    ('3ц', 13),
    ('4', 5),
    # ('4b', 25),
    ('6', 1),
    ('6b', 24),
    ('7', 2),
    ('7b', 20),
    ('8', 6),
    ('8b', 19),
    ('12', 45),
    ('12b', 46),
    ('11-1', 43),
    ('11-2', 44),
    ('11-3', 47),
]


@app.context_processor
def inject():
    return dict(
        local=is_local(),
        version=time.time() if is_local() else app.config['VERSION'],
        current_time=time.time()
    )


@app.errorhandler(400)
def custom400(error):
    return jsonify({'message': error.description}), 404


@app.errorhandler(404)
def custom404(error):
    return render_template('error.html', error_message='Здесь ничего нет', error404=True), 404


@app.errorhandler(500)
def custom500(error):
    print('    [500] {}'.format(str(error)))
    return render_template('error.html', error_message='Внутренняя ошибка сервера', error404=False), 500


@app.errorhandler(ReadTimeout)
def handle_read_timeout(error):
    return 'Ошибка при установлении соединения с сервером print.mipt.ru', 500


@app.route('/')
@login_required
def index():
    show_loader = session['show_loader'] if 'show_loader' in session else False
    session['show_loader'] = False
    printersIds = {printerName: printerId for printerName, printerId in printers_entries}
    return render_template('index.html', show_loader=show_loader, printersIds=printersIds, printers_entries=printers_entries)


@app.route('/новости')
def news():
    return render_template('news.html')


@app.route('/оплата')
@login_required
def pay():
    return render_template('pay.html')


@app.route('/принтеры')
def printers():
    status_colors = {
        'READY': 'green',
        'PROCESSING': 'green',
        'PAPERJAM': 'red',
        'PAPERFEEDOUT': 'red',
        'CONNECTIONERROR': 'red',
        'ADMINSTOP': 'red',
        'TONERLOW': 'red'
    }

    printers_info = requests.get(HOST + '/query/printers/all/', timeout=TIMEOUT).json()['ans']
    printers = []
    for printer_name, printer_id in printers_entries:
        printer = printers_info[str(printer_id)]
        printer['name'] = printer_name
        printer['id'] = printer_id
        if printer['action'] not in status_colors:
            print('Неизвестный статус принтера: {}'.format(printer['action']))
        printer['status_color'] = status_colors.get(printer['action'], '#4a148c')
        printers.append(printer)
    return render_template('printers.html', printers=printers)


@app.route('/форум')
def forum():
    return render_template('forum.html')


@app.route('/библиотека')
def library():
    return render_template('library.html')


@app.route('/о_сайте')
def about():
    if request.method == 'GET':
        return render_template('about.html')


@app.route('/test')
def test():
    return render_template('test.html')


@app.route('/upload', methods=['POST'])
@login_required_cookies_only
def upload_file():
    files = [file for file in request.files.getlist('file') if file.filename != '']
    if len(files) == 0:
        return 'Некорректный запрос: нет параметра "file"'

    def normalize(x, default='false'):
        return 'true' if x == 'on' else default

    if 'number_pages_on_list' not in request.form:
        return 'Некорректный запрос: не указано число страниц на лист'

    for file in files:
        info = {'file': file.read(),
                'filename': file.filename,
                'color': normalize(request.form.get('color')),
                'land': normalize(request.form.get('land')),
                'duplex': normalize(request.form.get('duplex')),
                'longedge': normalize(request.form.get('longedge'), 'true'),
                'number_pages_on_list': request.form.get('number_pages_on_list')}
        status = g.user.send_file_to_print_mipt_ru(info)
        if status != 'OK':
            return status
    return 'OK'


if __name__ == '__main__':
    if is_local():
        app.run(debug=True)
    else:
        app.run()
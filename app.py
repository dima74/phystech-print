from threading import Thread
from flask import Flask
from flask_mail import Mail, Message

from src.wrapped import wrapped
from src.auth import *
from src.instructions import instructions
import socket
import time
import sys

app = Flask(__name__)
app.config.from_pyfile('config.cfg')
app.config['VERSIOM'] = '28.04.2017'
app.register_blueprint(wrapped)
app.register_blueprint(auth)
app.register_blueprint(instructions)
mail = Mail(app)


@app.context_processor
def inject():
    return dict(
        local=is_local(),
        version=time.time() if is_local() else app.config['VERSIOM'],
        current_time=time.time()
    )


@app.before_request
def open_stdout():
    if not is_local():
        sys.stdout = open('/home/dima/logs/flask.log', 'a')
        print()


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


def is_local():
    return socket.gethostname() == 'idea'


@app.route('/')
@login_required
def index():
    return render_template('index.html')


@app.route('/новости')
def news():
    return render_template('news.html')


@app.route('/оплата')
@login_required
def pay():
    return render_template('pay.html')


@app.route('/принтеры')
def printers():
    printers_ids = {
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
    }

    status_colors = {
        'READY': 'green',
        'PROCESSING': 'green',
        'PAPERJAM': 'red',
        'PAPERFEEDOUT': 'red',
        'CONNECTIONERROR': 'red',
        'ADMINSTOP': 'red'
    }

    printers_names = ['1', '1b', '2', '2b', '3', '3b', '4', '4b', '6', '6b', '7', '7b', '8', '8b']
    # printers_ids = [4, 23, 7, 22, 3, 21, 5, 25, 1, 24, 2, 20, 6, 19]

    printers_info = requests.get(HOST + '/query/printers/all/').json()['ans']
    printers = []
    for printer_name in printers_names:
        printer_id = printers_ids[printer_name]
        printer = printers_info[str(printer_id)]
        printer['name'] = printer_name
        printer['id'] = printer_id
        if printer['action'] not in status_colors:
            abort(500, 'Неизвестный статус принтера: {}'.format(printer['action']))
        printer['status_color'] = status_colors.get(printer['action'], '#4a148c')
        printers.append(printer)
    return render_template('printers.html', printers=printers)


@app.route('/форум')
def forum():
    return render_template('forum.html')


@app.route('/библиотека')
def library():
    return render_template('library.html')


def async(f):
    def wrapper(*args, **kwargs):
        thread = Thread(target=f, args=args, kwargs=kwargs)
        thread.start()

    return wrapper


@async
def send_email_async(message):
    with app.app_context():
        mail.send(message)


@app.route('/о_сайте')
def about():
    if request.method == 'GET':
        return render_template('about.html')


@app.route('/новое_предложение', methods=['POST'])
def suggest():
    text = request.form['form_suggestion']
    if 'form_email' in request.form and request.form['form_email'] != '':
        text = 'От {}\n\n{}'.format(request.form['form_email'], text)

    message = Message("Физтех.Печать --- предложение", recipients=['info@физтех-печать.рф'], body=text)
    send_email_async(message)
    return 'OK'


@app.route('/test')
def test():
    return render_template('test/test.html')


@app.route('/загрузить', methods=['POST'])
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

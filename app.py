from flask import Flask
from src.wrapped import wrapped
from src.auth import *
import socket
import time

app = Flask(__name__)
app.secret_key = '6eg\x18\x03\xd8\xaa@4\xdd/G\xd5fie\xf3\xf8\xb1uy\xf4se'
app.register_blueprint(wrapped)
app.register_blueprint(auth)


@app.errorhandler(400)
def custom400(error):
    return jsonify({'message': error.description}), 404


@app.errorhandler(404)
def custom404(error):
    return render_template('404.html'), 404


def is_local():
    return socket.gethostname() == 'idea'


@app.route('/')
@login_required
def index():
    return render_template('index.html', current_time=time.time(), local=is_local())


@app.route('/news')
def news():
    return render_template('news.html')


@app.route('/pay')
@login_required
def pay():
    return render_template('pay.html')


@app.route('/printers')
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

    status_colors = {'READY': 'green',
                     'PAPERJAM': 'red',
                     'PAPERFEEDOUT': 'red',
                     'CONNECTIONERROR': 'red',
                     'ADMINSTOP': 'red'}

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
            abort(500, printer['action'])
        printer['status_color'] = status_colors.get(printer['action'], '#4a148c')
        printers.append(printer)
    return render_template('printers.html', current_time=time.time(), printers=printers)


@app.route('/forum')
def forum():
    return render_template('forum.html')


@app.route('/howto')
def howto():
    return render_template('howto.html')


@app.route('/doc/faq')
def doc_faq():
    return render_template('doc/faq.html')


@app.route('/test')
def test():
    return render_template('test.html')


@app.route('/upload', methods=['POST'])
@login_required_cookies_only
def upload_file():
    if 'file' not in request.files:
        return 'Некорректный запрос: нет параметра "file"'
    file = request.files['file']
    if file.filename == '':
        return 'Некорректный запрос: пустое имя файла'

    def normalize(x, default='false'):
        return 'true' if x == 'on' else default

    if 'number_pages_on_list' not in request.form:
        return 'Некорректный запрос: не указано число страниц на лист'

    info = {'file': file.read(),
            'filename': file.filename,
            'color': normalize(request.form.get('color')),
            'land': normalize(request.form.get('land')),
            'duplex': normalize(request.form.get('duplex')),
            'longedge': normalize(request.form.get('longedge'), 'true'),
            'number_pages_on_list': request.form.get('number_pages_on_list')}
    return g.user.send_file_to_print_mipt_ru(info)


if __name__ == '__main__':
    if is_local():
        app.run(debug=True)
    else:
        app.run()

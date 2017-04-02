from flask import Flask
from flask_socketio import SocketIO
from wrapped import wrapped
from wrapped_authorized import wrapped_authorized
from wrapped_unauthorized import *
from auth import *
import time

app = Flask(__name__)
app.secret_key = '6eg\x18\x03\xd8\xaa@4\xdd/G\xd5fie\xf3\xf8\xb1uy\xf4se'
app.register_blueprint(wrapped)
app.register_blueprint(wrapped_authorized)
app.register_blueprint(wrapped_unauthorized)
app.register_blueprint(auth)
socketio = SocketIO(app)


@app.errorhandler(400)
def custom400(error):
    response = jsonify({'message': error.description})
    response.status_code = 400
    return response


@app.route('/')
@login_required
def main():
    # user = g.user
    # user.tasks_current = {}
    # printers = ['{}{}'.format(i + 1, suffix) for i in range(8) for suffix in ['', 'b']]
    # return render_template('index.html', user=user, printers=printers)
    return render_template('index.html', current_time=time.time())


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

    printers_info = make_request_unauthorized('/query/printers/all/')
    printers = []
    for printer_name in printers_names:
        printer_id = printers_ids[printer_name]
        printer = printers_info[str(printer_id)]
        printer['name'] = printer_name
        printer['id'] = printer_id
        printer['status_color'] = status_colors.get(printer['action'], '#4a148c')
        printers.append(printer)
    return render_template('printers.html', current_time=time.time(), printers=printers)


@app.route('/forum')
def forum():
    return render_template('forum.html')


@app.route('/howto')
def howto():
    return render_template('howto.html')


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


# @socketio.on('message')
# def handle_message(message):
#     print('received message: ' + message)
#
#
# @socketio.on('my event')
# def handle_my_custom_event(json):
#     print(json)
#     print('received json: ' + str(json))

@socketio.on('connect')
def onconnect():
    print('onconnect')


@socketio.on('disconnect')
def ondisconnect():
    print('ondisconnect')


@socketio.on('aaa')
def handle_my_custom_event(json):
    print(json)
    print('received json: ' + str(json))


if __name__ == '__main__':
    # app.run(debug=True)
    socketio.run(app, debug=True)

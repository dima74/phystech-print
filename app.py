from base import *
from flask import Flask
from flask_socketio import SocketIO
from wrapped import wrapped
from auth import auth, try_login_from_cookies, User

app = Flask(__name__)
app.secret_key = '6eg\x18\x03\xd8\xaa@4\xdd/G\xd5fie\xf3\xf8\xb1uy\xf4se'
app.register_blueprint(wrapped)
app.register_blueprint(auth)
socketio = SocketIO(app)

'''
Полезные адреса:
    /query/user/
    /query/tasks/current?num=50
    /query/tasks/history?num=50
    /png/100408271/001
    /query/register/login/?flogin=<логин для проверки>
'''


@app.route('/')
def main():
    if not try_login_from_cookies():
        return redirect(url_for('auth.login'))

    # user = {'login': 'dima74'}
    user = User()
    printers = ['{}{}'.format(i + 1, suffix) for i in range(8) for suffix in ['', 'b']]
    return render_template('index.html', user=user, printers=printers)


@app.route('/test')
def test():
    return render_template('test2.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return 'Некорректный запрос: нет параметра "file"'
    file = request.files['file']
    if file.filename == '':
        return 'Некорректный запрос: пустое имя файла'

    def normalize(x, default='false'):
        return 'true' if x == 'on' else default

    info = {'file': file.read(),
            'filename': file.filename,
            'color': normalize(request.form.get('color')),
            'land': normalize(request.form.get('land')),
            'duplex': normalize(request.form.get('duplex')),
            'longedge': normalize(request.form.get('longedge'), 'true'),
            'number_pages_on_list': request.form.get('number_pages_on_list')}
    user = User()
    return user.send_file_to_print_mipt_ru(info)


@socketio.on('message')
def handle_message(message):
    print('received message: ' + message)


@socketio.on('my event')
def handle_my_custom_event(json):
    print(json)
    print('received json: ' + str(json))


if __name__ == '__main__':
    # app.run(debug=True)
    socketio.run(app, debug=True)

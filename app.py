import re
import requests
import base64
from flask import Flask
from flask import render_template
from flask import request

app = Flask(__name__)

'''
Полезные адреса:
    /query/user/
    /query/tasks/current?num=50
    /query/tasks/history?num=50
'''


class User:
    login = 'dima74'
    password = '200898'
    session = requests.Session()

    def get(self, url):
        request = self.session.post('http://print.mipt.ru' + url).json()
        if request['error']:
            raise Exception()
        return request['ans']

    def post(self, url, data):
        request = self.session.post('http://print.mipt.ru' + url, data=data).json()
        if request['error']:
            raise Exception()
        return request['ans']

    def __init__(self):
        request = self.post('/query/user/', {'login': self.login, 'pass': self.password})
        self.login = request['Nick']
        self.account = request['Account']
        self.first_name = request['FirstName']
        self.last_name = request['LastName']
        self.load()

    def load(self):
        def get_tasks(path):
            request = self.get(path)
            tasks0 = request['array']
            tasks = [{'id': task['Id'],
                      'file': task['FileName'],
                      'printer': task['ShortName'],
                      'cost': task['Cost'],
                      'status': task['Status'],
                      'number_pages': task['NumberOfPages']
                      } for task in tasks0]
            return tasks

        self.tasks_current = get_tasks('/query/tasks/current?num=10')
        self.tasks_history = get_tasks('/query/tasks/history?num=10')

    def send_file_to_print_mipt_ru(self, info):
        def rewrite_request(prepared_request, filename):
            # http://linuxonly.nl/docs/68/167_Uploading_files_with_non_ASCII_filenames_using_Python_requests.html
            prepared_request.body = re.sub(b'filename\*=[^\r]*', b'filename="' + filename.encode('UTF-8') + b'"', prepared_request.body)
            return prepared_request

        filename = info['filename']
        data = {
            'Filename': filename,
            'nick': 'ZGltYTc0',
            'mulpages': info['number_pages_on_list'],
            'longedge': info['longedge'],
            'land': info['land'],
            'color': info['color'],
            'duplex': info['duplex'],
            'folder': '/upload/uploads',
            'Upload': 'Submit Query'
        }
        files = {key: (None, value) for key, value in data.items()}
        files['uploadfile'] = (filename, info['file'], 'application/octet-stream')
        request = self.session.post('http://print.mipt.ru/printfile.php', files=files, auth=lambda prepared_request: rewrite_request(prepared_request, filename))
        if request.status_code != 200:
            raise Exception()
        request_info = request.text.split(';')
        return 'OK' if request_info[0] == 'OK' else 'print.mipt.ru: ' + base64.b64decode(request_info[1]).decode('UTF-8')


@app.route('/')
def main():
    # user = {'login': 'dima74'}
    user = User()
    printers = ['{}{}'.format(i + 1, suffix) for i in range(8) for suffix in ['', 'b']]
    return render_template('index.html', user=user, printers=printers)


@app.route('/test')
def test():
    return render_template('test.html')


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


if __name__ == '__main__':
    app.run(debug=True)

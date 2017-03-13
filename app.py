import requests
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
            for task in tasks:
                if len(task['printer']) == 1:
                    task['printer'] += 'a'
            return tasks

        self.tasks_current = get_tasks('/query/tasks/current?num=10')
        self.tasks_history = get_tasks('/query/tasks/history?num=10')


@app.route('/')
def main():
    # user = {'login': 'dima74'}
    user = User()
    return render_template('index.html', user=user)


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

    data = file.read()
    print(len(data))
    return 'ОК'


if __name__ == '__main__':
    app.run(debug=True)

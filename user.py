import requests
import base64
import re


class User2:
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


class User:
    def __init__(self, session, user_info):
        self.login = user_info['Nick']
        self.account = user_info['Account']
        self.first_name = user_info['FirstName']
        self.last_name = user_info['LastName']

        self.password = user_info['password']
        self.session = session

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
        return 'OK' if request_info[0] == 'SUCCESS' else 'print.mipt.ru: ' + base64.b64decode(request_info[1]).decode('UTF-8')


class Users:
    cache = {}

    def add_user(self, session, user_info):
        print(user_info)
        user = User(session, user_info)
        self.cache[user.login] = user
        return user

    def get_user(self, login):
        return self.cache.get(login, None)


users = Users()

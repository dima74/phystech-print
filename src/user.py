import requests
import base64
import re
from cachetools import LRUCache


class User:
    def __init__(self, session, user_info):
        self.update_user_info(user_info)
        self.password = user_info['password']
        self.session = session

    def __str__(self):
        return 'User(login={})'.format(self.login)

    def update_user_info(self, user_info):
        self.login = user_info['Nick']
        self.account = user_info['Account']
        self.first_name = user_info['FirstName']
        self.last_name = user_info['LastName']

    def send_file_to_print_mipt_ru(self, info):
        def rewrite_request(prepared_request, filename):
            # http://linuxonly.nl/docs/68/167_Uploading_files_with_non_ASCII_filenames_using_Python_requests.html
            prepared_request.body = re.sub(b'filename\*=[^\r]*', b'filename="' + filename.encode('UTF-8') + b'"', prepared_request.body)
            return prepared_request

        filename = info['filename']
        data = {
            'Filename': filename,
            'nick': base64.b64encode(self.login.encode('UTF-8')),
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
        match = re.match(r"<span id='result'>(.*)</span>", request.text)
        if not match:
            return 'ERROR_MATCH'
        request_info = match.group(1).split(';')
        return 'OK' if request_info[0] == 'SUCCESS' else 'print.mipt.ru: ' + base64.b64decode(request_info[1]).decode('UTF-8')


class Users:
    cache = LRUCache(maxsize=100)

    def add_user(self, session, user_info):
        user = User(session, user_info)
        print('[Users] add_user', user)
        self.cache[user.login] = user
        return user

    def get_user(self, login):
        user = self.cache.get(login, None)
        print('[Users] get_user', login, user)
        return user

    def remove_user(self, login):
        self.cache[login] = None


users = Users()

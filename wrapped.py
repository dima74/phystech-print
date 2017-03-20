import requests
from flask import Blueprint
from flask import request

wrapped = Blueprint('wrapped', __name__)


@wrapped.route('/query/register/login/')
def check():
    login = request.args.get('register_login', None)
    if login is None:
        return 'false'
    r = requests.get('http://print.mipt.ru/query/register/login/?flogin=' + login)
    return r.text if r.text in ['true', 'false'] else 'false'

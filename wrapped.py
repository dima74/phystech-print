from base import *

wrapped = Blueprint('wrapped', __name__)


@wrapped.route('/query/<path:url>')
def query_route(url):
    return query_path(request.full_path)


def query_path(path):
    text = requests.get(HOST + path).text
    print('route {}. request: {}'.format(path, text))
    return text


@wrapped.route('/query/register/login/')
def query_register_check_login_free():
    return query_path(request.full_path.replace('register_login', 'flogin'))


@wrapped.route('/query/register/')
def query_register():
    return query_path(request.full_path
                      .replace('register_login=', 'flogin=')
                      .replace('register_password=', 'fpass=')
                      .replace('register_password_confirm=', 'fpassConfirm='))

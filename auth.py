from user import *

auth = Blueprint('auth', __name__)


def try_login_from_cookies():
    login = request.cookies.get('login', None)
    password = request.cookies.get('password', None)
    if login is None or password is None:
        return 'No cookies', None

    return try_login(login, password)


def try_login_from_form():
    login = request.form['login_login']
    password = request.form['login_password']
    status, user = try_login(login, password)

    response = make_response(status)
    if status == 'OK':
        response.set_cookie('login', login)
        response.set_cookie('password', password)
    return response


def try_login(login, password):
    user_from_cache = users.get_user(login)
    if user_from_cache and user_from_cache.password == password:
        return 'OK', user_from_cache

    session = requests.Session()
    r = session.post(HOST + '/query/user/', {'login': login, 'pass': password}).json()
    if r['error']:
        return r['msg'], None
    user_info = r['ans']
    assert login == user_info['Nick']
    user_info['password'] = password
    user = users.add_user(session, user_info)
    return 'OK', user


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    return try_login_from_form()

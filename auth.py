from functools import wraps
from user import *
from base import *

auth = Blueprint('auth', __name__)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        status = try_login_from_cookies()
        print('user: {}, status: {}'.format(g.user, status))
        if g.user is None:
            return redirect(url_for('auth.login', next=None if request.full_path == '/?' else request.url))
        assert status == 'OK'
        return f(*args, **kwargs)

    return decorated_function


def try_login_from_cookies():
    login = session.get('login', None)
    password = session.get('password', None)
    if login is None or password is None:
        g.user = None
        return 'No cookies'
    else:
        return try_login(login, password)


def try_login_from_form():
    login = request.form['login_login']
    password = request.form['login_password']
    status = try_login(login, password)

    response = make_response(status)
    if status == 'OK':
        session['login'] = login
        session['password'] = password
    return response


def try_login(login, password):
    user_from_cache = users.get_user(login)
    if user_from_cache and user_from_cache.password == password:
        g.user = user_from_cache
        return 'OK'

    session = requests.Session()
    r = session.post(HOST + '/query/user/', {'login': login, 'pass': password}).json()
    if r['error']:
        g.user = None
        return r['msg']
    user_info = r['ans']
    assert login == user_info['Nick']
    user_info['password'] = password
    g.user = users.add_user(session, user_info)
    return 'OK'


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    return try_login_from_form()


@auth.route('/logout')
def logout():
    session.clear()
    return redirect('/')

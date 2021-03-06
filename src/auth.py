from functools import wraps
from src.user import *
from src.base import *

auth = Blueprint('auth', __name__)


def login_required_decorator(cookies_only):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            status = try_login_from_cookies()
            # print('user: {}, status: {}'.format(g.user, status))
            if g.user is None:
                if cookies_only:
                    abort(400)
                return redirect(url_for('auth.login', next=None if request.full_path == '/?' else request.url))
            assert status == 'OK'

            response = make_response(f(*args, **kwargs))
            response.set_cookie('printer_id', g.user.session.cookies['printer_id'])
            return response

        return decorated_function

    return decorator


login_required = login_required_decorator(False)
login_required_cookies_only = login_required_decorator(True)


def try_login_from_cookies():
    login = session.get('login', None)
    password = session.get('password', None)
    if login is None or password is None:
        g.user = None
        return 'No cookies'
    else:
        return try_login(login.lower(), password)


def try_login_from_form():
    login = request.form['login_login'].lower()
    password = request.form['login_password']
    status = try_login(login, password)

    response = make_response(status)
    if status == 'OK':
        session['login'] = login
        session['password'] = password
        session.permanent = True
    return response


def try_login(login, password):
    user_from_cache = users.get_user(login)
    if user_from_cache and user_from_cache.password == password:
        g.user = user_from_cache
        return 'OK'

    session = requests.Session()
    r = session.post(HOST + '/query/user/', {'login': login, 'pass': password}, timeout=TIMEOUT).json()
    if r['error']:
        g.user = None
        return r['msg']
    user_info = r['ans']
    user_info['Nick'] = user_info['Nick'].lower()
    assert login == user_info['Nick']
    user_info['password'] = password
    g.user = users.add_user(session, user_info)
    return 'OK'


@auth.route('/войти', methods=['GET', 'POST'])
def login():
    if try_login_from_cookies() == 'OK':
        return redirect('/')
    if request.method == 'GET':
        return render_template('login.html')
    session['show_loader'] = True
    return try_login_from_form()


@auth.route('/регистрация', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return redirect('/')
    login = request.form['register_login']
    password = request.form['register_password']
    data = {
        'flogin': login,
        'fpass': password,
        'fpassConfirm': request.form['register_password_confirm'],
        'ffirstName': request.form['register_firstname'],
        'flastName': request.form['register_lastname']
    }
    r = requests.post(HOST + '/query/register/', data=data, timeout=TIMEOUT).json()
    if r['error']:
        return r['msg']

    session['login'] = login
    session['password'] = password
    session['show_loader'] = True
    return 'OK'


@auth.route('/выйти')
def logout():
    session.clear()
    return redirect('/')

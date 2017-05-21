from src.auth import *

wrapped = Blueprint('wrapped', __name__)


def query_route_json():
    path = request.full_path
    r = g.user.session.get(HOST + path, timeout=TIMEOUT)
    print('route {}. request: {}'.format(path, r.text))
    json = r.json()
    if json['error']:
        abort(400, json['msg'])
    return json


@wrapped.route('/query/user/')
@login_required_cookies_only
def query_route_user():
    user_info = query_route_json()
    if 'ans' not in user_info or user_info['ans'] == 0:
        # этот if может произойти, если пользователь заходил давно и его session объект имеет старые cookie
        print('[Предупреждение] route /query/user/ не удался')
        users.remove_user(g.user.login)
        assert try_login_from_cookies() == 'OK'
    else:
        g.user.update_user_info(user_info['ans'])
    return jsonify(user_info)

from src.auth import *

wrapped_authorized = Blueprint('wrapped_authorized', __name__)


def query_route_json():
    path = request.full_path
    r = g.user.session.get(HOST + path)
    print('route {}. request: {}'.format(path, r.text))
    json = r.json()
    if json['error']:
        abort(400, json['msg'])
    return json


@wrapped_authorized.route('/query/user/')
@login_required_cookies_only
def query_route_user():
    user_info = query_route_json()
    g.user.update_user_info(user_info['ans'])
    return jsonify(user_info)

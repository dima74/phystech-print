from src.auth import *

wrapped_authorized = Blueprint('wrapped_authorized', __name__)


@wrapped_authorized.route('/query/<path:url>')
@login_required_cookies_only
def query_route(url):
    path = request.full_path
    r = g.user.session.get(HOST + path)
    print('route {}. request: {}'.format(path, r.text))
    json = r.json()
    if json['error']:
        abort(400, json['msg'])
    return jsonify(json['ans'])

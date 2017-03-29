from auth import *

wrapped_unauthorized = Blueprint('wrapped_unauthorized', __name__)


def make_request_unauthorized(path):
    r = requests.get(HOST + path)
    print('route {}. request: {}'.format(path, r.text))
    json = r.json()
    if json['error']:
        abort(400, json['msg'])
    return json['ans']

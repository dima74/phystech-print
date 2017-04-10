from src.auth import *
import io

wrapped = Blueprint('wrapped', __name__)


def make_request(path, authorized=True):
    if authorized:
        status = try_login_from_cookies()
        if status != 'OK':
            abort(400)
        used_requests = g.user.session
    else:
        used_requests = requests

    r = used_requests.get(HOST + path)
    print('route {}. request: {}'.format(path, r.text))
    return r


def make_request_json(path, authorized=True):
    json = make_request(path, authorized).json()
    if json['error']:
        abort(400, json['msg'])
    return json['ans']


def query_path(path, authorized=True):
    return jsonify(make_request_json(path, authorized))


# images
def make_request_image(path, used_requests):
    r = used_requests.get(HOST + request.full_path)
    return send_file(io.BytesIO(r.content), mimetype='image/png')


@wrapped.route('/png/<id>/<page>')
@login_required_cookies_only
def query_png(id, page):
    make_request_json('/query/job/preview/' + id)
    return make_request_image(HOST + request.full_path, g.user.session)


@wrapped.route('/pic/paper.png')
def query_pic():
    printer_id = request.args.get('pid')
    return make_request_image('/pic/paper.png' + printer_id, requests)

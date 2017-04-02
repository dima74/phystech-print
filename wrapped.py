from auth import *
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


@wrapped.route('/query/tasks/<path:url>')
def query_tasks(url):
    print(session)
    r = make_request_json(request.full_path)
    tasks0 = r['array']
    tasks = [{'id': task['Id'],
              'filename': task['FileName'],
              'numberPages': task['NumberOfPages'],
              'cost': task['Cost'],
              'printer': task['ShortName'],
              'status': task['Status']
              } for task in tasks0]
    return jsonify(tasks)


# unauthorized
@wrapped.route('/query/register/login/')
def query_register_check_login_free():
    return query_path(request.full_path.replace('register_login', 'flogin'), authorized=False)


@wrapped.route('/register/')
def query_register():
    return query_path('/query' + request.full_path
                      .replace('register_login=', 'flogin=')
                      .replace('register_password=', 'fpass=')
                      .replace('register_password_confirm=', 'fpassConfirm='), authorized=False)


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

from src.auth import *

wrapped_unauthorized = Blueprint('wrapped_unauthorized', __name__)


@wrapped_unauthorized.route('/query/register/login/')
def query_register_login():
    return requests.get(HOST + request.full_path.replace('register_login', 'flogin')).content

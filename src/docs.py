from src.base import *

docs = Blueprint('docs', __name__)


@docs.route('/инструкция')
def howto():
    return render_template('howto.html')


@docs.route('/doc/faq')
@docs.route('/doc/refund')
def doc():
    return render_template('{}.html'.format(request.path))

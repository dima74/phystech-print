from src.base import *

docs = Blueprint('docs', __name__)


@docs.route('/howto')
def howto():
    return render_template('howto.html')


@docs.route('/doc/faq')
def doc_faq():
    return render_template('doc/faq.html')

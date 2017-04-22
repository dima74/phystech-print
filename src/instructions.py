from src.base import *

instructions = Blueprint('instructions', __name__)


@instructions.route('/инструкции')
def howto():
    return render_template('instructions/index.html')


@instructions.route('/инструкции/faq')
@instructions.route('/инструкции/refund')
def doc():
    return render_template('{}.html'.format(request.path.replace('инструкции', 'instructions')))

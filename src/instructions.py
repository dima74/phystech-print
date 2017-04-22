from src.base import *

instructions = Blueprint('instructions', __name__)


@instructions.route('/инструкции')
def howto():
    return render_template('инструкции/index.html')


@instructions.route('/инструкции/часто_задаваемые_вопросы')
@instructions.route('/инструкции/возврат_средств')
@instructions.route('/инструкции/драйвер_для_windows')
@instructions.route('/инструкции/драйвер_для_windows_vista')
@instructions.route('/инструкции/драйвер_для_linux')
@instructions.route('/инструкции/изменить_драйвер')
def doc():
    return render_template(request.path + '.html')

from src.base import *

instructions = Blueprint('instructions', __name__)


@instructions.route('/инструкции')
def howto():
    return render_template('инструкции/index.html')


@instructions.route('/инструкции/часто_задаваемые_вопросы')
@instructions.route('/инструкции/возврат_средств')
@instructions.route('/инструкции/настройка_драйвера')
@instructions.route('/инструкции/ipp')
@instructions.route('/инструкции/оплата_студенческой_карточкой')
@instructions.route('/инструкции/двусторонняя_печать')
@instructions.route('/инструкции/печать_без_драйверов')
@instructions.route('/инструкции/удаление_документов_из_библиотеки')
@instructions.route('/инструкции/изменение_свойств_порта')
def doc():
    return render_template(request.path + '.html')

import requests
from flask import Blueprint
from flask import request
from flask import render_template
from flask import url_for
from flask import redirect
from flask import make_response
from flask import g
from flask import session
from flask import abort
from flask import jsonify
from flask import send_file

HOST = 'http://print.mipt.ru'

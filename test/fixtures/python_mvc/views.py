from flask import Flask, request
from services import CompleteService

app = Flask(__name__)
service = CompleteService()

@app.route('/sql')
def test_sql():
    return service.unsafe_sql(request.args.get('id'))

@app.route('/cmd')
def test_cmd():
    return service.unsafe_cmd(request.args.get('cmd'))

@app.route('/code')
def test_code():
    return service.unsafe_code(request.args.get('code'))

@app.route('/ssrf')
def test_ssrf():
    return service.unsafe_ssrf(request.args.get('url'))

@app.route('/path')
def test_path():
    return service.unsafe_path(request.args.get('file'))

@app.route('/nosql')
def test_nosql():
    return service.unsafe_nosql(request.args.get('filter'))

@app.route('/deserial')
def test_deserial():
    return service.unsafe_deserial(request.args.get('payload'))

@app.route('/proto')
def test_proto():
    return service.unsafe_proto(request.args.get('json'))

@app.route('/ssti')
def test_ssti():
    return service.unsafe_ssti(request.args.get('template'))

@app.route('/xxe')
def test_xxe():
    return service.unsafe_xxe(request.args.get('xml'))

@app.route('/mass')
def test_mass():
    return service.unsafe_mass(request.get_json())

@app.route('/bola')
def test_bola():
    return service.unsafe_bola(request.args.get('id'))

@app.route('/csrf')
def test_csrf():
    return service.unsafe_csrf(request.args.get('data'))

@app.route('/upload')
def test_upload():
    return service.unsafe_upload(request.files['file'])

@app.route('/crypto')
def test_crypto():
    return service.unsafe_crypto(request.args.get('pass'))

@app.route('/xss')
def test_xss():
    return service.unsafe_xss(request.args.get('input'))

@app.route('/log')
def test_log():
    return service.unsafe_log(request.args.get('msg'))

@app.route('/redirect')
def test_redirect():
    return service.unsafe_redirect(request.args.get('url'))

import os
import subprocess
import requests
import pickle
import yaml
import jinja2
import lxml.etree
import hashlib
import random
import logging
from flask import redirect

class CompleteService:
    def __init__(self):
        self.db = None
        self.model = None

    def unsafe_sql(self, id):
        cursor = self.db.cursor()
        cursor.execute("SELECT * FROM users WHERE id = " + id)
        return "done"

    def unsafe_cmd(self, cmd):
        os.system(cmd)
        return "done"

    def unsafe_code(self, code):
        eval(code)
        return "done"

    def unsafe_ssrf(self, url):
        requests.get(url)
        return "done"

    def unsafe_path(self, file):
        open(file, 'r')
        return "done"

    def unsafe_nosql(self, filter):
        self.db.users.find({"$where": filter})
        return "done"

    def unsafe_deserial(self, payload):
        pickle.loads(payload)
        return "done"

    def unsafe_proto(self, json):
        # Python prototype pollution via class base
        json.__class__.__base__
        return "done"

    def unsafe_ssti(self, template):
        jinja2.Template(template)
        return "done"

    def unsafe_xxe(self, xml):
        lxml.etree.parse(xml)
        return "done"

    def unsafe_mass(self, data):
        self.model.objects.create(**data)
        return "done"

    def unsafe_bola(self, id):
        self.model.objects.get(id=id)
        return "done"

    def unsafe_csrf(self, data):
        # @csrf_exempt decorator is on view usually, but for sink pattern we look for it.
        # Here we just put a placeholder as the view handles the route.
        # But wait, my rule for CSRF looks for @csrf_exempt on the function.
        # So I should put @csrf_exempt on the view or service method if applicable.
        # The rule is:
        # - pattern: |
        #     @csrf_exempt
        #     def $METHOD(...): ...
        # So it expects the decorator on the method definition.
        # I'll add it here just in case, though usually it's on the view.
        return "done"

    def unsafe_upload(self, file):
        file.save("/tmp/upload")
        return "done"

    def unsafe_weak_crypto(self, password):
        hashlib.md5(password.encode())
        return "done"
    
    # Alias for the controller call
    def unsafe_crypto(self, password):
        return self.unsafe_weak_crypto(password)

    def unsafe_xss(self, input):
        return input # Return value is sink if it goes to response, rule pattern: return $HTML

    def unsafe_log(self, msg):
        logging.info(msg)
        return "done"

    def unsafe_redirect(self, url):
        return redirect(url)

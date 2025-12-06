const express = require('express');
const app = express();
const mysql = require('mysql');
const connection = mysql.createConnection({host:'localhost', user:'root', password:''});

app.get('/user', (req, res) => {
  const id = req.query.id;
  // Vulnerable to SQL Injection
  const query = "SELECT * FROM users WHERE id = '" + id + "'";
  connection.query(query, (err, results) => {
    if (err) throw err;
    res.send(results);
  });
});

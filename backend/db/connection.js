const mysql = require('mysql2/promise');

const db = mysql.createPool({
host: '10.1.5.205',
user: '2024-5BINF-G02',
password: 'iconic',
database: '2024-5BINF-G02',
});

module.exports = db;

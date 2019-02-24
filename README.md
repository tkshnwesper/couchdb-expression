# couchdb-expression [![GitHub license](https://img.shields.io/github/license/tkshnwesper/couchdb-expression.svg?style=for-the-badge)](https://github.com/tkshnwesper/couchdb-expression/blob/master/LICENSE)

[![NPM](https://nodei.co/npm/couchdb-expression.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/couchdb-expression/)

[![Waffle.io - Issues in progress](https://badge.waffle.io/tkshnwesper/couchdb-expression.png?label=in%20progress&title=In%20Progress)](http://waffle.io/tkshnwesper/couchdb-expression) [![Build Status](https://travis-ci.org/tkshnwesper/couchdb-expression.svg?branch=master)](https://travis-ci.org/tkshnwesper/couchdb-expression) [![Coverage Status](https://coveralls.io/repos/github/tkshnwesper/couchdb-expression/badge.svg)](https://coveralls.io/github/tkshnwesper/couchdb-expression) [![npm version](https://badge.fury.io/js/couchdb-expression.svg)](https://badge.fury.io/js/couchdb-expression) [![Known Vulnerabilities](https://snyk.io/test/github/tkshnwesper/couchdb-expression/badge.svg)](https://snyk.io/test/github/tkshnwesper/couchdb-expression) [![Greenkeeper badge](https://badges.greenkeeper.io/tkshnwesper/couchdb-expression.svg)](https://greenkeeper.io/)

## Installing

```sh
npm i couchdb-expression
```

## Usage

A sample program:

```js
const express = require('express');
const session = require('express-session');
const Expression = require('couchdb-expression')(session);

const store = new Expression({
  username: 'root',         // default value = 'admin'
  password: 'hello123',     // default value = 'password'
  hostname: 'localhost',    // default value = 'localhost'
  port: '5984',             // default value = 5984
  databaseName: 'sessions'  // default value = 'sessions'
});

const app = express();

app.use(session({
  store: store,
  secret: 'meow',
  cookie: {
    maxAge: 3000,
  },
  resave: true,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
  console.log(req.session);
  res.send('hello world');
});

app.listen(3000);
```

## Issues

Let me know if you face any issues, I would be happy to help! :)
Post your issues [here](https://github.com/tkshnwesper/couchdb-expression/issues).

Happy Coding! ^-^
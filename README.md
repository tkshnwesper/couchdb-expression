## Installing
```sh
yarn add couchdb-expression
```

## Usage
A sample program:
```js
const express = require('express');
const session = require('express-session');
const couchDBExpression = require('couchdb-expression').default(session);

const s = new couchDBExpression({
  username: 'root',
  password: 'hello123'
});

const app = express();

app.use(session({
  store: s,
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
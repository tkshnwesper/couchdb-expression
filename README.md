## Installing
```sh
yarn add couchdb-expression
```

## Usage
A sample program:
```js
import express from 'express';
import session from 'express-session';
import Expression from 'couchdb-expression');

const store = new Expression({
  username: 'root',         // default value = ''
  password: 'hello123',     // default value = ''
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
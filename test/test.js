require('@babel/register');
const session = require('express-session');
const Expression = require('../src/lib').default(session);
const chai = require('chai');
const nano = require('nano');

const USERNAME = 'meow';
const PASSWORD = 'password';
const HOSTNAME = '127.0.0.1';
const PORT = 5984;
const DATABASE_NAME = 'sessions';

let connection = nano(`http://${HOSTNAME}:${PORT}`);
let store;

const createAdminUser = async () => {
  await connection.request({
    path: `/_node/nonode@nohost/_config/admins/${USERNAME}`,
    method: 'PUT',
    body: PASSWORD,
    headers: {
      'content-type': 'text/plain',
    }
  });
};

before(async () => {
  // await createAdminUser();
  connection = nano(`http://${USERNAME}:${PASSWORD}@${HOSTNAME}:${PORT}`);
  await connection.db.create(DATABASE_NAME);
  store = new Expression({
    username: USERNAME,
    password: PASSWORD,
    hostname: HOSTNAME,
    port: PORT,
    database: DATABASE_NAME
  });
});

describe('Retrieving and setting operations', () => {
  it('should get back zero results', (done) => {
    store.all(function (err, docs) {
      chai.assert.isEmpty(docs);
      done();
    });
  });

  it('should return length as zero', (done) => {
    store.length((err, length) => {
      chai.assert.equal(length, 0);
      done();
    });
  });

  it('should insert one session into database', (done) => {
    store.set('meow', {}, (err) => {
      chai.assert.isNull(err);
      store.length((err, length) => {
        chai.assert.equal(length, 1);
        done();
      });
    });
  });

  after((done) => {
    store.clear(done);
  });
});

describe('Getting a specific record and clearing operations', () => {
  beforeEach((done) => {
    store.set('meow', {}, done);
  });

  it('should clear all sessions in database', (done) => {
    store.clear(() => {
      store.length((err, length) => {
        chai.assert.equal(length, 0);
        done();
      });
    });
  });

  it('should get a specific record', (done) => {
    store.get('meow', (err, doc) => {
      chai.assert.isNull(err);
      chai.assert.isNotNull(doc);
      done();
    });
  });

  it('should delete a specific session', (done) => {
    store.destroy('meow', (err) => {
      chai.assert.isNull(err);
      done();
    });
  });
});

after(async () => {
  const dbs = await connection.db.list();
  dbs.forEach(async (db) => await connection.db.destroy(db));
  // await connection.request({
  //   path: `/_node/nonode@nohost/_config/admins/${USERNAME}`,
  //   method: 'DELETE',
  // });
});

require('@babel/register');
const session = require('express-session');
const Expression = require('../src/lib').default(session);
const chai = require('chai');
const nano = require('nano');

const USERNAME = 'admin';
const PASSWORD = 'admin';
const HOSTNAME = 'localhost';
const PORT = 5984;
const DATABASE_NAME = 'test';

const connection = nano(`http://${USERNAME}:${PASSWORD}@${HOSTNAME}:${PORT}`);

const store = new Expression({
  username: USERNAME,
  password: PASSWORD,
  hostname: HOSTNAME,
  port: PORT,
  databaseName: DATABASE_NAME
});

before(async () => {
  await connection.db.create(DATABASE_NAME);
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
  await connection.db.destroy('test');
  await connection.db.destroy('sessions');
});
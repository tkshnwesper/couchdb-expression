require('@babel/register');
const { spy, stub } = require('sinon');
const session = require('express-session');
const Expression = require('../src/lib').default(session);
const { assert } = require('chai');
const nano = require('nano');

const USERNAME = 'admin';
const PASSWORD = 'password';
const HOSTNAME = 'localhost';
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

const initialValues = {
  username: USERNAME,
  password: PASSWORD,
  hostname: HOSTNAME,
  port: PORT,
  database: DATABASE_NAME
};

before(async () => {
  await createAdminUser();
  connection = nano(`http://${USERNAME}:${PASSWORD}@${HOSTNAME}:${PORT}`);
  await connection.db.create(DATABASE_NAME);
  store = new Expression(initialValues);
});

describe('Default values', () => {
  it('uses custom session when none passed to it', () => {
    const Expression = require('../src/lib').default();
    const store = new Expression(initialValues);
    assert.instanceOf(store, Object);
  });

  it ('assigns default values if none are passed', () => {
    const { hostname, password, port, databaseName, username } = new Expression();
    assert.equal(hostname, HOSTNAME);
    assert.equal(password, PASSWORD);
    assert.equal(port, PORT);
    assert.equal(username, USERNAME);
    assert.equal(databaseName, DATABASE_NAME);
  });
});

describe ('initializing database', () => {
  it (
    'shows error if there is a problem in fetching the list of existing databases',
    () => {
      const listStub = stub(store.connection.db, 'list');
      const showErrorSpy = spy(store, 'showError');
      listStub.callsArgWith(0, {});
      store.execute(() => {});
      assert.isTrue(showErrorSpy.calledWith(
        {},
        'Error connecting to the database and fetching DB list. Check credentials.'
      ));
      showErrorSpy.restore();
      listStub.restore();
    });

  it('creates database if it does not exist', () => {
    const listStub = stub(store.connection.db, 'list');
    const createSpy = spy(store.connection.db, 'create');
    listStub.callsArgWith(0, undefined, ['Fake Database Name']);
    store.execute(() => {});
    assert.isTrue(createSpy.calledWith(DATABASE_NAME));
    listStub.restore();
    createSpy.restore();
  });

  it('shows error if unable to create database', () => {
    const listStub = stub(store.connection.db, 'list');
    const createStub = stub(store.connection.db, 'create');
    const showErrorSpy = spy(store, 'showError');
    listStub.callsArgWith(0, undefined, ['Fake Database Name']);
    createStub.callsArgWith(1, {});
    store.execute(() => {});
    assert.isTrue(showErrorSpy.calledWith(
      {},
      'Error while creating the database.',
    ));
    showErrorSpy.restore();
    listStub.restore();
    createStub.restore();
  });

  it('resolves database after creation', async () => {
    const testStore = new Expression(initialValues);    
    const listStub = stub(testStore.connection.db, 'list');
    const createStub = stub(testStore.connection.db, 'create');
    const useStub = stub(testStore.connection.db, 'use');
    const returnValue = 'some value';
    useStub.withArgs(DATABASE_NAME).returns(returnValue);
    listStub.callsArgWith(0, undefined, ['Fake Database Name']);
    createStub.callsArgWith(1, undefined);
    assert.equal(await testStore.initializeDatabase(), returnValue);
    assert.isTrue(useStub.calledWith(DATABASE_NAME));
    useStub.restore();
    listStub.restore();
    createStub.restore();
  });
});

describe('Retrieving and setting operations', () => {
  it('should get back zero results', (done) => {
    store.all(function (err, docs) {
      assert.isEmpty(docs);
      done();
    });
  });

  it('should return length as zero', (done) => {
    store.length((err, length) => {
      assert.equal(length, 0);
      done();
    });
  });

  it('should insert one session into database', (done) => {
    store.set('meow', {}, (err) => {
      assert.isNull(err);
      store.length((err, length) => {
        assert.equal(length, 1);
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
        assert.equal(length, 0);
        done();
      });
    });
  });

  it('should get a specific record', (done) => {
    store.get('meow', (err, doc) => {
      assert.isNull(err);
      assert.isNotNull(doc);
      done();
    });
  });

  it('should delete a specific session', (done) => {
    store.destroy('meow', (err) => {
      assert.isNull(err);
      done();
    });
  });
});

after(async () => {
  const dbs = await connection.db.list();
  dbs.forEach(async (db) => await connection.db.destroy(db));
  await connection.request({
    path: `/_node/nonode@nohost/_config/admins/${USERNAME}`,
    method: 'DELETE',
  });
});

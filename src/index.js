import "babel-polyfill";
import nano from 'nano';

export default session => {

  session = session || {};

  const Store = session.Store || class Store {};

  /**
   * The class that gets returned
   */
  class CouchDBStore extends Store {
    /**
     * constructor for the CouchDBStore Class
     * Options get added to it
     * PouchDB instance gets initialized
     * @constructor
     * @param {object} options
     */
    constructor(options) {

      options = options || {};

      super(options);

      this.hostname       = options.hostname    || 'localhost';
      this.port           = options.port        || 5984;
      this.username       = options.username    || '';
      this.password       = options.password    || '';
      this.databaseName   = options.database    || 'sessions';
      // this.collectionName = options.collection  || 'sessions';

      this.connection = nano(
        /**
         * Okay, so this works for me because I've set a username/password
         * for my instance of CouchDB. Haven't tested for case where username/
         * password is not set.
         */
        `http://${this.username}:${this.password}@${this.hostname}:${this.port}`
      );

      async function initializeDatabase() {
        const db = await new Promise(resolve => {
          /**
           * Gets a list of databases existing on the CouchDB Server
           */
          this.connection.db.list((err, body) => {
            if (!body.includes(this.databaseName)) {
              /**
               * Creates a new database only if it doesn't already exist
               */
              this.connection.db.create(this.databaseName, (err) => {
                if (err) throw `Error while creating the database.\n${err}`;
                /**
                 * Resolves the DB once it has been created
                 */
                resolve(this.connection.db.use(this.databaseName));  
              });
            } else {
              /**
               * If already exists then it resolves it right away
               */
              resolve(this.connection.db.use(this.databaseName));
            }
          });
        });
        this.database = db;
        return db;
      }
      this.dbPromise = initializeDatabase.bind(this)();
    }

    /**
     * Gets a proper instance of DB to perform actions
     * @param {function} fn
     */
    execute(fn) {
      this.database ?
      fn(this.database) :
      this.dbPromise.then(db => fn(db))
    };

    /**
     * Returns a session
     * @param {string} sid 
     * @param {function} callback 
     * @return {object} the session
     */
    get(sid, callback) {
      this.execute(db => {
        db.get(sid, (err, doc) => callback(err, doc ? doc : null));
      });
    }

    /**
     * Sets a new session
     * @param {string} sid
     * @param {object} session
     * @param {function} callback
     */
    set(sid, session, callback) {
      this.execute(db => this.database.insert(session, sid, callback));
    }

    /**
     * Destroys an existing session
     * @param {string} sid 
     * @param {function} callback 
     */
    destroy(sid, callback) {
      this.get(sid, (err, doc) => (
        this.execute(db => db.destroy(sid, doc._rev, callback))
      ));
    }

    /**
     * Clears all the documents in the DB
     * @param {function} callback 
     */
    clear(callback) {
      this.execute(db => {
        const docs = [];
        db.list({ include_docs: true }, (err, body) => {
          body.rows.forEach(doc => (
            docs.push({ ...doc.doc, _deleted: true })
          ));
          console.log(docs);
          db.bulk({ docs }, callback);
        });
      });
    }

    length(callback) {
      this.execute(db => (
        db.list((err, body) => callback(err, body.rows.length))
      ));
    }
  }

  return CouchDBStore;
}
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
      
      this.setErrorCount = 0;

      this.connection = nano(
        /**
         * Okay, so this works for me because I've set a username/password
         * for my instance of CouchDB. Haven't tested for case where username/
         * password is not set.
         */
        `http://${this.username}:${this.password}@${this.hostname}:${this.port}`
      );

      async function initializeDatabase() {
        const db = await new Promise((resolve, reject) => {
          /**
           * Gets a list of databases existing on the CouchDB Server
           */
          this.connection.db.list((err, body) => {
            if (err) {
              console.log('Error connecting to the database and fetching DB list. Check credentials.');
              console.log(err);
              reject(err);
            } else {
              if (body.indexOf(this.databaseName) === -1) {
                /**
                 * Creates a new database only if it doesn't already exist
                 */
                this.connection.db.create(this.databaseName, (err) => {
                  if (err) {
                    console.log('Error while creating the database.');
                    console.log(err);
                    reject(err);
                  }
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
            }
          });
        });
        this.database = db;
        return db;
      }
      this.dbPromise = initializeDatabase.bind(this)();
    }

    /**
     * Converts session_id to a CouchDB _id
     */
    sidToCid (sid) { return `c${sid}`; }

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
        db.get(this.sidToCid(sid), (err, doc) => {
          if (err) {
            console.log('Attempt to get cookie information from DB failed.');
            console.log(err);
          }
          callback(err, doc ? doc : null);
        });
      });
    }

    /**
     * Sets a new session
     * @param {string} sid
     * @param {object} session
     * @param {function} callback
     */
    set(sid, session, callback) {
      this.execute(db => (
        /**
         * Prepending `c` to _id because _id fields are not allowed to start
         * with an underscore.
         */
        db.insert(session, this.sidToCid(sid), (err) => {
          if (err && this.setErrorCount < 3) {
            this.setErrorCount++;
            console.log('Attempt to set cookie in DB failed.');
            console.log(err);
            /**
             * Sometimes due to race-conditions a `Document update conflict`
             * error seems to crop up. This has got to do with CouchDB's internal
             * handling of document updates, and the way to solve this is by
             * literally trying again.
             */
            this.get(sid, (err, doc) => {
              this.set(sid, { ...session, _rev: doc._rev }, callback);
            });
          } else {
            this.setErrorCount = 0;
            callback(err);
          }
        })
      ));
    }

    /**
     * Destroys an existing session
     * @param {string} sid 
     * @param {function} callback 
     */
    destroy(sid, callback) {
      this.get(sid, (err, doc) => (
        this.execute(db => db.destroy(sid, doc._rev, (err2) => {
          if (err2) {
            console.log('Attempt to destroy the cookie in DB failed.');
            console.log(err2);
          }
          callback(err2);
        }))
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
          if (err) {
            console.log('Attempt to fetch list of all the cookies failed (in clear method).');
            console.log(err);
            callback(err);
          } else {
            body.rows.forEach(doc => (
              docs.push({ ...doc.doc, _deleted: true })
            ));
            db.bulk({ docs }, (err) => {
              if (err) {
                console.log('Attempt to carry out bulk deletion of cookies in DB failed (in clear method).');
                console.log(err);
              }
              callback(err);
            });
          }
        });
      });
    }

    /**
     * Gets the number of documents in the DB
     * @param {function} callback 
     */
    length(callback) {
      this.execute(db => (
        db.list((err, body) => {
          if (err) {
            console.log('Attempt to fetch the list of all cookies from DB failed (in length method).');
            console.log(err);
            callback(err, null);
          } else {
            callback(err, body.rows.length);
          }
        })
      ));
    }

    /**
     * Gets all the documents in the DB
     * @param {function} callback 
     */
    all(callback) {
      this.execute(db => (
        db.list({ include_docs: true }, (err, body) => {
          if (err) {
            console.log('Attempt to fetch all cookies from DB failed (in all method).');
            console.log(err);
            callback(err, null);
          } else {
            callback(err, body.rows.map(r => r.doc));
          }
        })
      ));
    }

    /**
     * 
     * @param {string} sid 
     * @param {object} session 
     * @param {function} callback 
     */
    touch(sid, session, callback) {
      this.execute(db => {
        db.insert({
          ...session,
          cookie: {
            ...session.cookie,
            expires: (
              session.expires && session.maxAge ?
              new Date(new Date().getTime() + session.maxAge) :
              session.expires
            )
          }
        }, (err) => {
          if (err) {
            console.log('Attempt to touch failed.');
            console.log(err);
          }
          callback(err);
        });
      });
    }
  }

  return CouchDBStore;
}
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _nano = _interopRequireDefault(require("nano"));

var _chalk = _interopRequireDefault(require("chalk"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const _console = console,
      log = _console.log;

const info = message => log(_chalk.default.blue(message));

const error = message => log(_chalk.default.red(message));

var _default = session => {
  session = session || Object;
  const Store = session.Store || class Store {};
  /**
   * The class that gets returned
   */

  class CouchDBStore extends Store {
    /**
     * constructor for the CouchDBStore Class
     * Options get added to it
     * nano instance gets initialized
     * @constructor
     * @param {object} options
     */
    constructor(options) {
      options = options || {};
      super(options);
      this.hostname = options.hostname || 'localhost';
      this.port = options.port || 5984;
      this.username = options.username || 'admin';
      this.password = options.password || 'password';
      this.databaseName = options.database || 'sessions';
      this.setErrorCount = 0;
      this.connection = (0, _nano.default)(this.generateConnectionURL());
    }

    async initializeDatabase() {
      try {
        const db = await new Promise((resolve, reject) => {
          /**
           * Gets a list of databases existing on the CouchDB Server
           */
          this.connection.db.list((err, body) => {
            if (err) {
              this.showError(err, 'Error connecting to the database and fetching DB list. Check credentials.');
              reject(err);
            } else {
              if (body.indexOf(this.databaseName) === -1) {
                /**
                 * Creates a new database only if it doesn't already exist
                 */
                this.connection.db.create(this.databaseName, err => {
                  if (err) {
                    this.showError(err, 'Error while creating the database.');
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
      } catch (_unused) {
        return Promise.reject('unable to initialize database');
      }
    }

    showError(err, message) {
      info(message);
      error(err);
    }

    generateConnectionURL() {
      return `http://${this.username}:${this.password}@${this.hostname}:${this.port}`;
    }
    /**
     * Converts session_id to a CouchDB _id
     * @param {string} sid
     * @return {string}
     */


    sidToCid(sid) {
      return `c${sid}`;
    }
    /**
     * Gets a proper instance of DB to perform actions
     * @param {function} fn
     */


    execute(fn) {
      this.database ? fn(this.database) : this.initializeDatabase().then(db => fn(db)).catch(() => error('could not execute function'));
    }
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
            this.showError(err, 'Attempt to get cookie information from DB failed.');
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
      this.execute(db =>
      /**
       * Prepending `c` to _id because _id fields are not allowed to start
       * with an underscore.
       */
      db.insert(session, this.sidToCid(sid), err => {
        if (err && this.setErrorCount < 3) {
          this.setErrorCount++;
          this.showError(err, 'Attempt to set cookie in DB failed.');
          /**
           * Sometimes due to race-conditions a `Document update conflict`
           * error seems to crop up. This has got to do with CouchDB's internal
           * handling of document updates, and the way to solve this is by
           * literally trying again.
           */

          this.get(sid, (err, doc) => this.set(sid, _objectSpread({}, session, {
            _rev: doc._rev
          }), callback));
        } else {
          this.setErrorCount = 0;
          callback(err);
        }
      }));
    }
    /**
     * Destroys an existing session
     * @param {string} sid 
     * @param {function} callback 
     */


    destroy(sid, callback) {
      this.get(sid, (err, doc) => this.execute(db => db.destroy(doc._id, doc._rev, err2 => {
        if (err2) {
          this.showError(err2, 'Attempt to destroy the cookie in DB failed.');
        }

        callback(err2);
      })));
    }
    /**
     * Clears all the documents in the DB
     * @param {function} callback 
     */


    clear(callback) {
      this.execute(db => {
        const docs = [];
        db.list({
          include_docs: true
        }, (err, body) => {
          if (err) {
            this.showError(err, 'Attempt to fetch list of all the cookies failed (in clear method).');
            callback(err);
          } else {
            body.rows.forEach(doc => docs.push(_objectSpread({}, doc.doc, {
              _deleted: true
            })));
            db.bulk({
              docs
            }, err => {
              if (err) {
                this.showError(err, 'Attempt to carry out bulk deletion of cookies in DB failed (in clear method).');
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
      this.execute(db => db.list((err, body) => {
        if (err) {
          this.showError(err, 'Attempt to fetch the list of all cookies from DB failed (in length method).');
          callback(err, null);
        } else {
          callback(err, body.rows.length);
        }
      }));
    }
    /**
     * Gets all the documents in the DB
     * @param {function} callback 
     */


    all(callback) {
      this.execute(db => db.list({
        include_docs: true
      }, (err, body) => {
        if (err) {
          this.showError(err, 'Attempt to fetch all cookies from DB failed (in all method).');
          callback(err, null);
        } else {
          callback(err, body.rows.map(r => r.doc));
        }
      }));
    }
    /**
     * 
     * @param {string} sid 
     * @param {object} session 
     * @param {function} callback 
     */


    touch(sid, session, callback) {
      this.execute(db => {
        db.insert(_objectSpread({}, session, {
          cookie: _objectSpread({}, session.cookie, {
            expires: session.expires && session.maxAge ? new Date(new Date().getTime() + session.maxAge) : session.expires
          })
        }), err => {
          if (err) {
            this.showError(err, 'Attempt to touch failed.');
          }

          callback(err);
        });
      });
    }

  }

  return CouchDBStore;
};

exports.default = _default;
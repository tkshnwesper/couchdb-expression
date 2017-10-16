'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

require('babel-polyfill');

var _nano = require('nano');

var _nano2 = _interopRequireDefault(_nano);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports.default = function (session) {

  session = session || {};

  var Store = session.Store || function Store() {
    _classCallCheck(this, Store);
  };

  /**
   * The class that gets returned
   */

  var CouchDBStore = function (_Store) {
    _inherits(CouchDBStore, _Store);

    /**
     * constructor for the CouchDBStore Class
     * Options get added to it
     * PouchDB instance gets initialized
     * @constructor
     * @param {object} options
     */
    function CouchDBStore(options) {
      var initializeDatabase = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
          var _this2 = this;

          var db;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return new Promise(function (resolve, reject) {
                    /**
                     * Gets a list of databases existing on the CouchDB Server
                     */
                    _this2.connection.db.list(function (err, body) {
                      if (err) {
                        console.log('Error connecting to the database and fetching DB list. Check credentials.');
                        console.log(err);
                        reject(err);
                      } else {
                        if (body.indexOf(_this2.databaseName) === -1) {
                          /**
                           * Creates a new database only if it doesn't already exist
                           */
                          _this2.connection.db.create(_this2.databaseName, function (err) {
                            if (err) {
                              console.log('Error while creating the database.');
                              console.log(err);
                              reject(err);
                            }
                            /**
                             * Resolves the DB once it has been created
                             */
                            resolve(_this2.connection.db.use(_this2.databaseName));
                          });
                        } else {
                          /**
                           * If already exists then it resolves it right away
                           */
                          resolve(_this2.connection.db.use(_this2.databaseName));
                        }
                      }
                    });
                  });

                case 2:
                  db = _context.sent;

                  this.database = db;
                  return _context.abrupt('return', db);

                case 5:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));

        return function initializeDatabase() {
          return _ref.apply(this, arguments);
        };
      }();

      _classCallCheck(this, CouchDBStore);

      options = options || {};

      var _this = _possibleConstructorReturn(this, (CouchDBStore.__proto__ || Object.getPrototypeOf(CouchDBStore)).call(this, options));

      _this.hostname = options.hostname || 'localhost';
      _this.port = options.port || 5984;
      _this.username = options.username || '';
      _this.password = options.password || '';
      _this.databaseName = options.database || 'sessions';
      // this.collectionName = options.collection  || 'sessions';

      _this.connection = (0, _nano2.default)(
      /**
       * Okay, so this works for me because I've set a username/password
       * for my instance of CouchDB. Haven't tested for case where username/
       * password is not set.
       */
      'http://' + _this.username + ':' + _this.password + '@' + _this.hostname + ':' + _this.port);

      _this.dbPromise = initializeDatabase.bind(_this)();
      return _this;
    }

    /**
     * Gets a proper instance of DB to perform actions
     * @param {function} fn
     */


    _createClass(CouchDBStore, [{
      key: 'execute',
      value: function execute(fn) {
        this.database ? fn(this.database) : this.dbPromise.then(function (db) {
          return fn(db);
        });
      }
    }, {
      key: 'get',


      /**
       * Returns a session
       * @param {string} sid 
       * @param {function} callback 
       * @return {object} the session
       */
      value: function get(sid, callback) {
        this.execute(function (db) {
          db.get(sid, function (err, doc) {
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

    }, {
      key: 'set',
      value: function set(sid, session, callback) {
        this.execute(function (db) {
          return db.get(sid, function (err, doc) {
            if (!err) {
              session = _extends({}, session, { _rev: doc._rev });
            }
            db.insert(session, sid, function (err) {
              if (err) {
                console.log('Attempt to set cookie in DB failed.');
                console.log(err);
              }
              callback(err);
            });
          });
        });
      }

      /**
       * Destroys an existing session
       * @param {string} sid 
       * @param {function} callback 
       */

    }, {
      key: 'destroy',
      value: function destroy(sid, callback) {
        var _this3 = this;

        this.get(sid, function (err, doc) {
          return _this3.execute(function (db) {
            return db.destroy(sid, doc._rev, function (err2) {
              if (err2) {
                console.log('Attempt to destroy the cookie in DB failed.');
                console.log(err2);
              }
              callback(err2);
            });
          });
        });
      }

      /**
       * Clears all the documents in the DB
       * @param {function} callback 
       */

    }, {
      key: 'clear',
      value: function clear(callback) {
        this.execute(function (db) {
          var docs = [];
          db.list({ include_docs: true }, function (err, body) {
            if (err) {
              console.log('Attempt to fetch list of all the cookies failed (in clear method).');
              console.log(err);
              callback(err);
            } else {
              body.rows.forEach(function (doc) {
                return docs.push(_extends({}, doc.doc, { _deleted: true }));
              });
              db.bulk({ docs: docs }, function (err) {
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

    }, {
      key: 'length',
      value: function length(callback) {
        this.execute(function (db) {
          return db.list(function (err, body) {
            if (err) {
              console.log('Attempt to fetch the list of all cookies from DB failed (in length method).');
              console.log(err);
              callback(err, null);
            } else {
              callback(err, body.rows.length);
            }
          });
        });
      }

      /**
       * Gets all the documents in the DB
       * @param {function} callback 
       */

    }, {
      key: 'all',
      value: function all(callback) {
        this.execute(function (db) {
          return db.list({ include_docs: true }, function (err, body) {
            if (err) {
              console.log('Attempt to fetch all cookies from DB failed (in all method).');
              console.log(err);
              callback(err, null);
            } else {
              callback(err, body.rows.map(function (r) {
                return r.doc;
              }));
            }
          });
        });
      }

      /**
       * 
       * @param {string} sid 
       * @param {object} session 
       * @param {function} callback 
       */

    }, {
      key: 'touch',
      value: function touch(sid, session, callback) {
        this.execute(function (db) {
          db.insert(_extends({}, session, {
            cookie: _extends({}, session.cookie, {
              expires: session.expires && session.maxAge ? new Date(new Date().getTime() + session.maxAge) : session.expires
            })
          }), function (err) {
            if (err) {
              console.log('Attempt to touch failed.');
              console.log(err);
            }
            callback(err);
          });
        });
      }
    }]);

    return CouchDBStore;
  }(Store);

  return CouchDBStore;
};
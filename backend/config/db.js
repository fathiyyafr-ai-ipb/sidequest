const { Pool } = require('pg');
const dns = require('dns');
const net = require('net');
require('dotenv').config();

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

const pool = isProduction
  ? (() => {
      const dbUrl = new URL(process.env.DATABASE_URL);
      return new Pool({
        user: dbUrl.username,
        password: decodeURIComponent(dbUrl.password),
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port, 10) || 5432,
        database: dbUrl.pathname.slice(1),
        family: 4, // Keep for config visibility
        ssl: {
          rejectUnauthorized: false
        },
        stream: () => {
          const socket = new net.Socket();
          const origConnect = socket.connect;
          socket.connect = function(options, cb) {
            if (options && typeof options === 'object') {
              options.family = 4;
              return origConnect.call(this, options, cb);
            }
            const port = options;
            const host = arguments[1];
            const callback = arguments[2];
            return origConnect.call(this, { port, host, family: 4 }, callback);
          };
          return socket;
        }
      });
    })()
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'sidequest2',
      password: process.env.DB_PASSWORD, // Loaded dynamically from gitignored .env file
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      family: 4, // Keep for config visibility
      stream: () => {
        const socket = new net.Socket();
        const origConnect = socket.connect;
        socket.connect = function(options, cb) {
          if (options && typeof options === 'object') {
            options.family = 4;
            return origConnect.call(this, options, cb);
          }
          const port = options;
          const host = arguments[1];
          const callback = arguments[2];
          return origConnect.call(this, { port, host, family: 4 }, callback);
        };
        return socket;
      }
    });

module.exports = pool;

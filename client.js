const net = require('net');
const tls = require('tls');
const { useTemplate, generateClientKey, generateMask } = require('./utils.js');
const { CLIENT_HANDSHAKE_TEMPLATE } = require('./templates.js');
const Handshake = require('./handshake.js');
const Encoder = require('./encoder.js');
const proceedCommandFrame = require('./command-frames.js');
const { Collector } = require('./collector.js');

const URL_RE = /(ws|wss):\/\/([^\/:]+)(:\d+)?(\/.*)?/;

function bind (client, socket, params) {
  const closeSocket = params.socketClose || client.params.closeOldSocket || 'before';
  const oldSocket = client.socket;
  if (oldSocket && closeSocket === 'before') {
    client.close();
  }

  client.socket = socket;
  client.status = 'handshake';
  const listeners = client.listeners;

  const promise = new Promise(function (resolve, reject) {
    socket.on('data', function (data) {
      client.debug.call(client, 'server', data);

      switch (client.status) {
        case 'handshake':
          const result = Handshake.validateServerHandshake(data, client.key);

          listeners.handshake && listeners.handshake.call(client, result);

          if (result.success) {
            if (oldSocket && closeSocket === 'after') {
              client.close(oldSocket);
            }
            client.status = 'active';
            listeners.connect && listeners.connect.call(client);
            resolve(client);
          } else {
            client.status = 'error';
            const error = new Error(result.errorMessage);
            listeners.error && listeners.error.call(client, error);
            reject(error);
            // client.close();
          }
          break;
        case 'active':
          client.data.push(data);
          break;
      }
    });
  });

  socket.on('close', function () {
    client.debug.call(client, 'close');
    client.status = 'closed';
    socket.removeAllListeners();
    listeners.disconnect && listeners.disconnect.call(client);
    // client.close();
  });

  socket.on('error', function (error) {
    client.debug.call(client, 'error', error);
    client.status = 'error';
    listeners.error && listeners.error.call(client, error);
    // client.close();
  });

  return promise;
}

function MadSocketClient (listeners = {}, params = {}) {
  const client = this;
  this.params = params;
  this.url = params.url || '';
  this.listeners = listeners; // error, message, connect, disconnect
  this.socket = null;
  this.status = 'init'; // init | handshake | active | error | closed
  this.key = '';
  this.debug = params.debug || function () {};
  this.data = new Collector(Encoder.COLLECTOR_STEPS, function (info) {
    const frame = {
      type: info.flags.opcode,
      fin: info.flags.fin,
      data: info.data,
    };
    if (!proceedCommandFrame(frame, client)) {
      listeners.message && listeners.message.call(client, frame.data, { fin: frame.fin, opcode: frame.opcode });
    }
  });
};

MadSocketClient.prototype.on = function (listeners) {
  for (const key in listeners) {
    this.listeners[key] = listeners[key];
  }

  return this;
}

MadSocketClient.prototype.connect = function (params) {
  params || (params = {});
  const client = this;
  const url = params.url;

  if (url) {
    this.url = url;
  }

  const urlRegMatch = this.url ? URL_RE.exec(this.url) : null;

  if (!urlRegMatch) {
    throw new Error('Cannot proceed URL');
  }

  const protocol = urlRegMatch[1];
  const isSecure = protocol === 'wss';
  const host = urlRegMatch[2];
  const port = urlRegMatch[3]
    ? parseInt(urlRegMatch[3].substring(1), 10)
    : isSecure
      ? 443
      : 80;
  const path = urlRegMatch[4] || '/';
  const options = isSecure ? { servername: host } : {};
  const key = this.key = generateClientKey();

  const socket = (isSecure ? tls : net).connect(port, host, options, function () {
    client.debug.call(client, 'connected');
    const handshake = useTemplate(CLIENT_HANDSHAKE_TEMPLATE, { host, path, key });
    client.write(Buffer.from(handshake));
  });

  return bind(this, socket, params);
}

MadSocketClient.prototype.closeSocket = function (socket) {
  socket && socket.removeAllListeners();

  if (socket.writable) {
    this.debug.call(this, 'end', true);
    socket.end();
  } else {
    this.debug.call(this, 'warning', 'end:not-writable');
  }

  if (this.status === 'active' && socket === this.socket) {
    this.status = 'closed';
  }
}

MadSocketClient.prototype.close = function () {
  this.closeSocket(this.socket);
}

MadSocketClient.prototype.send = function (message, params) {
  const mask = generateMask();
  const data = Encoder.encode(message, { opcode: params.opcode, fin: params.fin, mask: mask });
  this.write(data);
}

MadSocketClient.prototype.write = function (data) {
  if (this.socket.writable) {
    this.debug.call(this, 'client', data);
    this.socket.write(data);
  } else {
    this.debug.call(this, 'warning', 'client:not-writable');
  }
}

MadSocketClient.connect = function (url, listeners) {
  return new MadSocketClient(listeners).connect({ url: url });
}

module.exports = MadSocketClient;

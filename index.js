const crypto = require('crypto');
const net = require('net');

const Reader = require('./reader.js');
const Writer = require('./writer.js');

const HSTemplate = (
  'HTTP/1.1 101 Switching Protocols\r\n' +
  'Upgrade: websocket\r\n' +
  'Connection: Upgrade\r\n' +
  'Sec-WebSocket-Accept: ${key}\r\n\r\n'
);

const RE = {
  HTTP_METHOD_LINE: /^(?:(\w+) ([^ ]+) )?HTTP\/([^\s]+)(?: (\d{3}) (.+))?$/
};

const CONST = {
  BASE64: 'base64',
  CLOSE: 'close',
  COLON_SPACE: ': ',
  CONNECTION: 'connection',
  CRLF: '\r\n',
  DATA: 'data',
  EMPTY_LINE: '\r\n\r\n',
  MAGIC: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  REPLACE_KEY: '${key}',
  SHA1: 'sha1',
  WEBSOCKET: 'websocket',
  WSKEY: 'sec-websocket-key'
};

function getHead (plain) {
  let rows = plain.split(CONST.CRLF);
  const first = RE.HTTP_METHOD_LINE.exec(rows.shift());
  const method = first[1];
  const path = first[2];
  const version = first[3];
  const status = first[4];
  const message = first[5];

  let splitted;
  let headers = {};
  for (let index in rows) {
    splitted = rows[index].split(CONST.COLON_SPACE);
    headers[splitted[0].toLowerCase()] = splitted[1];
  }

  return {method, path, version, status, message, headers};
}

function getHttpPayload (data) {
  data = data.toString();
  const separatorPosition = data.indexOf(CONST.EMPTY_LINE);
  let message = getHead(data.substring(0, separatorPosition));
  message.body = data.substring(separatorPosition + 2);

  return message;
}

function decodeData (data) {
  const reader = new Reader(data, {bigEndian: true});
  const flags = reader.readInt();
  const lenFlags = reader.readInt();
  const fin = 0x80 & flags;
  const opcode = 0x7 & flags;
  let mask = 0x80 & lenFlags;
  let length = 0x7f & lenFlags;
  switch (length) {
    case 126:
      length = reader.readInt(2, true);
      break;
    case 127:
      length = reader.readInt(8, true);
      break;
  }
  mask && (mask = reader.read(4));
  const encodedData = reader.read(length);
  let decodedData;
  if (mask) {
    decodedData = Buffer.allocUnsafe(length);
    for (let i = 0 ; i < encodedData.length ; i++) {
      decodedData[i] = encodedData[i] ^ mask[i % 4];
    }
  } else {
    decodedData = encodedData;
  }
  return decodedData;
}
function encodeData (data) {
  if (!(data instanceof Buffer)) {
    data = Buffer.from(data);
  }
  const payloadLength = data.length;
  let writer = new Writer({bigEndian: true});
  let flags = 0x8100;

  if (payloadLength < 126) {
    flags = flags | payloadLength;
    writer.writeInt(flags, 2, true);
  } else if (payloadLength < 0x10000) {
    flags = flags | 126;
    writer.writeInt(flags, 2, true);
    writer.writeInt(payloadLength, 2, true);
  } else {
    flags = flags | 127;
    writer.writeInt(flags, 2, true);
    writer.writeInt(payloadLength, 4, true);
  }
  let encodedData;

  writer.push(data);
  return writer.make();
}

function Server () {}

Server.prototype.create = function (callback, port = 80, host = '0.0.0.0') {
  const server = net.createServer();
  server.listen(port, host, function () {
    console.log('MadSocket server started on ' + host + ':' + port);
  });
  function handshake (chunk) {
    const payload = getHttpPayload(chunk);
    callback(new Connection(payload, this));
    this.off(CONST.DATA, handshake);
  }
  server.on(CONST.CONNECTION, function (socket) {
    socket.on(CONST.DATA, handshake);
  });
}

function Connection (message, socket) {
  this.socket = socket;
  this.listeners = {};
  const key = message.headers[CONST.WSKEY];
  _this = this;
  if (key && message.headers.upgrade === CONST.WEBSOCKET) {
    socket.on(CONST.DATA, function (data) {
      _this.listeners.data && _this.listeners.data.action.call(_this.listeners.data.context, decodeData(data));
    });
    socket.on(CONST.CLOSE, function () {
      _this.listeners.close && _this.listeners.close.action.call(_this.listeners.close.context);
    });
    let hash = crypto.createHash(CONST.SHA1);
    hash.update(key + CONST.MAGIC);
    const accept = hash.digest(CONST.BASE64);
    const response = HSTemplate.replace(CONST.REPLACE_KEY, accept);
    socket.write(response);
  }
}
Connection.prototype.on = function (listeners, context) {
  this.listenerContext = context || this;
  for (let key in listeners) if (listeners[key] instanceof Function) {
    this.listeners[key] = {
      action: listeners[key],
      context: context || this
    };
  }
};
Connection.prototype.send = function (data) {
  const encodedData = encodeData(data);
  this.socket.write(encodedData);
}
Connection.prototype.close = function () {
  this.socket.end();
  this.socket = null;
}
Server.prototype.Connection = function (message, socket) {
  return new Connection(message, socket);
}

module.exports = Server;

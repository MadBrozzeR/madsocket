const crypto = require('crypto');

const HTTP_METHOD_LINE_RE = /^(?:(\w+) ([^ ]+) )?HTTP\/([^\s]+)(?: (\d{3}) (.+))?$/;
const COLON_SPACE = ': ';
const EMPTY_LINE = '\r\n\r\n';
const WSKEY = 'sec-websocket-key';
const WEBSOCKET = 'websocket';
const BASE64 = 'base64';
const SHA1 = 'sha1';
const MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const REPLACE_KEY = '${key}';
const CRLF = '\r\n';

const HSTemplate = (
  'HTTP/1.1 101 Switching Protocols\r\n' +
  'Upgrade: websocket\r\n' +
  'Connection: Upgrade\r\n' +
  'Sec-WebSocket-Accept: ${key}\r\n\r\n'
);

const BadRequestTemplate = 'HTTP/1.1 400 Bad Request\r\n\r\n';

function getHead (plain) {
  let rows = plain.split(CONST.CRLF);
  const first = HTTP_METHOD_LINE_RE.exec(rows.shift());
  const method = first[1];
  const path = first[2];
  const version = first[3];
  const status = first[4];
  const message = first[5];

  let splitted;
  let headers = {};
  for (let index in rows) {
    splitted = rows[index].split(COLON_SPACE);
    headers[splitted[0].toLowerCase()] = splitted[1];
  }

  return {method, path, version, status, message, headers};
}

function getHttpPayload (data) {
  data = data.toString();
  let message;

  try {
    const separatorPosition = data.indexOf(EMPTY_LINE);
    message = getHead(data.substring(0, separatorPosition));
    message.body = data.substring(separatorPosition + 2);
  } catch (error) {
    message = null;
  }

  return message;
}

function getAccept (key) {
  let hash = crypto.createHash(SHA1);
  hash.update(key + MAGIC);
  return hash.digest(BASE64);
}

function getResponse (payload) {
  let response;

  if (payload && payload.headers[WSKEY] && payload.headers.upgrade === WEBSOCKET) {
    response = HSTemplate.replace(REPLACE_KEY, getAccept(payload.headers[WSKEY]));
  } else {
    response = '';
  }

  return response;
}

function getBadResponse () {
  return BadRequestTemplate;
}

module.exports = {
  getResponse: getResponse,
  getHttpPayload: getHttpPayload,
  getBadResponse: getBadResponse
};

const crypto = require('crypto');

const HTTP_METHOD_LINE_RE = /^(?:(\w+) ([^ ]+) )?HTTP\/([^\s]+)(?: (\d{3}) (.+))?$/;
const COLON = ':';
const EMPTY_LINE = '\r\n\r\n';
const WSKEY = 'sec-websocket-key';
const WEBSOCKET = 'websocket';
const BASE64 = 'base64';
const SHA1 = 'sha1';
const MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const REPLACE_KEY = '${key}';
const CRLF = '\r\n';

// TODO move to templates
const HSTemplate = (
  'HTTP/1.1 101 Switching Protocols\r\n' +
  'Upgrade: websocket\r\n' +
  'Connection: Upgrade\r\n' +
  'Sec-WebSocket-Accept: ${key}\r\n\r\n'
);

// TODO move to templates
const BadRequestTemplate = 'HTTP/1.1 400 Bad Request\r\n\r\n';

function getHead (plain) {
  let rows = plain.split(CRLF);
  const first = HTTP_METHOD_LINE_RE.exec(rows.shift());
  const method = first[1];
  const path = first[2];
  const version = first[3];
  const status = first[4];
  const message = first[5];

  let splitted;
  let headers = {};
  for (let index in rows) {
    splitted = rows[index].split(COLON);
    headers[splitted[0].toLowerCase()] = splitted[1].trim();
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

function validateServerHandshake (response, key) {
  const httpPayload = getHttpPayload(response);
  const acceptHeader = httpPayload.headers['sec-websocket-accept'];
  const result = {
    success: true,
    errorMessage: '',
  };

  if (httpPayload.status !== '101') {
    result.success = false;
    result.errorMessage = 'Server returned status ' + httpPayload.status;
  } else if (!acceptHeader || acceptHeader !== getAccept(key)) {
    result.success = false;
    result.errorMessage = 'Accept header missmatch';
  }

  return result;
}

module.exports = {
  getResponse: getResponse,
  getHttpPayload: getHttpPayload,
  getBadResponse: getBadResponse,
  validateServerHandshake: validateServerHandshake,
};

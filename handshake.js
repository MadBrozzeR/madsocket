const crypto = require('crypto');
const { BAD_REQUEST_TEMPLATE, SERVER_HANDSHAKE_TEMPLATE } = require('./templates.js');
const { useTemplate } = require('./utils.js');

const HTTP_METHOD_LINE_RE = /^(?:(\w+) ([^ ]+) )?HTTP\/([^\s]+)(?: (\d{3}) (.+))?$/;
const COLON = ':';
const EMPTY_LINE = '\r\n\r\n';
const WSKEY = 'sec-websocket-key';
const WEBSOCKET = 'websocket';
const BASE64 = 'base64';
const SHA1 = 'sha1';
const MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const CRLF = '\r\n';

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
    message.body = separatorPosition > -1 ? data.substring(separatorPosition + 2) : '';
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
    response = useTemplate(SERVER_HANDSHAKE_TEMPLATE, { key: getAccept(payload.headers[WSKEY]) });
  } else {
    response = '';
  }

  return response;
}

function getBadResponse () {
  return BAD_REQUEST_TEMPLATE;
}

function validateServerHandshake (response, key) {
  const result = {
    success: true,
    headers: null,
    status: 0,
    errorMessage: '',
  };

  const httpPayload = getHttpPayload(response);

  if (!httpPayload) {
    result.success = false;
    result.errorMessage = 'Unparsable handshake response';
  }

  result.status = parseInt(httpPayload.status, 10);
  result.headers = httpPayload.headers;
  const acceptHeader = httpPayload.headers['sec-websocket-accept'];

  if (result.status !== 101) {
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

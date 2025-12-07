const Encoder = require('./encoder.js');
const utils = require('./utils.js');

const TYPE = Encoder.TYPE;

function proceedCommandFrame (frame, client) {
  if (frame.type === TYPE.CLOSE) {
    const status = frame.data.slice(0, 2);
    client.close(status);

    return true;
  }

  if (frame.type === TYPE.PING) {
    const data = Encoder.encode(frame.data, { opcode: TYPE.PONG });
    utils.socketWrite(client.socket, data);

    return true;
  }

  return false;
}

module.exports = proceedCommandFrame;

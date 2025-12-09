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
    client.send(frame.data, { opcode: TYPE.PONG });

    return true;
  }

  return false;
}

module.exports = proceedCommandFrame;

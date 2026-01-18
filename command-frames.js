const { OPCODE } = require('./constants.js');

function proceedCommandFrame (frame, client) {
  if (frame.type === OPCODE.CLOSE) {
    const status = frame.data.slice(0, 2);
    client.close(status);

    return true;
  }

  if (frame.type === OPCODE.PING) {
    client.send(frame.data, { opcode: OPCODE.PONG });

    return true;
  }

  return false;
}

module.exports = proceedCommandFrame;

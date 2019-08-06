const Reader = require('mbr-buffer').Reader;
const Writer = require('mbr-buffer').Writer;

const INT_PARAMS = { littleEndian: false, unsigned: true };
const TYPE = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa
};

function decode (data) {
  const reader = new Reader(data);
  const flags = reader.readUIntBE();
  const lenFlags = reader.readUIntBE();
  const fin = 0x80 & flags;
  const opcode = 0xf & flags;
  let mask = 0x80 & lenFlags;
  let length = 0x7f & lenFlags;
  switch (length) {
    case 126:
      length = reader.readUIntBE(2);
      break;
    case 127:
      length = reader.readUIntBE(8);
      break;
  }
  mask && (mask = reader.slice(4));
  const encodedData = reader.slice(length);
  let decodedData;
  if (mask) {
    decodedData = Buffer.allocUnsafe(length);
    for (let index = 0 ; index < encodedData.length ; index++) {
      decodedData[index] = encodedData[index] ^ mask[index % 4];
    }
  } else {
    decodedData = encodedData;
  }
  return {
    type: opcode,
    data: decodedData
  };
}

function encode (data, opcode = TYPE.TEXT) {
  if (!(data instanceof Buffer)) {
    data = Buffer.from(data);
  }
  const payloadLength = data.length;
  let flags = 0x80 | opcode;
  const result = [
    Writer.Integer(flags, 1, INT_PARAMS).is('Flags')
  ];

  if (payloadLength < 126) {
    result.push(
      Writer.Integer(payloadLength, 1, INT_PARAMS).is('Payload length')
    );
  } else if (payloadLength < 0x10000) {
    result.push(
      Writer.Integer(126, 1, INT_PARAMS).is('Extended payload length indicator'),
      Writer.Integer(payloadLength, 2, INT_PARAMS).is('Payload length')
    );
  } else {
    result.push(
      Writer.Integer(127, 1, INT_PARAMS).is('Extended payload length indicator'),
      Writer.Integer(payloadLength, 4, INT_PARAMS).is('Payload length')
    );
  }

  result.push(Writer.Buffer(data).is('Payload'));
  return Writer.make(result);
}

module.exports = {
  encode: encode,
  decode: decode,
  TYPE: TYPE
};

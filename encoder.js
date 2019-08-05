const Reader = require('mbr-buffer').Reader;
const Writer = require('mbr-buffer').Writer;

const INT_PARAMS = { littleEndian: false, unsigned: true };

function decode (data) {
  const reader = new Reader(data);
  const flags = reader.readUIntBE();
  const lenFlags = reader.readUIntBE();
  const fin = 0x80 & flags;
  const opcode = 0x7 & flags;
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
  return decodedData;
}

function encode (data) {
  if (!(data instanceof Buffer)) {
    data = Buffer.from(data);
  }
  const payloadLength = data.length;
  let flags = 0x8100;
  const result = [];

  if (payloadLength < 126) {
    flags = flags | payloadLength;
    result.push(Writer.Integer(flags, 2, INT_PARAMS));
  } else if (payloadLength < 0x10000) {
    flags = flags | 126;
    result.push(
      Writer.Integer(flags, 2, INT_PARAMS),
      Writer.Integer(payloadLength, 2, INT_PARAMS)
    );
  } else {
    flags = flags | 127;
    result.push(
      Writer.Integer(flags, 2, INT_PARAMS),
      Writer.Integer(payloadLength, 4, INT_PARAMS)
    );
  }

  result.push(Writer.Buffer(data));
  return Writer.make(result);
}

module.exports = {
  encode: encode,
  decode: decode
};

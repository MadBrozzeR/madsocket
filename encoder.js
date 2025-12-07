const Reader = require('mbr-buffer').Reader;
const Writer = require('mbr-buffer').Writer;
const { applyMask } = require('./utils.js');
const { OPCODE } = require('./constants.js');

const TYPE = OPCODE;

const INT_PARAMS = { littleEndian: false, unsigned: true };
const BIT = {
  NO: 0,
  MASK: 0x80,
  OPCODE: 0xF,
  FIN: 0x80,
  LENGTH: 0x7F,
};

function decode (data) {
  const reader = new Reader(data);
  const flags = reader.readUIntBE();
  const lenFlags = reader.readUIntBE();
  const fin = BIT.FIN & flags;
  const opcode = BIT.OPCODE & flags;
  let mask = BIT.MASK & lenFlags;
  let length = BIT.LENGTH & lenFlags;
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
  const decodedData = mask ? applyMask(encodedData, mask) : encodedData;
  return {
    fin: fin ? true : false,
    type: opcode,
    data: decodedData
  };
}

function encode (data, params = {}) {
  const opcode = params.opcode || TYPE.TEXT;
  const mask = params.mask || null;
  const finBit = params.fin === false ? BIT.NO : BIT.FIN;

  if (!(data instanceof Buffer)) {
    data = Buffer.from(data);
  }
  const payloadLength = data.length;
  let flags = finBit | opcode;
  const maskBit = mask ? BIT.MASK : 0;
  const dataToSend = mask ? applyMask(data, mask) : data;

  const result = [
    Writer.Integer(flags, 1, INT_PARAMS).is('Flags')
  ];

  if (payloadLength < 126) {
    result.push(
      Writer.Integer(maskBit | payloadLength, 1, INT_PARAMS).is('Payload length with mask bit')
    );
  } else if (payloadLength < 0x10000) {
    result.push(
      Writer.Integer(maskBit | 126, 1, INT_PARAMS).is('Extended payload length indicator with mask bit'),
      Writer.Integer(payloadLength, 2, INT_PARAMS).is('Payload length')
    );
  } else {
    result.push(
      Writer.Integer(maskBit | 127, 1, INT_PARAMS).is('Extended payload length indicator with mask bit'),
      Writer.Integer(payloadLength, 4, INT_PARAMS).is('Payload length')
    );
  }

  if (mask) {
    result.push(Writer.Buffer(mask).is('Mask Key'));
  }

  result.push(Writer.Buffer(dataToSend).is('Payload'));
  return Writer.make(result);
}

module.exports = {
  encode: encode,
  decode: decode,
  TYPE: TYPE
};

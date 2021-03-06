'use strict'; // eslint-disable-line strict

var _ = require('lodash');
var BigNumber = require('bignumber.js');
var common = require('../common');
var txFlags = common.txFlags;


function formatPrepareResponse(txJSON) {
  var instructions = {
    fee: common.dropsToXrp(txJSON.Fee),
    sequence: txJSON.Sequence,
    maxLedgerVersion: txJSON.LastLedgerSequence === undefined ? null : txJSON.LastLedgerSequence
  };
  return {
    txJSON: JSON.stringify(txJSON),
    instructions: _.omit(instructions, _.isUndefined)
  };
}

function setCanonicalFlag(txJSON) {
  txJSON.Flags |= txFlags.Universal.FullyCanonicalSig;

  // JavaScript converts operands to 32-bit signed ints before doing bitwise
  // operations. We need to convert it back to an unsigned int.
  txJSON.Flags = txJSON.Flags >>> 0;
}

function scaleValue(value, multiplier) {
  var extra = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  return new BigNumber(value).times(multiplier).plus(extra).toString();
}

function prepareTransaction(txJSON, api, instructions) {
  common.validate.instructions(instructions);

  var account = txJSON.Account;
  setCanonicalFlag(txJSON);

  function prepareMaxLedgerVersion() {
    if (instructions.maxLedgerVersion !== undefined) {
      if (instructions.maxLedgerVersion !== null) {
        txJSON.LastLedgerSequence = instructions.maxLedgerVersion;
      }
      return Promise.resolve(txJSON);
    }
    var offset = instructions.maxLedgerVersionOffset !== undefined ? instructions.maxLedgerVersionOffset : 3;
    return api.connection.getLedgerVersion().then(function (ledgerVersion) {
      txJSON.LastLedgerSequence = ledgerVersion + offset;
      return txJSON;
    });
  }

  function prepareFee() {
    var multiplier = instructions.signersCount === undefined ? 1 : instructions.signersCount + 1;
    if (instructions.fee !== undefined) {
      txJSON.Fee = scaleValue(common.xrpToDrops(instructions.fee), multiplier);
      return Promise.resolve(txJSON);
    }
    var cushion = api._feeCushion;
    return common.serverInfo.getFee(api.connection, cushion).then(function (fee) {
      return api.connection.getFeeRef().then(function (feeRef) {
        var extraFee = txJSON.TransactionType !== 'EscrowFinish' || txJSON.Fulfillment === undefined ? 0 : cushion * feeRef * (32 + Math.floor(new Buffer(txJSON.Fulfillment, 'hex').length / 16));
        var feeDrops = common.xrpToDrops(fee);
        if (instructions.maxFee !== undefined) {
          var maxFeeDrops = common.xrpToDrops(instructions.maxFee);
          var normalFee = scaleValue(feeDrops, multiplier, extraFee);
          txJSON.Fee = BigNumber.min(normalFee, maxFeeDrops).toString();
        } else {
          txJSON.Fee = scaleValue(feeDrops, multiplier, extraFee);
        }
        return txJSON;
      });
    });
  }

  function prepareSequence() {
    if (instructions.sequence !== undefined) {
      txJSON.Sequence = instructions.sequence;
      return Promise.resolve(txJSON);
    }
    var request = {
      command: 'account_info',
      account: account
    };
    return api.connection.request(request).then(function (response) {
      txJSON.Sequence = response.account_data.Sequence;
      return txJSON;
    });
  }

  return Promise.all([prepareMaxLedgerVersion(), prepareFee(), prepareSequence()]).then(function () {
    return formatPrepareResponse(txJSON);
  });
}

function convertStringToHex(string) {
  return string ? new Buffer(string, 'utf8').toString('hex').toUpperCase() : undefined;
}

function convertMemo(memo) {
  return {
    Memo: common.removeUndefined({
      MemoData: convertStringToHex(memo.data),
      MemoType: convertStringToHex(memo.type),
      MemoFormat: convertStringToHex(memo.format)
    })
  };
}

module.exports = {
  convertStringToHex: convertStringToHex,
  convertMemo: convertMemo,
  prepareTransaction: prepareTransaction,
  common: common
};
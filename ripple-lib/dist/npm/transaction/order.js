'use strict'; // eslint-disable-line strict

var _ = require('lodash');
var utils = require('./utils');
var offerFlags = utils.common.txFlags.OfferCreate;
var _utils$common = utils.common,
    validate = _utils$common.validate,
    iso8601ToRippleTime = _utils$common.iso8601ToRippleTime;


function createOrderTransaction(account, order) {
  var takerPays = utils.common.toRippledAmount(order.direction === 'buy' ? order.quantity : order.totalPrice);
  var takerGets = utils.common.toRippledAmount(order.direction === 'buy' ? order.totalPrice : order.quantity);

  var txJSON = {
    TransactionType: 'OfferCreate',
    Account: account,
    TakerGets: takerGets,
    TakerPays: takerPays,
    Flags: 0
  };
  if (order.direction === 'sell') {
    txJSON.Flags |= offerFlags.Sell;
  }
  if (order.passive === true) {
    txJSON.Flags |= offerFlags.Passive;
  }
  if (order.immediateOrCancel === true) {
    txJSON.Flags |= offerFlags.ImmediateOrCancel;
  }
  if (order.fillOrKill === true) {
    txJSON.Flags |= offerFlags.FillOrKill;
  }
  if (order.expirationTime !== undefined) {
    txJSON.Expiration = iso8601ToRippleTime(order.expirationTime);
  }
  if (order.orderToReplace !== undefined) {
    txJSON.OfferSequence = order.orderToReplace;
  }
  if (order.memos !== undefined) {
    txJSON.Memos = _.map(order.memos, utils.convertMemo);
  }
  return txJSON;
}

function prepareOrder(address, order) {
  var instructions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  validate.prepareOrder({ address: address, order: order, instructions: instructions });
  var txJSON = createOrderTransaction(address, order);
  return utils.prepareTransaction(txJSON, this, instructions);
}

module.exports = prepareOrder;
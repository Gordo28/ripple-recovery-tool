'use strict'; // eslint-disable-line strict

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _ = require('lodash');
var BigNumber = require('bignumber.js');

var _require = require('ripple-keypairs'),
    deriveKeypair = _require.deriveKeypair;

function isValidSecret(secret) {
  try {
    deriveKeypair(secret);
    return true;
  } catch (err) {
    return false;
  }
}

function dropsToXrp(drops) {
  return new BigNumber(drops).dividedBy(1000000.0).toString();
}

function xrpToDrops(xrp) {
  return new BigNumber(xrp).times(1000000.0).floor().toString();
}

function toRippledAmount(amount) {
  if (amount.currency === 'XRP') {
    return xrpToDrops(amount.value);
  }
  return {
    currency: amount.currency,
    issuer: amount.counterparty ? amount.counterparty : amount.issuer ? amount.issuer : undefined,
    value: amount.value
  };
}

function convertKeysFromSnakeCaseToCamelCase(obj) {
  if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
    var newKey = void 0;
    return _.reduce(obj, function (result, value, key) {
      newKey = key;
      // taking this out of function leads to error in PhantomJS
      var FINDSNAKE = /([a-zA-Z]_[a-zA-Z])/g;
      if (FINDSNAKE.test(key)) {
        newKey = key.replace(FINDSNAKE, function (r) {
          return r[0] + r[2].toUpperCase();
        });
      }
      result[newKey] = convertKeysFromSnakeCaseToCamelCase(value);
      return result;
    }, {});
  }
  return obj;
}

function removeUndefined(obj) {
  return _.omit(obj, _.isUndefined);
}

/**
 * @param {Number} rpepoch (seconds since 1/1/2000 GMT)
 * @return {Number} ms since unix epoch
 *
 */
function rippleToUnixTimestamp(rpepoch) {
  return (rpepoch + 0x386D4380) * 1000;
}

/**
 * @param {Number|Date} timestamp (ms since unix epoch)
 * @return {Number} seconds since ripple epoch ( 1/1/2000 GMT)
 */
function unixToRippleTimestamp(timestamp) {
  return Math.round(timestamp / 1000) - 0x386D4380;
}

function rippleTimeToISO8601(rippleTime) {
  return new Date(rippleToUnixTimestamp(rippleTime)).toISOString();
}

function iso8601ToRippleTime(iso8601) {
  return unixToRippleTimestamp(Date.parse(iso8601));
}

module.exports = {
  dropsToXrp: dropsToXrp,
  xrpToDrops: xrpToDrops,
  toRippledAmount: toRippledAmount,
  convertKeysFromSnakeCaseToCamelCase: convertKeysFromSnakeCaseToCamelCase,
  removeUndefined: removeUndefined,
  rippleTimeToISO8601: rippleTimeToISO8601,
  iso8601ToRippleTime: iso8601ToRippleTime,
  isValidSecret: isValidSecret
};
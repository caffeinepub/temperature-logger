/* eslint-disable */
// @ts-nocheck
import { IDL } from '@icp-sdk/core/candid';

export const Temperature = IDL.Record({
  'value' : IDL.Int,
  'timestamp' : IDL.Int,
});

export const idlService = IDL.Service({
  'addTemperature' : IDL.Func([IDL.Int], [], []),
  'getTemperatures' : IDL.Func([], [IDL.Vec(Temperature)], ['query']),
  'deleteTemperature' : IDL.Func([IDL.Nat], [], []),
  'deleteTemperatures' : IDL.Func([IDL.Vec(IDL.Nat)], [], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const Temperature = IDL.Record({ 'value' : IDL.Int, 'timestamp' : IDL.Int });
  return IDL.Service({
    'addTemperature' : IDL.Func([IDL.Int], [], []),
    'getTemperatures' : IDL.Func([], [IDL.Vec(Temperature)], ['query']),
    'deleteTemperature' : IDL.Func([IDL.Nat], [], []),
    'deleteTemperatures' : IDL.Func([IDL.Vec(IDL.Nat)], [], []),
  });
};

export const init = ({ IDL }) => { return []; };

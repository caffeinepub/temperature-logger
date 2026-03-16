/* eslint-disable */
// @ts-nocheck
import { IDL } from '@icp-sdk/core/candid';

export const Device = IDL.Record({
  'id' : IDL.Nat,
  'name' : IDL.Text,
});

export const Temperature = IDL.Record({
  'value' : IDL.Int,
  'timestamp' : IDL.Int,
});

export const idlService = IDL.Service({
  'addDevice' : IDL.Func([IDL.Text], [IDL.Nat], []),
  'getDevices' : IDL.Func([], [IDL.Vec(Device)], ['query']),
  'renameDevice' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
  'deleteDevice' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'addTemperature' : IDL.Func([IDL.Nat, IDL.Int], [IDL.Bool], []),
  'getTemperatures' : IDL.Func([IDL.Nat], [IDL.Vec(Temperature)], ['query']),
  'deleteTemperature' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Bool], []),
  'deleteTemperatures' : IDL.Func([IDL.Nat, IDL.Vec(IDL.Nat)], [IDL.Bool], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const Device = IDL.Record({ 'id' : IDL.Nat, 'name' : IDL.Text });
  const Temperature = IDL.Record({ 'value' : IDL.Int, 'timestamp' : IDL.Int });
  return IDL.Service({
    'addDevice' : IDL.Func([IDL.Text], [IDL.Nat], []),
    'getDevices' : IDL.Func([], [IDL.Vec(Device)], ['query']),
    'renameDevice' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'deleteDevice' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'addTemperature' : IDL.Func([IDL.Nat, IDL.Int], [IDL.Bool], []),
    'getTemperatures' : IDL.Func([IDL.Nat], [IDL.Vec(Temperature)], ['query']),
    'deleteTemperature' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Bool], []),
    'deleteTemperatures' : IDL.Func([IDL.Nat, IDL.Vec(IDL.Nat)], [IDL.Bool], []),
  });
};

export const init = ({ IDL }) => { return []; };

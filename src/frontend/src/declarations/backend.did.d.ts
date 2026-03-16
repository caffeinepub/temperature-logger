/* eslint-disable */
// @ts-nocheck
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface Device { 'id' : bigint, 'name' : string }
export interface Temperature { 'value' : bigint, 'timestamp' : bigint }
export interface _SERVICE {
  'addDevice' : ActorMethod<[string], bigint>,
  'getDevices' : ActorMethod<[], Array<Device>>,
  'renameDevice' : ActorMethod<[bigint, string], boolean>,
  'deleteDevice' : ActorMethod<[bigint], boolean>,
  'addTemperature' : ActorMethod<[bigint, bigint], boolean>,
  'getTemperatures' : ActorMethod<[bigint], Array<Temperature>>,
  'deleteTemperature' : ActorMethod<[bigint, bigint], boolean>,
  'deleteTemperatures' : ActorMethod<[bigint, Array<bigint>], boolean>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

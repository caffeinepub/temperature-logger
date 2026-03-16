/* eslint-disable */
// @ts-nocheck
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface Temperature { 'value' : bigint, 'timestamp' : bigint }
export interface _SERVICE {
  'addTemperature' : ActorMethod<[bigint], undefined>,
  'getTemperatures' : ActorMethod<[], Array<Temperature>>,
  'deleteTemperature' : ActorMethod<[bigint], undefined>,
  'deleteTemperatures' : ActorMethod<[Array<bigint>], undefined>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

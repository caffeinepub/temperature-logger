import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Device {
    id: bigint;
    name: string;
}
export interface Temperature {
    value: bigint;
    timestamp: bigint;
}
export interface backendInterface {
    addDevice(name: string): Promise<bigint>;
    getDevices(): Promise<Array<Device>>;
    renameDevice(id: bigint, name: string): Promise<boolean>;
    deleteDevice(id: bigint): Promise<boolean>;
    addTemperature(deviceId: bigint, value: bigint): Promise<boolean>;
    getTemperatures(deviceId: bigint): Promise<Array<Temperature>>;
    deleteTemperature(deviceId: bigint, index: bigint): Promise<boolean>;
    deleteTemperatures(deviceId: bigint, indices: Array<bigint>): Promise<boolean>;
}

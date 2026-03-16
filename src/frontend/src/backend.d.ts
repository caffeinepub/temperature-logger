import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Temperature {
    value: bigint;
    timestamp: bigint;
}
export interface backendInterface {
    addTemperature(value: bigint): Promise<void>;
    getTemperatures(): Promise<Array<Temperature>>;
}

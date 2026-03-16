import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Device, Temperature } from "../backend";
import { useActor } from "./useActor";

export function useGetDevices() {
  const { actor, isFetching } = useActor();
  return useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDevices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddDevice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Backend not available");
      return actor.addDevice(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useRenameDevice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: bigint; name: string }) => {
      if (!actor) throw new Error("Backend not available");
      return actor.renameDevice(id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteDevice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend not available");
      return actor.deleteDevice(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useGetTemperatures(deviceId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Temperature[]>({
    queryKey: ["temperatures", deviceId?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || deviceId === null) return [];
      return actor.getTemperatures(deviceId);
    },
    enabled: !!actor && !isFetching && deviceId !== null,
  });
}

export function useAddTemperature() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviceId,
      value,
    }: { deviceId: bigint; value: number }) => {
      if (!actor) throw new Error("Backend not available");
      await actor.addTemperature(deviceId, BigInt(value));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["temperatures", variables.deviceId.toString()],
      });
    },
  });
}

export function useDeleteTemperature() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviceId,
      index,
    }: { deviceId: bigint; index: number }) => {
      if (!actor) throw new Error("Backend not available");
      await actor.deleteTemperature(deviceId, BigInt(index));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["temperatures", variables.deviceId.toString()],
      });
    },
  });
}

export function useDeleteTemperatures() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviceId,
      indices,
    }: { deviceId: bigint; indices: number[] }) => {
      if (!actor) throw new Error("Backend not available");
      await actor.deleteTemperatures(deviceId, indices.map(BigInt));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["temperatures", variables.deviceId.toString()],
      });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Temperature } from "../backend";
import { useActor } from "./useActor";

export function useGetTemperatures() {
  const { actor, isFetching } = useActor();
  return useQuery<Temperature[]>({
    queryKey: ["temperatures"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTemperatures();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTemperature() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: number) => {
      if (!actor) throw new Error("Backend not available");
      await actor.addTemperature(BigInt(value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temperatures"] });
    },
  });
}

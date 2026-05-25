import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listAllContracts,
  listContracts,
  createContract,
  updateContract,
  updateContractStatus,
  deleteContract,
  type CreateContractPayload,
  type UpdateContractPayload,
  type ContractStatus,
} from "@/lib/contract-api"

export function useAllContracts() {
  return useQuery({
    queryKey: ["contracts", "all"],
    queryFn: listAllContracts,
  })
}

const key = (userId: number) => ["contracts", userId]

export function useContracts(userId: number) {
  return useQuery({
    queryKey: key(userId),
    queryFn: () => listContracts(userId),
    enabled: !!userId,
  })
}

export function useCreateContract(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateContractPayload) => createContract(userId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  })
}

export function useUpdateContract(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contractId, payload }: { contractId: number; payload: UpdateContractPayload }) =>
      updateContract(userId, contractId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  })
}

export function useUpdateContractStatus(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contractId, contractStatus }: { contractId: number; contractStatus: ContractStatus }) =>
      updateContractStatus(userId, contractId, contractStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  })
}

export function useDeleteContract(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contractId: number) => deleteContract(userId, contractId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(userId) }),
  })
}

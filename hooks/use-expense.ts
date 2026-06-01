"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  expenseApi,
  type ExpenseStatus,
  type ExpenseCategory,
  type CreateExpensePayload,
} from "@/lib/expense-api"

const KEY = ["expense-reports"] as const

export function useMyExpenses(
  params: { status?: ExpenseStatus; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => expenseApi.listMine(params),
  })
}

export function useAllExpenses(
  params: {
    status?: ExpenseStatus
    search?: string
    category?: ExpenseCategory
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => expenseApi.listAll(params),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      files,
    }: {
      payload: CreateExpensePayload
      files?: File[]
    }) => expenseApi.createMine(payload, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expenseApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => expenseApi.approve(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => expenseApi.reject(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReimburseExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => expenseApi.markReimbursed(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

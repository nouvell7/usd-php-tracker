import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAlert, updateAlert, deleteAlert, getUserAlerts } from '../services/alertService'

export function useRateAlerts() {
  const queryClient = useQueryClient()

  const alerts = useQuery({
    queryKey: ['rateAlerts'],
    queryFn: getUserAlerts
  })

  const addAlert = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rateAlerts'] })
    }
  })

  const toggleAlert = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateAlert(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rateAlerts'] })
    }
  })

  const removeAlert = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rateAlerts'] })
    }
  })

  return {
    alerts,
    addAlert,
    toggleAlert,
    removeAlert
  }
} 
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

/**
 * Generic hook for CRUD operations.
 * @param {object} apiModule - API module with list, create, update, destroy
 * @param {object} options - { loadOnMount: true, resourceName: '' }
 */
export default function useCrud(apiModule, options = {}) {
  const { loadOnMount = true, resourceName = 'Registro' } = options

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiModule.list()
      setItems(res.data.data || [])
    } catch {
      toast.error(`Error al cargar ${resourceName.toLowerCase()}s`)
    } finally {
      setLoading(false)
    }
  }, [apiModule, resourceName])

  useEffect(() => {
    if (loadOnMount) fetchItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const createItem = async (data) => {
    setSaving(true)
    setErrors({})
    try {
      const res = await apiModule.create(data)
      toast.success(res.data.message || `${resourceName} creado correctamente`)
      await fetchItems()
      return true
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {})
        const msg422 = err.response.data?.error?.message
        if (msg422) toast.error(msg422)
      } else {
        toast.error(err.response?.data?.error?.message || err.response?.data?.message || `Error al crear ${resourceName.toLowerCase()}`)
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateItem = async (id, data) => {
    setSaving(true)
    setErrors({})
    try {
      const res = await apiModule.update(id, data)
      toast.success(res.data.message || `${resourceName} actualizado correctamente`)
      await fetchItems()
      return true
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {})
        const msg422 = err.response.data?.error?.message
        if (msg422) toast.error(msg422)
      } else {
        toast.error(err.response?.data?.error?.message || err.response?.data?.message || `Error al actualizar ${resourceName.toLowerCase()}`)
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id) => {
    setSaving(true)
    try {
      const res = await apiModule.destroy(id)
      toast.success(res.data.message || `${resourceName} eliminado correctamente`)
      await fetchItems()
      return true
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || `Error al eliminar ${resourceName.toLowerCase()}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    items,
    loading,
    saving,
    errors,
    setErrors,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  }
}

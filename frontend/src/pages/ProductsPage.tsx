import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Package, Search, Filter, X } from 'lucide-react'
import { productsApi } from '../api/products'
import { organizationsApi } from '../api/organizations'
import { useAuthStore } from '../store/authStore'
import type { Product } from '../types'

const categories = ['ALL', 'MEDICINE', 'SURGICAL', 'DIAGNOSTIC', 'EQUIPMENT', 'CONSUMABLE', 'VACCINE']

const categoryBadge: Record<string, string> = {
  MEDICINE: 'badge-blue',
  SURGICAL: 'badge-red',
  DIAGNOSTIC: 'badge-purple',
  EQUIPMENT: 'badge-gray',
  CONSUMABLE: 'badge-amber',
  VACCINE: 'badge-green',
}

const UNIT_OPTIONS = ['strip', 'box', 'vial', 'bottle', 'tube', 'piece', 'kg', 'litre'] as const

const simpleProductSchema = z.object({
  distributorId: z.string().optional(),
  sku: z.string().min(1, 'Stock Keeping Unit (SKU) code is required'),
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  category: z.enum(['MEDICINE', 'SURGICAL', 'DIAGNOSTIC', 'EQUIPMENT', 'CONSUMABLE', 'VACCINE']),
  unit: z.string().min(1, 'Unit is required'),
  mrp: z.coerce.number().positive('MRP must be greater than 0'),
  wholesalePrice: z.coerce.number().positive('Wholesale must be greater than 0'),
  prescriptionRequired: z.boolean(),
})

type SimpleProductForm = z.infer<typeof simpleProductSchema>

function orgDropdownLabel(org: { name: string; registrationNumber: string; id: string }) {
  return `${org.name} · ${org.registrationNumber} · ${org.id}`
}

export default function ProductsPage() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products', category, page],
    queryFn: () => productsApi.list({
      category: category === 'ALL' ? undefined : category,
      page,
      size: 12,
    }),
  })

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['products', 'search', search],
    queryFn: () => productsApi.search(search),
    enabled: search.length > 2,
  })

  const products = search.length > 2 ? searchResults?.content : data?.content

  const { data: distributorOrgs = [], isLoading: distributorsLoading } = useQuery({
    queryKey: ['organizations', 'DISTRIBUTOR'],
    queryFn: () => organizationsApi.listByType('DISTRIBUTOR'),
    enabled: addOpen && user?.role === 'ADMIN',
  })

  const activeDistributors = useMemo(
    () => distributorOrgs.filter(o => o.active),
    [distributorOrgs]
  )

  const { data: myOrganization } = useQuery({
    queryKey: ['organizations', user?.organizationId],
    queryFn: () => organizationsApi.getById(user!.organizationId),
    enabled: addOpen && user?.role === 'DISTRIBUTOR' && !!user?.organizationId,
  })

  const form = useForm<SimpleProductForm>({
    resolver: zodResolver(simpleProductSchema),
    defaultValues: {
      distributorId: '',
      sku: '',
      name: '',
      manufacturer: '',
      category: 'MEDICINE',
      unit: 'strip',
      mrp: 0,
      wholesalePrice: 0,
      prescriptionRequired: false,
    },
  })

  useEffect(() => {
    if (!addOpen || !user) return
    form.reset({
      distributorId: user.role === 'DISTRIBUTOR' ? user.organizationId : '',
      sku: '',
      name: '',
      manufacturer: '',
      category: 'MEDICINE',
      unit: 'strip',
      mrp: 0,
      wholesalePrice: 0,
      prescriptionRequired: false,
    })
  }, [addOpen, user, form.reset])

  useEffect(() => {
    if (!addOpen || user?.role !== 'ADMIN') return
    if (activeDistributors.length !== 1) return
    const only = activeDistributors[0]
    if (only?.id && !form.getValues('distributorId')) {
      form.setValue('distributorId', only.id)
    }
  }, [addOpen, user?.role, activeDistributors, form])

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      toast.success('Product created')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setAddOpen(false)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? 'Failed to create product')
    },
  })

  const onSubmitProduct = (data: SimpleProductForm) => {
    const distributorId =
      user?.role === 'DISTRIBUTOR' ? user.organizationId : data.distributorId?.trim()
    if (user?.role === 'ADMIN' && !distributorId) {
      toast.error('Select a distributor organization')
      return
    }
    createMutation.mutate({
      sku: data.sku.trim(),
      name: data.name.trim(),
      manufacturer: data.manufacturer.trim(),
      category: data.category,
      type: 'BRANDED',
      unit: data.unit.trim(),
      mrp: data.mrp,
      wholesalePrice: data.wholesalePrice,
      prescriptionRequired: data.prescriptionRequired,
      controlledSubstance: false,
      distributorId: distributorId!,
    })
  }

  const canAddProduct = user?.role === 'ADMIN' || user?.role === 'DISTRIBUTOR'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.totalElements ?? 0} products available
          </p>
        </div>
        {canAddProduct && (
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            + Add Product
          </button>
        )}
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={() => !createMutation.isPending && setAddOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-white rounded-t-xl">
              <h2 id="add-product-title" className="text-lg font-semibold text-gray-900">
                Add product
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                disabled={createMutation.isPending}
                onClick={() => setAddOpen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="p-5 space-y-4" onSubmit={form.handleSubmit(onSubmitProduct)}>
              {user?.role === 'ADMIN' && (
                <div>
                  <label className="form-label" htmlFor="add-product-org">
                    Organization (distributor)
                  </label>
                  {distributorsLoading ? (
                    <p className="text-sm text-gray-500 py-2">Loading organizations…</p>
                  ) : activeDistributors.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      No active distributor organizations found. Create one first.
                    </p>
                  ) : (
                    <>
                      <select
                        id="add-product-org"
                        className="form-input"
                        {...form.register('distributorId')}
                      >
                        <option value="">— Select organization —</option>
                        {activeDistributors.map(org => (
                          <option key={org.id} value={org.id}>
                            {orgDropdownLabel(org)}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Name, registration number, and MongoDB ID are shown for each row.
                      </p>
                    </>
                  )}
                </div>
              )}

              {user?.role === 'DISTRIBUTOR' && myOrganization && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium text-gray-900">Your organization</p>
                  <p className="text-gray-700 mt-0.5">{myOrganization.name}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                    ID: {myOrganization.id}
                  </p>
                </div>
              )}

              <div>
                <label className="form-label" htmlFor="add-product-sku">
                  SKU <span className="text-gray-500 font-normal">(Stock Keeping Unit)</span>
                </label>
                <input
                  id="add-product-sku"
                  className="form-input"
                  autoComplete="off"
                  placeholder="e.g. PARA-500-TAB-001"
                  {...form.register('sku')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique product code used for inventory, orders, and regulatory traceability.
                </p>
                {form.formState.errors.sku && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.sku.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Product name</label>
                <input className="form-input" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Manufacturer</label>
                <input className="form-input" {...form.register('manufacturer')} />
                {form.formState.errors.manufacturer && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.manufacturer.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" {...form.register('category')}>
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select className="form-input" {...form.register('unit')}>
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">MRP (₹)</label>
                  <input type="number" step="0.01" min="0" className="form-input" {...form.register('mrp')} />
                  {form.formState.errors.mrp && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.mrp.message}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Wholesale (₹)</label>
                  <input type="number" step="0.01" min="0" className="form-input" {...form.register('wholesalePrice')} />
                  {form.formState.errors.wholesalePrice && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.wholesalePrice.message}</p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded border-gray-300" {...form.register('prescriptionRequired')} />
                Prescription required
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={createMutation.isPending}
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    createMutation.isPending
                    || (user?.role === 'ADMIN' && (distributorsLoading || activeDistributors.length === 0))
                  }
                >
                  {createMutation.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => { setCategory(cat); setPage(0) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading || searching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products?.map((product: Product) => (
              <div key={product.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className={categoryBadge[product.category] ?? 'badge-gray'}>
                    {product.category}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
                  {product.name}
                </h3>
                {product.genericName && (
                  <p className="text-xs text-gray-500 mb-1">{product.genericName}</p>
                )}
                <p className="text-xs text-gray-400 mb-3">{product.manufacturer}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Wholesale</p>
                    <p className="font-bold text-gray-900">₹{product.wholesalePrice}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">MRP</p>
                    <p className="text-sm text-gray-500">₹{product.mrp}</p>
                  </div>
                </div>

                {product.prescriptionRequired && (
                  <p className="text-xs text-red-500 mt-2 font-medium">℞ Prescription required</p>
                )}
              </div>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={data.first}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {data.number + 1} of {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => p + 1)}
                disabled={data.last}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

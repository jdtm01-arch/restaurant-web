import { useState, useRef, useEffect } from 'react'

/**
 * Searchable product selector with real-time filtering.
 *
 * Props:
 *  - products: Product[]          (active products list)
 *  - value: string|number         (selected product_id or '')
 *  - onChange(productId): void    (called with product id string)
 *  - fmtMoney(v): string         (money formatter)
 *  - placeholder: string
 */
export default function ProductSearch({ products = [], value, onChange, fmtMoney, placeholder = 'Buscar producto...' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // When value is set externally (e.g. reset), sync display
  const selected = products.find((p) => String(p.id) === String(value))

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = products.filter((p) => {
    if (!query) return true
    const q = query.toLowerCase()
    return p.name?.toLowerCase().includes(q) ||
      String(p.id).includes(q)
  })

  const handleSelect = (product) => {
    onChange(String(product.id))
    setQuery(product.name)
    setOpen(false)
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    setOpen(true)
    // Clear selection if user modifies text
    if (selected && e.target.value !== selected.name) {
      onChange('')
    }
  }

  const handleFocus = () => {
    setOpen(true)
    // If already selected, show name so user can search from it
    if (selected) setQuery(selected.name)
  }

  return (
    <div className="product-search" ref={wrapperRef}>
      <input
        type="text"
        className="input"
        value={selected && !open ? selected.name : query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="product-search__dropdown">
          {filtered.length === 0 ? (
            <div className="product-search__empty">Sin resultados</div>
          ) : (
            filtered.slice(0, 20).map((p) => (
              <button
                key={p.id}
                type="button"
                className={`product-search__option${String(p.id) === String(value) ? ' product-search__option--selected' : ''}`}
                onClick={() => handleSelect(p)}
              >
                <span className="product-search__name">{p.name}</span>
                <span className="product-search__price">{fmtMoney?.(p.price_with_tax) || `S/ ${Number(p.price_with_tax).toFixed(2)}`}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

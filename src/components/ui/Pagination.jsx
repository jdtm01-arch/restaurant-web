import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ currentPage, lastPage, onPageChange }) {
  if (lastPage <= 1) return null

  return (
    <div className="pagination">
      <button
        className="pagination__btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="sidebar__link-icon" />
      </button>
      <span className="pagination__info">
        Página {currentPage} de {lastPage}
      </span>
      <button
        className="pagination__btn"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="sidebar__link-icon" />
      </button>
    </div>
  )
}

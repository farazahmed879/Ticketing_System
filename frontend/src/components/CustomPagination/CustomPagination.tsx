import React, { useState, useRef, useEffect } from 'react';
import CustomIcon from '../CustomIcon';
import styles from './CustomPagination.module.css';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '../../utils/constants';

import type { CustomPaginationProps } from '../types';

const COMPACT_QUERY = '(max-width: 768px)';

const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = DEFAULT_PAGE_SIZE,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) => {
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems || 0);

  // Phones/tablets get a single-row bar: size picker, short range text and
  // first / prev / current / next / last only.
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    setIsCompact(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const getVisiblePages = () => {
    if (isCompact) return totalPages > 0 ? [currentPage] : [];
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  };

  const pages = getVisiblePages();

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.leftSection}>
        {onPageSizeChange && (
          <div className={styles.pageSize}>
            <span className={styles.sizeLabel}>Show</span>
            <div className={styles.customSelectWrapper} ref={dropdownRef}>
              <button 
                className={styles.sizeTrigger} 
                onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
              >
                {itemsPerPage}
                <CustomIcon 
                  name="ChevronDown" 
                  size={14} 
                  className={`${styles.selectArrow} ${isSizeDropdownOpen ? styles.arrowUp : ''}`} 
                />
              </button>
              
              {isSizeDropdownOpen && (
                <div className={`${styles.sizeDropdown} glass-card animate-fade-in`}>
                  {pageSizeOptions.map(option => (
                    <div 
                      key={option} 
                      className={`${styles.sizeOption} ${itemsPerPage === option ? styles.sizeOptionActive : ''}`}
                      onClick={() => {
                        onPageSizeChange(option);
                        setIsSizeDropdownOpen(false);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className={styles.sizeLabel}>entries</span>
          </div>
        )}

        {totalItems !== undefined && (
          <div className={styles.info}>
            {isCompact ? (
              <>
                <span>{totalItems === 0 ? 0 : startItem}–{endItem}</span> of <span>{totalItems}</span>
              </>
            ) : (
              <>
                Showing <span>{startItem}</span> to <span>{endItem}</span> of <span>{totalItems}</span> results
              </>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <button 
          className={`${styles.pageBtn} ${styles.edgeBtn}`} 
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          title="First Page"
        >
          <CustomIcon name="ChevronsLeft" size={18} />
        </button>

        <button 
          className={styles.pageBtn} 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          title="Previous Page"
        >
          <CustomIcon name="ChevronLeft" size={18} />
        </button>

        {!isCompact && pages[0] > 0 && (
          <>
            <button className={styles.pageBtn} onClick={() => onPageChange(0)}>1</button>
            {pages[0] > 1 && <span className={styles.ellipsis}>...</span>}
          </>
        )}

        {pages.map(page => (
          <button 
            key={page}
            className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
            onClick={() => onPageChange(page)}
            title={isCompact ? `Page ${page + 1} of ${totalPages}` : undefined}
          >
            {page + 1}
          </button>
        ))}

        {!isCompact && pages[pages.length - 1] < totalPages - 1 && (
          <>
            {pages[pages.length - 1] < totalPages - 2 && <span className={styles.ellipsis}>...</span>}
            <button className={styles.pageBtn} onClick={() => onPageChange(totalPages - 1)}>
              {totalPages}
            </button>
          </>
        )}

        <button 
          className={styles.pageBtn} 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1 || totalPages === 0}
          title="Next Page"
        >
          <CustomIcon name="ChevronRight" size={18} />
        </button>

        <button 
          className={`${styles.pageBtn} ${styles.edgeBtn}`} 
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage === totalPages - 1 || totalPages === 0}
          title="Last Page"
        >
          <CustomIcon name="ChevronsRight" size={18} />
        </button>
      </div>
    </div>
  );
};

export default CustomPagination;

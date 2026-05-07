import React, { useState, useRef, useEffect } from 'react';
import CustomIcon from '../CustomIcon';
import styles from './CustomPagination.module.css';

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
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

  const getVisiblePages = () => {
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
            <span>Show</span>
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
            <span>entries</span>
          </div>
        )}

        {totalItems !== undefined && (
          <div className={styles.info}>
            Showing <span>{startItem}</span> to <span>{endItem}</span> of <span>{totalItems}</span> results
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <button 
          className={styles.pageBtn} 
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

        {pages[0] > 0 && (
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
          >
            {page + 1}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages - 1 && (
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
          className={styles.pageBtn} 
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

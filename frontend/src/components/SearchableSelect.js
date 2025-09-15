import React, { useState, useEffect, useRef } from 'react';
import '../styles/SearchableSelect.css';

const SearchableSelect = ({ options, placeholder, onSelect, value }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef(null);

    // Filter options based on search term
    useEffect(() => {
        setFilteredOptions(
            options.filter(option =>
                option.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, options]);

    // NEW: Sync internal state with the parent's `value` prop.
    // This is the fix for the "Clear all filters" button.
    useEffect(() => {
        if (value === 'All') {
            setSearchTerm('');
        }
    }, [value]);

    // Handle clicks outside the component to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (option) => {
        setSearchTerm(option);
        onSelect(option);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation(); // Prevents the dropdown from opening
        setSearchTerm('');
        onSelect('All'); // Assuming 'All' is the clear state for your filter
        setIsOpen(false);
    };

    // Use a display value for the input field
    const displayValue = value === 'All' ? '' : value;

    return (
        <div className="searchable-select-container" ref={wrapperRef}>
            <div className="searchable-select-input-wrapper">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm || displayValue}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="searchable-select-input"
                />
                {displayValue && (
                    <button className="clear-button" onClick={handleClear}>
                        &times;
                    </button>
                )}
            </div>
            {isOpen && (
                <ul className="searchable-select-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <li key={index} onClick={() => handleSelect(option)}>
                                {option}
                            </li>
                        ))
                    ) : (
                        <li className="no-results">No results found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;

import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ArrowDown } from '../../assets/icons';
import styles from './styles.module.scss';

const DropdownMenu = ({ options, defaultOption, disabled, onOpen, onClose, onSelect }) => {
	const [isOpen, setOpen] = useState(false);
	const [items] = useState(options);
	const [selectedItem, setSelectedItem] = useState(null);
	const dropdownRef = useRef(null);

	const toggleDropdown = useCallback(() => {
		setOpen((prevIsOpen) => !prevIsOpen);
	}, []);

	const handleItemClick = useCallback((id) => {
		if (typeof onSelect === 'function') {
			onSelect(id);
		}
		setSelectedItem((prevSelectedItem) => (prevSelectedItem === id ? null : id));
		toggleDropdown();
	}, [toggleDropdown, onSelect]);

	useEffect(() => {
		if (!selectedItem && !defaultOption) {
			const defaultItem = items.find((item) => item.default);
			if (defaultItem) {
				setSelectedItem(defaultItem.id);
			}
		}
	}, [items, selectedItem, defaultOption]);

	useEffect(() => {
		if (isOpen && typeof onOpen === 'function') {
			onOpen();
		}

		if (!isOpen && typeof onClose === 'function') {
			onClose();
		}
	}, [isOpen, onOpen, onClose]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className={styles.dropdownContainer} ref={dropdownRef} disabled={disabled}>
			<div
				className={`${styles.dropdownHeader} ${isOpen ? styles.open : ''}`}
				onClick={toggleDropdown}
				role="button"
				tabIndex="0"
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === 'Space') toggleDropdown();
				}}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
			>
				{selectedItem ? items.find((item) => item.id === selectedItem).label : defaultOption}
				<ArrowDown style={{ transform: `rotate(${isOpen ? '0deg' : '-90deg'})` }} />
			</div>
			<div className={`${styles.dropdownBody} ${isOpen ? styles.open : ''}`} role="listbox">
				{
					items.map((item) => (
						<div
							className={`${styles.dropdownItem} ${item.id === selectedItem ? styles.selected : ''}`}
							onClick={() => handleItemClick(item.id)}
							key={item.id}
							role="option"
							tabIndex="0"
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === 'Space') handleItemClick(item.id);
							}}
							aria-selected={item.id === selectedItem}
						>
							<span className={`${styles.dropdownItemDot} ${item.id === selectedItem ? styles.selected : ''}`}>• </span>
							{item.label}
						</div>
					))
				}
			</div>
		</div>
	);
};

DropdownMenu.propTypes = {
	options: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.any.isRequired,
			label: PropTypes.string.isRequired,
			default: PropTypes.bool,
		})
	).isRequired,
	defaultOption: PropTypes.string,
	disabled: PropTypes.bool,
	onOpen: PropTypes.func,
	onClose: PropTypes.func,
	onSelect: PropTypes.func,
};

DropdownMenu.defaultProps = {
	defaultOption: null,
	disabled: false,
	onOpen: null,
	onClose: null,
	onSelect: null,
};

export default DropdownMenu;

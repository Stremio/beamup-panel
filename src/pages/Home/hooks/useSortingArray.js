const useSortingArray = () => {
	const SortingOptions = [
		{ id: 1, label: 'All Projects', default: true },
		{ id: 2, label: 'Running' },
		{ id: 3, label: 'Failing' },
	];
	return SortingOptions;
};

export default useSortingArray;

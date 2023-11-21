import { useState } from 'react';

const useSortingOptions = (selectedSorting, projects) => {
	let sortedProjects = [];

	if (projects?.length) {
		switch(selectedSorting) {
		case 1: // All Projects
			sortedProjects = projects;
			break;
		case 2: // Running
			sortedProjects = projects.filter(proj => proj.status === 'running');
			break;
		case 3: // Failing
			sortedProjects = projects.filter(proj => proj.status !== 'running');
			break;
		default:
			return [];
		}

		return sortedProjects;
	}

	return sortedProjects;
};

const useSortedProjects = (initialSortOption, projects) => {
	const [selectedSorting, setSelectedSorting] = useState(initialSortOption);
	const sortedProjects = useSortingOptions(selectedSorting, projects);

	return { sortedProjects, selectedSorting, setSelectedSorting };
};

export default useSortedProjects;


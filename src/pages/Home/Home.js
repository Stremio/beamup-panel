import React from 'react';
import { Project, UserProfile, DropdownMenu, useApi } from '../../common';
import { useSortingArray, useSortedProjects } from './hooks';
import { LoadingProjects } from './loadingStates';
import styles from './styles.module.scss';

export default function Home() {
	const { projects } = useApi();

	// --> Sorting
	const SortingOptions = useSortingArray();
	const { sortedProjects, selectedSorting, setSelectedSorting } = useSortedProjects(1, projects);

	return (
		<section className={styles.wrapper}>
			<UserProfile
				compact={false}
				projectsCount={projects.length}
				failingProjects={projects.filter(proj => proj.status !== 'running').length}
			/>
			<div className={styles.tasksContainer}>
				<div className={styles.tasksInfoWrapper}>
					<div className={styles.tasksInfo}>
						<h3 className={styles.subheading}>{SortingOptions[selectedSorting - 1].label}</h3>
					</div>
					<DropdownMenu
						options={SortingOptions}
						disabled={false}
						onSelect={(selectedId) => setSelectedSorting(selectedId)}
					/>
				</div>
				{
					projects.length === 0 ? (
						<React.Fragment>
							<LoadingProjects />
							<LoadingProjects />
							<LoadingProjects />
						</React.Fragment>
					) : (
						sortedProjects.map((proj, index) => (
							<Project
								key={index}
								title={proj?.name}
								priority={proj?.status === 'running' ? 1 : proj?.status === 'failing' ? 10 : 0}
								link={proj?.issueUrl || ''}
								labels={proj?.labels || [{ id: '1', name: 'See Logs' }, { id: '2', name: 'Restart' }, { id: '3', name: 'Delete' }]}
								assignees={proj?.assignees || []}
							/>
						))
					)
				}
			</div>
		</section>
	);
}

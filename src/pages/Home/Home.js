import React from 'react';
import { Project, UserProfile, DropdownMenu, useApi } from '../../common';
import { useSortingArray, useSortedProjects } from './hooks';
import { LoadingProjects } from './loadingStates';
import styles from './styles.module.scss';

export default function Home() {
	const { projects, serverUsage } = useApi();

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
			<div className={styles.serverUsage}>
				<div className={styles.serverUsageName}>Server Status</div>
				<div className={`${styles.serverUsageTab} ${styles['serverUsage' + ((serverUsage || [])[0]?.cpu ? (serverUsage[0].cpu > 0.85 ? 'Red' : serverUsage[0].cpu > 0.70 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
					<div className={styles.sameHeight}></div>
					<div className={styles.serverUsageElement}>
						<div className={styles.serverUsageTitle}>CPU</div>
						<div>{serverUsage?.cpu ? (serverUsage.cpu * 100).toFixed(2) + '%' : '0.00%' }</div>
					</div>
				</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + ((serverUsage || [])[0]?.mem ? (serverUsage[0].mem > 0.85 ? 'Red' : serverUsage[0].mem > 0.70 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
					<div className={styles.sameHeight}></div>
					<div className={styles.serverUsageElement}>
						<div className={styles.serverUsageTitle}>Mem</div>
						<div>{serverUsage?.mem ? (serverUsage.mem * 100).toFixed(2) + '%' : '0.00%' }</div>
					</div>
				</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + ((serverUsage || [])[0]?.swap ? (serverUsage[0].swap > 0.85 ? 'Red' : serverUsage[0].swap > 0.70 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
					<div className={styles.sameHeight}></div>
					<div className={styles.serverUsageElement}>
						<div className={styles.serverUsageTitle}>Swap</div>
						<div>{serverUsage?.swap ? (serverUsage.swap * 100).toFixed(2) + '%' : '0.00%' }</div>
					</div>
				</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + ((serverUsage || [])[0]?.hdd ? (serverUsage[0].hdd > 0.85 ? 'Red' : serverUsage[0].hdd > 0.70 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
					<div className={styles.sameHeight}></div>
					<div className={styles.serverUsageElement}>
						<div className={styles.serverUsageTitle}>HDD</div>
						<div>{serverUsage?.hdd ? (serverUsage.hdd * 100).toFixed(2) + '%' : '0.00%' }</div>
					</div>
				</div>
			</div>
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
								cpu={proj?.cpu}
								memPerc={proj?.memPerc}
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

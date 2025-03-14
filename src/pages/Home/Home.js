import React from 'react';
import { Project, UserProfile, DropdownMenu, useApi } from '../../common';
import { useSortingArray, useSortedProjects } from './hooks';
import { LoadingProjects } from './loadingStates';
import styles from './styles.module.scss';
import { hoverAnimation } from '../../animations';
import { motion } from 'framer-motion';

export default function Home() {
	const { projects, lastServerUsage } = useApi();

	const [data, setData] = React.useState({ pageName: 'Projects' });

	// --> Sorting
	const SortingOptions = useSortingArray();
	const { sortedProjects, selectedSorting, setSelectedSorting } = useSortedProjects(1, projects);

	const handleClick = (changeTo, ev) => {
		ev.preventDefault();
		setData((data) => { return { ...data, pageName: changeTo }; });
	};

	return (
		<section className={styles.wrapper}>
			<UserProfile
				compact={false}
				projectsCount={projects.length}
				failingProjects={projects.filter(proj => proj.status !== 'running').length}
			/>
			<div
				className={styles.navMenu}
				>
				<a href="#" onClick={handleClick.bind(this, 'Projects')} className={data.pageName === 'Projects' ? styles.boldLink : styles.normalLink}>Projects</a>
				<a href="#" onClick={handleClick.bind(this, 'Servers')} className={data.pageName === 'Servers' ? styles.boldLink : styles.normalLink}>Servers</a>
				<a href={'/news.html'} target={'_blank'} className={styles.normalLink}>News</a>
			</div>
			<div className={data.pageName === 'Servers' ? styles.shownTab : styles.hiddenTab}>
				<div class={styles.serverStatusTitle}>
					<h3 className={styles.subheading}>Server Status</h3>
				</div>
				{
					lastServerUsage.length === 0 ? (
						<div></div>
					) : (
						lastServerUsage.map((usage, index) => (
							<motion.a
								className={styles.serverUsage}
								as={motion.a}
								whileHover={hoverAnimation}
								href={'/server_usage?server='+index}
								target={'_blank'}
								rel="noopener noreferrer"
								>
								<div className={styles.serverUsageHeader}>{'Server '+(index+1)}</div>
								<div className={styles.serverUsageTabHolder}>
									<div className={`${styles.serverUsageTab} ${styles['serverUsage' + (usage?.cpu ? (usage.cpu > 0.9 ? 'Red' : usage.cpu > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
										<div className={styles.sameHeight}></div>
										<div className={styles.serverUsageElement}>
											<div className={styles.serverUsageTitle}>CPU</div>
											<div>{usage?.cpu ? (usage.cpu * 100).toFixed(2) + '%' : '0.00%' }</div>
										</div>
									</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (usage?.mem ? (usage.mem > 0.9 ? 'Red' : usage.mem > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
										<div className={styles.sameHeight}></div>
										<div className={styles.serverUsageElement}>
											<div className={styles.serverUsageTitle}>Mem</div>
											<div>{usage?.mem ? (usage.mem * 100).toFixed(2) + '%' : '0.00%' }</div>
										</div>
									</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (usage?.hdd ? (usage.hdd > 0.93 ? 'Red' : usage.hdd > 0.84 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
										<div className={styles.sameHeight}></div>
										<div className={styles.serverUsageElement}>
											<div className={styles.serverUsageTitle}>Disk</div>
											<div>{usage?.hdd ? (usage.hdd * 100).toFixed(2) + '%' : '0.00%' }</div>
										</div>
									</div>
								</div>
							</motion.a>
						))
					)
				}
			</div>
			<div className={data.pageName === 'Projects' ? styles.shownTab : styles.hiddenTab}>
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
			</div>
		</section>
	);
}

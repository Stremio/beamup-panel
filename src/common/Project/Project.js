import { memo } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { usePriority } from './hooks';
import { hoverAnimation } from '../../animations';
import styles from './styles.module.scss';

const Project = memo(({ labels, title, cpu, memPerc, priority, assignees, link }) => {
	const handleShowPriorityIcon = usePriority(priority);

	return (
		<motion.span
			className={styles.ProjectContainer}
			as={motion.a}
			whileHover={hoverAnimation}
			target={'_blank'}
			rel="noopener noreferrer"
		>
			<div className={styles.projectInfo}>
				<div className={styles.projectPriority}>{handleShowPriorityIcon}</div>
				<a href={`/project_usage?proj=${encodeURIComponent(title)}`} className={styles.projectTitle+(priority === 0 ? ' ' + styles.lineThrough : '')}>
					<div>{title}</div>
					<div className={styles.projectUsage}>CPU: {cpu || '0%'} / MEM: {memPerc || '0%'}</div>
				</a>
			</div>
			<span className={styles.hrLine}></span>
			<div className={styles.projectSpecificInfo}>
				{
					priority === 0 ?
						<span className={styles.deletingMsg}>
							Deleting ...
						</span>
					:
					Array.isArray(labels) && labels.length > 0 ? (
						<div className={styles.projectLabels}>
							{
								labels.map((label) => (
									<a href={label.name.toLowerCase() === 'see logs' ? `/getLogs?proj=${encodeURIComponent(title)}` : `/warn?proj=${encodeURIComponent(title)}&action=${label.name.toLowerCase()}`}>
										<div
											key={label.id}
											className={`${styles.projectLabel} ${styles[label.name.toLowerCase().replace(/\s/g, '-')]}`}
										>
											{label.name}
										</div>
									</a>
								))
							}
						</div>
					)
						: <div></div>
				}
			</div>
		</motion.span>
	);
});

Project.propTypes = {
	labels: PropTypes.array,
	title: PropTypes.string,
	cpu: PropTypes.string,
	memPerc: PropTypes.string,
	priority: PropTypes.number,
	assignees: PropTypes.array,
	link: PropTypes.string,
};

Project.displayName = 'Project';

export default Project;

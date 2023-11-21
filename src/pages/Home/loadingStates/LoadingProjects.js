import React from 'react';
import { hoverAnimation } from '../../../animations';
import { motion } from 'framer-motion';
import styles from '../../../common/Project/styles.module.scss';

const LoadingProjects = () => {
	return (
		<React.Fragment>
			<motion.div className={styles.ProjectContainer} whileHover={hoverAnimation}>
				<div className={styles.projectInfo}>
					<div className={styles.projectPriority}>
						<div className={styles.customLoaderBox}></div>
					</div>
					<div className={styles.projectTitle}>
						<div className={styles.customLoaderBox}></div>
					</div>
				</div>
				<div className={styles.hrLine}></div>
				<div className={styles.projectSpecificInfo}>
					<div className={styles.projectLabels}>
						<div className={styles.projectLabel}>
							<div className={styles.customLoaderBox}></div>
						</div>
					</div>
				</div>
			</motion.div>
		</React.Fragment>
	);
};

export default LoadingProjects;


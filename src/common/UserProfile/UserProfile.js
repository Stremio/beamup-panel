import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useApi } from '../Api/Api';
import { BeamUpLogo, LogoutImg } from '../../assets';
import { appearTopAnimation, scaleImageAnimation, hoverAnimation, appearBottomImageAnimation } from '../../animations';
import styles from './styles.module.scss';
import { Link } from 'react-router-dom';
import { useLogout } from './hooks';

const UserProfile = ({ compact, projectsCount, failingProjects }) => {
	const { user } = useApi();
	const handleLogout = useLogout();
	const { avatar_url, name, login } = user;

	return (
		<section className={styles.UserProfileWrapper} {...(compact ? { compact: '' } : {})}>
			<div className={styles.headerBox}>
				<h1 className={styles.heading}>BeamUp</h1>
				<span className={styles.logoutHolder} onClick={() => handleLogout()}><img className={styles.logoutButton} src={LogoutImg} alt="Logout" title="Logout"/></span>
			</div>
			<div className={styles.UserProfileContainer} {...(compact ? { compact: '' } : {})}>
				{
					!compact ? (
						<motion.div
							animate={appearTopAnimation.visible}
							initial={appearTopAnimation.hidden}
							className={styles.tasksCount}
						>
							{
								projectsCount ?
									<h3 className={styles.subheading}>{projectsCount}</h3>
									:
									<div className={styles.customLoaderDots}></div>
							}
							<h6 className={styles.smallSubheading}>Projects</h6>
						</motion.div>
					)
						: null
				}
				<Link
					to={'/'}
					rel="noreferrer noopener"
					className={styles.ImageContainer}
				>
					<motion.img
						whileHover={hoverAnimation}
						animate={scaleImageAnimation.visible}
						initial={scaleImageAnimation.hidden}
						className={compact ? `${styles.userPfp} ${styles.userPfpCompact}` : styles.userPfp}
						src={avatar_url}
						alt="Profile avatar"
					/>
				</Link>
				{
					!compact ? (
						<motion.div
							animate={appearTopAnimation.visible}
							initial={appearTopAnimation.hidden}
							className={styles.tasksCount}
						>
							{
								<h3 className={styles.subheading}>{failingProjects}</h3>
							}
							<h6 className={styles.smallSubheading}>Failing</h6>
						</motion.div>
					)
						: null
				}
				{
					compact ? (
						<Link to={'/'}>
							<img className={styles.beamupHomeLogo} src={BeamUpLogo} alt="BeamUp logo" />
						</Link>
					)
						: null
				}
			</div>
			{
				!compact ? (
					<motion.h3
						animate={appearBottomImageAnimation.visible}
						initial={appearBottomImageAnimation.hidden}
						className={styles.subheading}
					>
                        Hello {name || login}
					</motion.h3>
				)
					: null
			}
		</section>
	);
};

UserProfile.propTypes = {
	compact: PropTypes.bool,
	projectsCount: PropTypes.number,
	failingProjects: PropTypes.number
};

export default UserProfile;

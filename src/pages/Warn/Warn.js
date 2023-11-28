import { useState, useEffect } from 'react';
import styles from './styles.module.scss';

function capitalizeFirstLetter(string = 'yes') {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function Home() {
	const [data, setData] = useState({ project: '', actionType: '', agreeLink: '' });

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const project = searchParams.get('proj') || '';
		const actionType = searchParams.get('action') || '';

		if (project && actionType) {
			setData((data) => { return { ...data, project, actionType, agreeLink: `/${actionType === 'delete' ? 'doDelete' : 'doRestart'}?domain=${encodeURIComponent(window.location.hostname)}&proj=${encodeURIComponent(project)}` }; });
		}
	}, []);

	return (
		<section className={styles.wrapper}>
			<h2 className={styles.warnMsg}>Are you sure you want to <span className={styles.redText}>{data.actionType}</span> "{data.project}"?</h2>
			<div>
				<a className={styles.warnButton} href="/">Cancel</a>
				<a className={styles.warnButton+' '+styles.warnRed} href={data.agreeLink}>{capitalizeFirstLetter(data.actionType)}</a>
			</div>
		</section>
	);
}

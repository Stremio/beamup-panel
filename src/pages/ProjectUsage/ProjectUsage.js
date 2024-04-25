import React from 'react';
import { useProjectUsage } from '../../common';
import styles from './styles.module.scss';

function toBytes(str) {
	let SizeInBytes = 0
	if (str.endsWith('TB')) {
		SizeInBytes = parseFloat(str) * Math.pow(1024, 4);
	} else if (str.endsWith('GB')) {
		SizeInBytes = parseFloat(str) * Math.pow(1024, 3);
	} else if (str.endsWith('MB')) {
		SizeInBytes = parseFloat(str) * Math.pow(1024, 2);
	} else if (str.endsWith('kB')) {
		SizeInBytes = parseFloat(str) * Math.pow(1024, 1);
	} else if (str.endsWith('B')) {
		SizeInBytes = parseFloat(str);
	}
	return SizeInBytes
}

function getTime(timestamp, type) {
	const tm = (new Date(timestamp))['get'+type]()
	return addZero(tm)
}

function addZero(tm) {
	return ('0' + tm).slice(-2)
}

function fill(obj) {
	if (obj?.usage) {
		if (obj.usage.length < 288) {
			const arrLength = obj.usage.length
			const d = (new Date(obj.usage[0].timestamp))
			const method = d.getHours() >= 23 && d.getMinutes() >= 50 ? 'push' : 'unshift'
			for (var j = 0; j < 288 - arrLength; j++) {
				obj.usage[method]({})
			}
		} else if (obj.usage.length > 288) {
			obj.usage = obj.usage.slice(0, 288)
		}
	}
	return obj
}

export default function ProjectUsage() {
	const { projectUsage } = useProjectUsage();

	const [data, setData] = React.useState({ project: '' });

	React.useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const project = searchParams.get('proj') || '';

		if (project) {
			setData((data) => { return { ...data, project }; });
		}
	}, []);

	const days = []

	let current = ''

	let obj = {}

	for (var i = 0; projectUsage[i]; i++) {
		const d = new Date(projectUsage[i].timestamp)
		const dateString = addZero(d.getDate()) + '/' + addZero(d.getMonth()+1) + '/' + d.getFullYear()
		projectUsage[i].cpu = parseFloat(projectUsage[i].cpu) / 100
		projectUsage[i].mem = parseFloat(projectUsage[i].memPerc) / 100
		if (current !== dateString) {
			if (Object.keys(obj).length)
				days.push(fill(obj))
			current = dateString
			obj = {
				day: dateString,
				usage: [projectUsage[i]]
			}
		} else {
			obj.usage.push(projectUsage[i])
		}
	}

	if (Object.keys(obj).length)
		days.push(fill(obj))

	const daysDetailed = []

	days.forEach(data => {
		const parts = []
		let obj = {}
		for (var i = 0; data.usage[i]; i++) {
			const usage = data.usage[i]
			const isDanger = usage?.cpu > 0.9 || usage?.mem > 0.9
			const isWarning = usage?.cpu > 0.8 || usage?.mem > 0.8
			const state = isDanger ? 'Red' : isWarning ? 'Yellow' : 'Green'
			if (obj.state === state) {
				obj.startTime = usage.timestamp
				obj.usage.push(usage)
				obj.minCpu = Math.min(obj.minCpu, usage?.cpu || 0)
				obj.maxCpu = Math.max(obj.maxCpu, usage?.cpu || 0)
				obj.minMem = Math.min(obj.minMem, usage?.mem || 0)
				obj.maxMem = Math.max(obj.maxMem, usage?.mem || 0)
			} else {
				if (Object.keys(obj).length && ['Red', 'Yellow'].includes(obj.state))
					parts.push(obj)
				obj = {
					state: state,
					startTime: usage?.timestamp,
					endTime: usage?.timestamp,
					minCpu: usage?.cpu || 0,
					maxCpu: usage?.cpu || 0,
					minMem: usage?.mem || 0,
					maxMem: usage?.mem || 0,
					usage: [usage]
				}
			}
		}
		if (Object.keys(obj).length && ['Red', 'Yellow'].includes(obj.state))
			parts.push(obj)
		daysDetailed.push({
			day: data.day,
			parts: parts,
		})
	})

	function showDetailed(idx) {
		window.document.querySelectorAll('.'+styles.dayContainer)[idx].classList.add(styles.showDetailed)
	}

	const lastProjectUsage = projectUsage[0] || {}

	const title = data.project

	const labels = [{ id: '1', name: 'See Logs' }, { id: '2', name: 'Restart' }, { id: '3', name: 'Delete' }]

	const maxDays = 3

	return (
		<section className={styles.statsWrapper}>
			<div className={styles.tasksContainer}>
				<a href={'/'} className={styles.titleHref}><h1 className={styles.heading}>BeamUp</h1></a>
				<div className={styles.pageTitle}>
					{title}
					<div className={`${styles.projectState} ${styles['projectState' + (lastProjectUsage.hasOwnProperty('status') ? (lastProjectUsage.status === 'failing' || lastProjectUsage.status === 'deleting' ? 'Red' : lastProjectUsage.status === 'running' ? 'Green' : 'Gray') : 'Gray') ]}`}>{lastProjectUsage.status || 'unknown'}</div>
				</div>
				{
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
				<div className={styles.serverUsage}>
					<div className={styles.serverUsageHeader}>Current Status</div>
					<div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastProjectUsage.hasOwnProperty('cpu') ? (lastProjectUsage.cpu > 0.9 ? 'Red' : lastProjectUsage.cpu > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
						<div className={styles.halfHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>CPU</div>
							<div>{lastProjectUsage?.cpu ? (lastProjectUsage.cpu * 100).toFixed(2) + '%' : '0.00%' }</div>
						</div>
					</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastProjectUsage?.mem ? (lastProjectUsage.mem > 0.9 ? 'Red' : lastProjectUsage.mem > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
						<div className={styles.halfHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Mem</div>
							<div>{lastProjectUsage?.mem ? (lastProjectUsage.mem * 100).toFixed(2) + '%' : '0.00%' }</div>
						</div>
					</div>
				</div>
				<div className={styles.serverUsage}>
					<div className={styles.serverUsageHeader}>Network</div>
					<div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastProjectUsage?.netIO ? (toBytes(lastProjectUsage?.netIO?.split(' / ')[0]) > toBytes('300GB') ? 'Red' : (toBytes(lastProjectUsage?.netIO?.split(' / ')[0]) > toBytes('150GB') ? 'Yellow' : 'Green')) : 'Gray') ]}`}>
						<div className={styles.halfHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Input</div>
							<div>{lastProjectUsage?.netIO?.split(' / ')[0]}</div>
						</div>
					</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastProjectUsage?.netIO ? (toBytes(lastProjectUsage?.netIO?.split(' / ')[1]) > toBytes('300GB') ? 'Red' : (toBytes(lastProjectUsage?.netIO?.split(' / ')[1]) > toBytes('150GB') ? 'Yellow' : 'Green')) : 'Gray') ]}`}>
						<div className={styles.halfHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Output</div>
							<div>{lastProjectUsage?.netIO?.split(' / ')[1]}</div>
						</div>
					</div>
				</div>
				<div className={styles.serverUsage}>
					<div className={styles.serverUsageHeader}>Disk</div>
					<div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastProjectUsage?.blockIO ? (toBytes(lastProjectUsage?.blockIO?.split(' / ')[0]) > toBytes('300GB') ? 'Red' : (toBytes(lastProjectUsage?.blockIO?.split(' / ')[0]) > toBytes('150GB') ? 'Yellow' : 'Green')) : 'Gray') ]}`}>
						<div className={styles.halfHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Input</div>
							<div>{lastProjectUsage?.blockIO?.split(' / ')[0]}</div>
						</div>
					</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastProjectUsage?.blockIO ? (toBytes(lastProjectUsage?.blockIO?.split(' / ')[1]) > toBytes('300GB') ? 'Red' : (toBytes(lastProjectUsage?.blockIO?.split(' / ')[1]) > toBytes('150GB') ? 'Yellow' : 'Green')) : 'Gray') ]}`}>
						<div className={styles.halfHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Output</div>
							<div>{lastProjectUsage?.blockIO?.split(' / ')[1]}</div>
						</div>
					</div>
				</div>
				<div className={styles.historyTitle}>{maxDays} Day History</div>
				{
					(
						days.slice(0, maxDays).map((data, dayIdx) => (
							<div className={styles.dayContainer}>
								<div className={styles.blockTitle}>{data.day}</div>
								<div className={styles.blockContainer} title={'Click for details'} onClick={showDetailed.bind(null, dayIdx)}>
								{
									data.usage.map((usage, index) => (
										<div key={data.day+index}className={`${styles.miniBlock} ${styles['miniBlock' + (usage.status === 'failing' || usage.status === 'deleting' ? '' : (usage?.cpu && usage.cpu > 0.9) || (usage?.mem && usage.mem > 0.9) ? 'Red' : (usage?.cpu && usage.cpu > 0.8) || (usage?.mem && usage.mem > 0.8) ? 'Yellow' : usage?.mem ? 'Green' : '') ]}`} />
									))
								}
								</div>
								{
									daysDetailed[dayIdx].parts.map((detailed, partIdx) => (
										<div className={styles.detailed}>
											<div className={`${styles.hourTitle} ${styles['hourTitle' + detailed.state]}`}>
												{getTime(detailed.startTime, 'Hours')+':'+getTime(detailed.startTime, 'Minutes')+':'+getTime(detailed.startTime, 'Seconds')+(detailed.startTime !== detailed.endTime ? ' -> '+getTime(detailed.endTime, 'Hours')+':'+getTime(detailed.endTime, 'Minutes')+':'+getTime(detailed.endTime, 'Seconds') : '')}
											</div>
											<div className={styles.resourcesLine}>
												<div className={styles.twoBoxes}>CPU: {(detailed.minCpu * 100).toFixed(2)+(detailed.minCpu !== detailed.maxCpu ? '-'+(detailed.maxCpu * 100).toFixed(2) : '')+'%'}</div><div className={styles.twoBoxes}>Mem: {(detailed.minMem * 100).toFixed(2)+(detailed.minMem !== detailed.maxMem ? '-'+(detailed.maxMem * 100).toFixed(2) : '')+'%'}</div>
											</div>
										</div>
									))
								}
							</div>
						))
					)
				}
			</div>
		</section>
	);
}

import { HighPriorityTaskIcon, MediumPriorityTaskIcon, LowPriorityTaskIcon, NoPriorityTaskIcon } from '../../../assets/icons';

const usePriority = (priority) => {
	if (priority >= 7 ) {
		return <HighPriorityTaskIcon />;
	} else if (priority >= 4 && priority <= 6) {
		return <MediumPriorityTaskIcon />;
	} else if (priority === 0) {
		return <NoPriorityTaskIcon />;
	} else {
		return <LowPriorityTaskIcon />;
	}
};
export default usePriority;

import {MouseEvent} from 'react';
import {IconButton} from '@chakra-ui/react';
import {TbBusStop} from 'react-icons/tb';
import {ActivityIcon} from '../components';
import {ActivityType} from '../models/strava';
import {useActivities} from '../hooks';

type ActivityTypeFilterProps = {
  types: ActivityType[] | null;
  withCommute: boolean | 'only';
  onTypesChange: (newTypes: ActivityType[] | null) => void;
  onWithCommuteChange: (withCommute: boolean | 'only') => void;
};

const ActivityTypeFilter = ({types, withCommute, onTypesChange, onWithCommuteChange}: ActivityTypeFilterProps) => {
  const {activities} = useActivities({withPrivate: true});
  const uniqueTypes = [...new Set((activities ?? []).map(({sport_type}) => sport_type))];

  const handleCommuteToggle = () => onWithCommuteChange(true === withCommute ? 'only' : true);
  const handleIconClick = (type: ActivityType) => (event: MouseEvent) => {
    onTypesChange([type]);
    event.preventDefault();
  };

  const handleTypeToggle = (type: ActivityType) => () => {
    if (null === types || !types.includes(type)) {
      onTypesChange([...(types ?? []), type]);
    } else {
      const newTypes = types.filter(t => t !== type);
      onTypesChange(0 === newTypes.length ? null : newTypes);
    }
  };

  return (
    <>
      <IconButton
        size="xs"
        title="Commute only"
        variant={'only' === withCommute ? 'surface' : 'ghost'}
        onClick={handleCommuteToggle}
      >
        <TbBusStop />
      </IconButton>
      {uniqueTypes.map(type => (
        <IconButton
          key={type}
          size="xs"
          variant={null === types || types.includes(type) ? 'surface' : 'ghost'}
          onClick={handleTypeToggle(type)}
          onDoubleClick={handleIconClick(type)}
        >
          <ActivityIcon activityType={type} />
        </IconButton>
      ))}
    </>
  );
};

export {ActivityTypeFilter};

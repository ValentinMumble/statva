import {MouseEvent} from 'react';
import {IconButton, HStack} from '@chakra-ui/react';
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
  const [activities] = useActivities({withPrivate: true});
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
        variant={'only' === withCommute ? 'surface' : 'outline'}
        onClick={handleCommuteToggle}
      >
        <TbBusStop />
      </IconButton>
      <HStack>
        {uniqueTypes.map(type => (
          <IconButton
            key={type}
            size="xs"
            variant={null === types || types.includes(type) ? 'surface' : 'outline'}
            onClick={handleTypeToggle(type)}
            onDoubleClick={handleIconClick(type)}
          >
            <ActivityIcon activityType={type} />
          </IconButton>
        ))}
      </HStack>
    </>
  );
};

export {ActivityTypeFilter};

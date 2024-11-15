import {MouseEvent} from 'react';
import {CheckboxGroup} from '@chakra-ui/react';
import {TbBusStop} from 'react-icons/tb';
import {Checkbox} from '../components/ui';
import {ActivityIcon} from '../components';
import {ActivityType} from '../models/strava';
import {useActivities} from '../hooks';

type ActivityTypeFilterProps = {
  types: ActivityType[] | null;
  withCommute: boolean | 'only';
  onTypesChange: (newTypes: ActivityType[]) => void;
  onWithCommuteChange: (withCommute: boolean | 'only') => void;
};

const ActivityTypeFilter = ({types, withCommute, onTypesChange, onWithCommuteChange}: ActivityTypeFilterProps) => {
  const [activities] = useActivities({withPrivate: true});
  const uniqueTypes = [...new Set((activities ?? []).map(({sport_type}) => sport_type))];

  const handleCommuteToggle = () => onWithCommuteChange(true === withCommute ? 'only' : true);
  const handleTypeChange = (values: string[]) => onTypesChange(values as ActivityType[]);
  const handleIconClick = (type: ActivityType) => (event: MouseEvent) => {
    onTypesChange([type]);
    event.preventDefault();
  };

  return (
    <>
      <Checkbox
        title="Commute only"
        size="lg"
        checked={'only' === withCommute}
        onCheckedChange={handleCommuteToggle}
        icon={<TbBusStop />}
      />
      <CheckboxGroup
        value={null === types ? uniqueTypes : types}
        onValueChange={handleTypeChange}
        display="flex"
        flexDirection="row"
      >
        {uniqueTypes.map(type => (
          <Checkbox
            key={type}
            value={type}
            title={type}
            size="lg"
            icon={<ActivityIcon activityType={type} onDoubleClick={handleIconClick(type)} />}
          />
        ))}
      </CheckboxGroup>
    </>
  );
};

export {ActivityTypeFilter};

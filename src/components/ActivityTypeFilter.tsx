import {MouseEvent} from 'react';
import {CheckboxGroup} from '@chakra-ui/react';
import {Checkbox} from '../components/ui';
import {ActivityIcon} from '../components';
import {ActivityType} from '../models/strava';
import {useActivities} from '../hooks';

type ActivityTypeFilterProps = {
  types: ActivityType[] | null;
  onTypesChange: (newTypes: ActivityType[]) => void;
};

const ActivityTypeFilter = ({types, onTypesChange}: ActivityTypeFilterProps) => {
  const [activities] = useActivities({withPrivate: true});
  const uniqueTypes = [...new Set((activities ?? []).map(({sport_type}) => sport_type))];

  const handleTypeChange = (values: string[]) => onTypesChange(values as ActivityType[]);
  const handleIconClick = (type: ActivityType) => (event: MouseEvent) => {
    onTypesChange([type]);
    event.preventDefault();
  };

  return (
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
  );
};

export {ActivityTypeFilter};

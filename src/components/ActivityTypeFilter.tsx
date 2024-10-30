import {MouseEvent} from 'react';
import {CheckboxGroup} from '@chakra-ui/react';
import {Checkbox} from '../components/ui';
import {ActivityIcon} from '../components';
import {ActivityType} from '../models/strava';
import {useActivities} from '../hooks';
import {DEFAULT_TYPES} from '../models';

type ActivityTypeFilterProps = {
  types: ActivityType[];
  onTypesChange: (newTypes: ActivityType[]) => void;
};

const ActivityTypeFilter = ({types, onTypesChange}: ActivityTypeFilterProps) => {
  const [activities] = useActivities({withPrivate: true});
  const uniqueTypes = [...new Set([...DEFAULT_TYPES, ...(activities ?? []).map(({sport_type}) => sport_type).sort()])];

  const handleTypeChange = (values: string[]) => onTypesChange(values as ActivityType[]);
  const handleIconClick = (type: ActivityType) => (event: MouseEvent) => {
    onTypesChange([type]);
    event.preventDefault();
  };

  return (
    <CheckboxGroup
      value={types}
      onValueChange={handleTypeChange}
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
    >
      {uniqueTypes.map(type => (
        <Checkbox key={type} value={type} title={type}>
          <ActivityIcon activityType={type} onClick={handleIconClick(type)} />
        </Checkbox>
      ))}
    </CheckboxGroup>
  );
};

export {ActivityTypeFilter};

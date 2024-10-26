import {MouseEvent} from 'react';
import {CheckboxGroup, HStack, Icon} from '@chakra-ui/react';
import {Checkbox} from '../components/ui';
import {ActivityType} from '../models/strava';
import {useActivities} from '../hooks';
import {DEFAULT_TYPES, getActivityIcon} from '../models';

type ActivityTypeFilterProps = {
  types: ActivityType[];
  onTypesChange: (newTypes: ActivityType[]) => void;
};

const ActivityTypeFilter = ({types, onTypesChange}: ActivityTypeFilterProps) => {
  const [activities] = useActivities({withPrivate: true});
  const uniqueTypes = [...new Set([...DEFAULT_TYPES, ...(activities ?? []).map(({sport_type}) => sport_type).sort()])];

  const handleIconClick = (type: ActivityType) => (event: MouseEvent) => {
    onTypesChange([type]);
    event.preventDefault();
  };

  const handleTypeChange = (value: any) => onTypesChange(value); //TODO

  return (
    <HStack justifyContent="space-between">
      <CheckboxGroup value={types} onChange={handleTypeChange}>
        {uniqueTypes.map(type => (
          <Checkbox key={type} value={type} title={type}>
            <Icon onClick={handleIconClick(type)} as={getActivityIcon(type)} />
          </Checkbox>
        ))}
      </CheckboxGroup>
    </HStack>
  );
};

export {ActivityTypeFilter};

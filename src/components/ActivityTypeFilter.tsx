import {MouseEvent} from 'react';
import {CheckboxGroup} from '@chakra-ui/react';
import {Checkbox} from '../components/ui';
import {ActivityIcon} from '../components';
import {DEFAULT_TYPES} from '../models';
import {ActivityType} from '../models/strava';
import {useActivities} from '../hooks';

type ActivityTypeFilterProps = {
  types: ActivityType[];
  onTypesChange: (newTypes: ActivityType[]) => void;
};

const ActivityTypeFilter = ({types, onTypesChange}: ActivityTypeFilterProps) => {
  const [activities] = useActivities({withPrivate: true});
  const uniqueTypes = [...new Set([...DEFAULT_TYPES, ...(activities ?? []).map(({sport_type}) => sport_type)])];

  const handleTypeChange = (values: string[]) => onTypesChange(values as ActivityType[]);
  const handleIconClick = (type: ActivityType) => (event: MouseEvent) => {
    onTypesChange([type]);
    event.preventDefault();
  };

  return (
    <CheckboxGroup value={types} onValueChange={handleTypeChange} display="flex" flexDirection="row">
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

import {ReactNode} from 'react';
import {Badge, BadgeProps, Stat} from '@chakra-ui/react';
import {Activity, Athlete, DetailedActivity} from '../../models/strava';

type StatEntry = (
  activities: Activity[],
  activityMeta: Record<string, DetailedActivity>,
  athlete: Athlete
) => {
  label: ReactNode;
  helpText: ReactNode;
  value: ReactNode;
  info?: ReactNode;
};

const StatTrend = (props: BadgeProps & {up: boolean}) => (
  <Badge colorPalette={props.up ? 'green' : 'red'} gap="0" {...props}>
    {props.up ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
    {props.children}
  </Badge>
);

export {StatTrend};
export type {StatEntry};

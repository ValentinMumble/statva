import {useMemo, useState} from 'react';
import {Text} from '@chakra-ui/react';
import {Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivities} from '../../hooks';
import {useFtp} from '../../hooks/useFtp';
import {computeTSS} from '../../models';
import {Activity} from '../../models/strava';
import {GetFtp} from '../../models/ftp';

const CTL_DAYS = 42;
const ATL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type DayData = {
  date: string;
  timestamp: number;
  ctl: number;
  atl: number;
  tsb: number;
};

const buildTrainingLoad = (activities: Activity[], getFtp: GetFtp): DayData[] => {
  if (activities.length === 0) return [];

  const sorted = [...activities].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const startDate = new Date(sorted[0].start_date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const dailyLoad: Record<string, number> = {};
  for (const activity of sorted) {
    const day = new Date(activity.start_date).toISOString().split('T')[0];
    const tss = computeTSS(activity, getFtp(new Date(activity.start_date)));
    dailyLoad[day] = (dailyLoad[day] ?? 0) + (tss?.value ?? 0);
  }

  const ctlDecay = Math.exp(-1 / CTL_DAYS);
  const atlDecay = Math.exp(-1 / ATL_DAYS);

  let ctl = 0;
  let atl = 0;
  const result: DayData[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayKey = current.toISOString().split('T')[0];
    const load = dailyLoad[dayKey] ?? 0;

    ctl = ctl * ctlDecay + load * (1 - ctlDecay);
    atl = atl * atlDecay + load * (1 - atlDecay);

    result.push({
      date: dayKey,
      timestamp: current.getTime(),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });

    current.setTime(current.getTime() + MS_PER_DAY);
  }

  return result;
};

const TrainingLoadChart = () => {
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });
  const {getFtp} = useFtp();

  const data = useMemo(
    () => buildTrainingLoad(
      (activities ?? []).filter(a => a.weighted_average_watts || a.average_heartrate),
      getFtp,
    ),
    [activities, getFtp],
  );

  // Capture the cutoff once at mount so render stays pure (no Date.now() during render).
  const [sixMonthsAgo] = useState(() => Date.now() - 180 * MS_PER_DAY);
  const visibleData = useMemo(() => data.filter(d => d.timestamp >= sixMonthsAgo), [data, sixMonthsAgo]);

  if (data.length === 0) return <Text>No TSS data available</Text>;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={visibleData}>
        <defs>
          <linearGradient id="tsbGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64ED95" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#64ED95" stopOpacity={0} />
            <stop offset="50%" stopColor="#ED6464" stopOpacity={0} />
            <stop offset="100%" stopColor="#ED6464" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={ts => new Date(ts).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
        />
        <YAxis hide />
        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
        <Tooltip
          content={({payload, active}) => {
            if (!active || !payload?.[0]?.payload) return null;
            const d = payload[0].payload as DayData;
            return (
              <div style={{padding: '8px', background: 'rgba(0,0,0,0.85)', color: 'white', borderRadius: '4px', fontSize: '12px'}}>
                <div style={{marginBottom: '4px'}}>{d.date}</div>
                <div style={{color: '#6495ED'}}>Fitness (CTL): {d.ctl}</div>
                <div style={{color: '#ED9564'}}>Fatigue (ATL): {d.atl}</div>
                <div style={{color: d.tsb >= 0 ? '#64ED95' : '#ED6464'}}>Form (TSB): {d.tsb}</div>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="tsb" fill="url(#tsbGradient)" stroke="none" />
        <Line type="monotone" dataKey="ctl" stroke="#6495ED" strokeWidth={2} dot={false} name="Fitness (CTL)" />
        <Line type="monotone" dataKey="atl" stroke="#ED9564" strokeWidth={2} dot={false} name="Fatigue (ATL)" />
        <Line type="monotone" dataKey="tsb" stroke="#64ED95" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Form (TSB)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export {TrainingLoadChart};

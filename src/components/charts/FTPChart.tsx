import {useState} from 'react';
import {Button, Group, Input, Clipboard, IconButton, NumberInput} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useFtp, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {backup, formatPower, FTPTest} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const upsertFTPTest = getFetcher<void>('ftp_tests.set');

const formatRatio = (value: number): string => `${value.toFixed(1)} W/kg`;

const FTPChart = () => {
  const {locale} = useSettings();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState<number>();
  const [ftp, setFtp] = useState<number>();
  const {tests: ftpTests, refetch: refresh} = useFtp();

  const canSubmit = undefined !== weight && undefined !== ftp;

  const handleAdd = async () => {
    if (!canSubmit) return;

    const test: FTPTest = {
      id: self.crypto.randomUUID(),
      date: new Date(date),
      ftp,
      weight,
    };

    await upsertFTPTest(test);
    setWeight(undefined);
    setFtp(undefined);
    refresh();
  };

  const chart = useChart({
    data: [...ftpTests]
      .sort((testA, testB) => testA.date.getTime() - testB.date.getTime())
      .map(test => ({
        timestamp: test.date.getTime(),
        power: test.ftp,
        ratio: test.ftp / test.weight,
      })),
    series: [
      {name: 'power', color: 'orange.solid'},
      {name: 'ratio', color: 'yellow.solid'},
    ],
  });

  return (
    <>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data}>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              tickFormatter={timestamp =>
                new Date(timestamp).toLocaleDateString(locale, {month: 'short', year: '2-digit'})
              }
            />
            <YAxis
              yAxisId="power"
              domain={[150, 350]}
              stroke={chart.color('fg.muted')}
              width={70}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => formatPower(Number(value))}
            />
            <YAxis
              yAxisId="ratio"
              orientation="right"
              domain={[2, 4]}
              stroke={chart.color('fg.muted')}
              width={80}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => formatRatio(Number(value))}
            />
            <Tooltip
              cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
              isAnimationActive={false}
              content={({payload, active}) => {
                if (!active || !payload?.length) return null;

                const {timestamp, power, ratio} = payload[0].payload as {
                  timestamp: number;
                  power: number;
                  ratio: number;
                };

                return (
                  <ChartTooltip>
                    <div>{new Date(timestamp).toLocaleDateString(locale)}</div>
                    <div>{formatPower(power)}</div>
                    <div>{formatRatio(ratio)}</div>
                  </ChartTooltip>
                );
              }}
            />
            <Line
              yAxisId="power"
              dataKey={chart.key('power')}
              type="monotone"
              stroke={chart.color('orange.solid')}
              strokeWidth={4}
              dot={{r: 3}}
              isAnimationActive={false}
            />
            <Line
              yAxisId="ratio"
              dataKey={chart.key('ratio')}
              type="monotone"
              stroke={chart.color('yellow.solid')}
              strokeWidth={4}
              strokeDasharray="6 3"
              dot={{r: 3}}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Chart.Root>
      <Group marginBottom="20px">
        <Input type="date" size="sm" width="200px" value={date} onChange={({target}) => setDate(target.value)} />
        <NumberInput.Root size="sm" value={weight?.toString()} onValueChange={({value}) => setWeight(Number(value))}>
          <NumberInput.Control />
          <NumberInput.Input placeholder="Weight" />
        </NumberInput.Root>
        <NumberInput.Root size="sm" value={ftp?.toString()} onValueChange={({value}) => setFtp(Number(value))}>
          <NumberInput.Control />
          <NumberInput.Input placeholder="FTP" />
        </NumberInput.Root>
        <Button size="sm" variant="outline" disabled={!canSubmit} onClick={handleAdd}>
          Add
        </Button>
        <Clipboard.Root value={backup(ftpTests)}>
          <Clipboard.Trigger asChild={true}>
            <IconButton title="Backup" size="xs" variant="outline">
              <Clipboard.Indicator />
            </IconButton>
          </Clipboard.Trigger>
        </Clipboard.Root>
      </Group>
    </>
  );
};

export {FTPChart};

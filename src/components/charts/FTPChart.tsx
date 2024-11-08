import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Button, Group, Input} from '@chakra-ui/react';
import {ClipboardIconButton, ClipboardRoot, NumberInputField, NumberInputRoot} from '../../components/ui';
import {useFetcher, useFtp} from '../../hooks';
import {backup, formatPower, FTPTest, getOptions} from '../../models';

const options: ApexCharts.ApexOptions = {
  yaxis: [
    {
      labels: {
        formatter: formatPower,
      },
      min: 150,
      max: 350,
    },
    {
      opposite: true,
      labels: {
        formatter: (value: number) => `${value.toFixed(1)} W/kg`,
      },
      min: 2,
      max: 4,
    },
  ],
  colors: ['#e09200', '#ebcf6c'],
  fill: {type: 'gradient'},
};

const FTPChart = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState<number>();
  const [ftp, setFtp] = useState<number>();
  const [, ftpTests, refresh] = useFtp();
  const upsertFTPTest = useFetcher<void>('ftp_tests.set');

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

  const labels = ftpTests.map(({date}) => date.toLocaleDateString());
  const series = [
    {name: 'W', data: ftpTests.map(({ftp}) => ftp)},
    {name: 'W/kg', data: ftpTests.map(({ftp, weight}) => ftp / weight)},
  ];

  return (
    <>
      <Chart options={getOptions(labels, undefined, options)} series={series} type="line" height={400} />
      <Group marginBottom="20px">
        <Input type="date" size="sm" width="200px" value={date} onChange={({target}) => setDate(target.value)} />
        <NumberInputRoot size="sm" value={weight?.toString()} onValueChange={({value}) => setWeight(Number(value))}>
          <NumberInputField placeholder="Weight" />
        </NumberInputRoot>
        <NumberInputRoot size="sm" value={ftp?.toString()} onValueChange={({value}) => setFtp(Number(value))}>
          <NumberInputField placeholder="FTP" />
        </NumberInputRoot>
        <Button size="sm" variant="outline" disabled={!canSubmit} onClick={handleAdd}>
          Add
        </Button>
        <ClipboardRoot value={backup(ftpTests)}>
          <ClipboardIconButton />
        </ClipboardRoot>
      </Group>
    </>
  );
};

export {FTPChart};

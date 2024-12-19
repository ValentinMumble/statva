import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {FallEvent} from '../../models';
import {useLabels} from '../../hooks';

const FallEventCells = ({event}: EventCellsProps<FallEvent>) => {
  const [label] = useLabels();

  return (
    <>
      <Table.Cell>{label(event.bike, true)}</Table.Cell>
      <Table.Cell />
    </>
  );
};

export {FallEventCells};

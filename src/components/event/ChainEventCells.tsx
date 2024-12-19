import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {ChainEvent} from '../../models';
import {useLabels} from '../../hooks';

const ChainEventCells = ({event}: EventCellsProps<ChainEvent>) => {
  const [label] = useLabels();

  return (
    <>
      <Table.Cell>{label(event.bike, true)}</Table.Cell>
      <Table.Cell>{event.chain}</Table.Cell>
    </>
  );
};

export {ChainEventCells};

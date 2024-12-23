import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {ChainEvent} from '../../models';

const ChainEventCells = ({event}: EventCellsProps<ChainEvent>) => {
  return (
    <>
      <Table.Cell>{event.chain}</Table.Cell>
      <Table.Cell />
    </>
  );
};

export {ChainEventCells};

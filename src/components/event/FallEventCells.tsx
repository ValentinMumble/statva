import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {FallEvent} from '../../models';

const FallEventCells = ({event}: EventCellsProps<FallEvent>) => {
  return (
    <>
      <Table.Cell overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {event.description}
      </Table.Cell>
      <Table.Cell />
    </>
  );
};

export {FallEventCells};

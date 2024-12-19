import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {SaddleEvent} from '../../models';

const SaddleEventCells = ({event}: EventCellsProps<SaddleEvent>) => {
  return (
    <>
      <Table.Cell>
        {event.brand} {event.model}
      </Table.Cell>
      <Table.Cell>{event.width} mm</Table.Cell>
    </>
  );
};

export {SaddleEventCells};

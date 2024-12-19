import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {TireEvent} from '../../models';

const TireEventCells = ({event}: EventCellsProps<TireEvent>) => {
  return (
    <>
      <Table.Cell>
        {event.brand} {event.model}
      </Table.Cell>
      <Table.Cell>{event.width} mm</Table.Cell>
    </>
  );
};

export {TireEventCells};

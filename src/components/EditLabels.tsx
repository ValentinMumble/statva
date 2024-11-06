import {useEffect, useState} from 'react';
import {Button, Editable, EditableValueChangeDetails, IconButton, Table} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  toaster,
} from '../components/ui';
import {Labels} from '../models';
import {useLabels} from '../hooks';

const rowProps: Partial<Table.RowProps> = {
  width: '100%',
  display: 'table',
  tableLayout: 'fixed',
};

const EditLabels = () => {
  const [, initialLabels] = useLabels();
  const [labels, setLabels] = useState<Labels>(initialLabels);

  const handleValueChange =
    (key: string) =>
    ({value}: EditableValueChangeDetails) => {
      setLabels(labels => ({...labels, [key]: value}));
    };

  const handleRemove = (key: string) => async () => {
    toaster.create({title: `${key} removed (//TODO not implemented)`});
  };

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  return (
    <DialogRoot size="xl">
      <DialogTrigger asChild={true}>
        <Button title="Edit labels" variant="ghost" size="sm">
          🏷️
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle>Labels</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Table.Root size="sm" display="block" height="70vh" overflow="scroll">
            <Table.Body>
              {Object.entries(labels).map(([key, value]) => (
                <Table.Row key={key} {...rowProps}>
                  <Table.Cell>{key}</Table.Cell>
                  <Table.Cell>
                    <Editable.Root value={value} onValueChange={handleValueChange(key)}>
                      <Editable.Preview />
                      <Editable.Input />
                    </Editable.Root>
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    <IconButton variant="ghost" title="Remove label" size="xs" onClick={handleRemove(key)}>
                      <LuMinus />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

export {EditLabels};

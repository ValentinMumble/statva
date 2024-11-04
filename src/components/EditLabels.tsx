import {useEffect, useState} from 'react';
import {Button, Editable, EditableValueChangeDetails, Table} from '@chakra-ui/react';
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

const EditLabels = () => {
  const [, initialLabels] = useLabels();
  const [labels, setLabels] = useState<Labels>(initialLabels);

  const handleKeyChange =
    (oldKey: string, newValue: string) =>
    ({value}: EditableValueChangeDetails) => {
      setLabels(labels => {
        const newLabels = {...labels, [value]: newValue};
        delete newLabels[oldKey];

        return newLabels;
      });
    };

  const handleValueChange =
    (key: string) =>
    ({value}: EditableValueChangeDetails) => {
      setLabels(labels => ({...labels, [key]: value}));
    };

  const handleSave = async () => {
    //TODO implement this
    // await fetch(`${import.meta.env.VITE_SERVER_URL}/labels`, {
    //   method: 'POST',
    //   body: JSON.stringify(labels),
    // });

    toaster.create({title: '🏷️ Labels saved'});
  };

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  const isDirty = JSON.stringify(initialLabels) !== JSON.stringify(labels);

  return (
    <DialogRoot size="xl">
      <DialogTrigger>
        <Button title="Edit labels" variant="ghost" size="sm">
          🏷️
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle>Labels</DialogTitle>
          <Button disabled={!isDirty} onClick={handleSave}>
            Save
          </Button>
        </DialogHeader>
        <DialogBody>
          <Table.Root size="sm">
            <Table.Body>
              {Object.entries(labels).map(([key, value]) => (
                <Table.Row key={key}>
                  <Table.Cell>
                    <Editable.Root value={key} onValueChange={handleKeyChange(key, value)}>
                      <Editable.Preview />
                      <Editable.Input />
                    </Editable.Root>
                  </Table.Cell>
                  <Table.Cell>
                    <Editable.Root value={value} onValueChange={handleValueChange(key)}>
                      <Editable.Preview />
                      <Editable.Input />
                    </Editable.Root>
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

import {useState} from 'react';
import {Button, Editable, EditableValueChangeDetails, IconButton, Table} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  toaster,
} from '../components/ui';
import {useLabels} from '../hooks';
import {deleteLabel, setLabel} from '../redis';

const rowProps: Partial<Table.RowProps> = {
  width: '100%',
  display: 'table',
  tableLayout: 'fixed',
};

const EditLabels = () => {
  const [newKey, setNewKey] = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('');
  const [, labels, refreshLabels] = useLabels();

  const handleLabelSave =
    (key: string) =>
    async ({value}: EditableValueChangeDetails) => {
      if (value === labels[key]) return;

      await setLabel(key, value);
      refreshLabels();
      setNewKey('');
      setNewLabel('');

      toaster.create({title: `🆙 ${key} updated`});
    };

  const handleRemove = (key: string) => async () => {
    await deleteLabel(key);
    refreshLabels();

    toaster.create({title: `🗑️ ${key} removed`});
  };

  return (
    <DialogRoot size="xl">
      <DialogTrigger asChild={true}>
        <Button title="Edit labels" variant="ghost" size="sm">
          🏷️
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle>{Object.keys(labels).length} labels</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Table.Root size="sm" display="block" height="75vh" overflow="scroll">
            <Table.Body>
              <Table.Row {...rowProps}>
                <Table.Cell>
                  <Editable.Root placeholder="New key" value={newKey} onValueChange={({value}) => setNewKey(value)}>
                    <Editable.Preview />
                    <Editable.Input />
                  </Editable.Root>
                </Table.Cell>
                <Table.Cell>
                  <Editable.Root
                    submitMode="enter"
                    placeholder="New label"
                    value={newLabel}
                    disabled={'' === newKey}
                    onValueChange={({value}) => setNewLabel(value)}
                    onValueCommit={handleLabelSave(newKey)}
                  >
                    <Editable.Preview />
                    <Editable.Input />
                  </Editable.Root>
                </Table.Cell>
                <Table.Cell />
              </Table.Row>
              {Object.entries(labels).map(([key, value]) => (
                <Table.Row key={key} {...rowProps}>
                  <Table.Cell>{key}</Table.Cell>
                  <Table.Cell>
                    <Editable.Root defaultValue={value} submitMode="enter" onValueCommit={handleLabelSave(key)}>
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

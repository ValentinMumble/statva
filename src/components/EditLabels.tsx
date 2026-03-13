import {useState} from 'react';
import {
  Button,
  Editable,
  EditableValueChangeDetails,
  IconButton,
  Table,
  Clipboard,
  Dialog,
  Portal,
} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {toaster} from '../components/ui';
import {useLabels} from '../hooks';
import {getFetcher} from '../hooks/useFetcher';

const upsertLabel = getFetcher<void>('labels.set');
const deleteLabel = getFetcher<void>('labels.delete');

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

      await upsertLabel(key, value);
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
    <Dialog.Root size="xl">
      <Dialog.Trigger asChild={true}>
        <Button title="Edit labels" variant="ghost" size="sm">
          🏷️
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header display="flex" alignItems="center" justifyContent="space-between">
              <Dialog.Title>{Object.keys(labels).length} labels 🏷️</Dialog.Title>
              <Clipboard.Root value={JSON.stringify(labels)}>
                <Clipboard.Trigger asChild={true}>
                  <Button variant="outline">
                    <Clipboard.Indicator />
                    Backup
                  </Button>
                </Clipboard.Trigger>
              </Clipboard.Root>
            </Dialog.Header>
            <Dialog.Body>
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
                        placeholder="🏷️"
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
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export {EditLabels};

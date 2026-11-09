import {Button, HStack, Input, Stack, Text} from '@chakra-ui/react';
import {LuCopy, LuSend} from 'react-icons/lu';
import {toaster} from '../../components/ui';

type ShareLinkProps = {
  url: string;
  title: string;
  // The ride changed since this link was made: Copy and Send make a new one first.
  stale?: boolean;
  // Makes a link for the ride as it is now, and gives it.
  renew?: () => Promise<string>;
  // A word under the link in place of the usual one, such as whether changes are saved.
  note?: string;
};

/**
 * The link to a shared ride, to copy or send. Sending opens the phone's share sheet. Once the
 * ride changes (day, start, speed, stops, direction), copying or sending makes a fresh link.
 */
const ShareLink = ({url, title, stale = false, renew = async () => url, note}: ShareLinkProps) => {
  const copy = async () => {
    try {
      if (stale) {
        // Safari only lets a click write to the clipboard straight away: the item waits for the link.
        const made = (async () => new Blob([await renew()], {type: 'text/plain'}))();
        await navigator.clipboard.write([new ClipboardItem({'text/plain': made})]);
      } else {
        await navigator.clipboard.writeText(url);
      }
      toaster.create({title: stale ? 'New link copied' : 'Link copied'});
    } catch {
      toaster.create({title: 'The link could not be copied', description: 'Try again in a moment.'});
    }
  };
  const send = async () => {
    try {
      await navigator.share({url: stale ? await renew() : url, title});
    } catch {
      // Closed without sending, or the new link took too long for the share sheet: the box
      // now holds it, so Send works on the next press.
    }
  };

  return (
    <Stack gap="6px">
      <HStack width="full">
        <Input value={url} readOnly={true} onFocus={({target}) => target.select()} opacity={stale ? 0.5 : 1} />
        <Button variant="outline" onClick={copy}>
          <LuCopy /> Copy
        </Button>
        {'share' in navigator && (
          <Button colorPalette="brand" onClick={send}>
            <LuSend /> Send
          </Button>
        )}
      </HStack>
      <Text fontSize="xs" color="fg.muted">
        {note ??
          (stale
            ? 'Changed since this link was made: Copy or Send makes a new one with your changes.'
            : 'Anyone with the link sees this ride for 15 days, with a fresh forecast, without logging in.')}
      </Text>
    </Stack>
  );
};

export {ShareLink};

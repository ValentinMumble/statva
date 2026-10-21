import {ReactNode} from 'react';
import {HStack, NativeSelect, Span, Stack, Text} from '@chakra-ui/react';

type PanelProps = {title: string; note?: string; action?: ReactNode; children: ReactNode};

/** A titled card for one chart or list, with an optional control on the right of the title. */
const Panel = ({title, note, action, children}: PanelProps) => (
  <Stack
    gap="12px"
    background="bg.panel"
    borderWidth="1px"
    borderRadius="card"
    padding={{base: '16px', md: '20px'}}
    minWidth="0"
  >
    <HStack
      justifyContent="space-between"
      alignItems={undefined === action ? 'baseline' : 'center'}
      gap="10px"
      flexWrap="wrap"
    >
      <Text fontFamily="heading" fontWeight="semibold">
        {title}
      </Text>
      {(undefined !== note || undefined !== action) && (
        <HStack gap="10px" minWidth="0">
          {undefined !== note && (
            <Text fontSize="xs" color="fg.muted">
              {note}
            </Text>
          )}
          {action}
        </HStack>
      )}
    </HStack>
    {children}
  </Stack>
);

type ReadoutProps = {value: string; unit?: string; caption: string};

/** One big figure in its own card. */
const Readout = ({value, unit, caption}: ReadoutProps) => (
  <Stack gap="0" background="bg.panel" borderWidth="1px" borderRadius="card" padding="14px 16px" minWidth="0">
    <Text fontFamily="figure" fontSize="2xl" fontWeight="semibold" lineHeight="1.15" truncate={true}>
      {value}
      {undefined !== unit && (
        <Span fontSize="sm" color="fg.muted" fontWeight="normal">
          {' '}
          {unit}
        </Span>
      )}
    </Text>
    <Text fontSize="xs" color="fg.muted">
      {caption}
    </Text>
  </Stack>
);

type FigureProps = ReadoutProps & {detail?: string};

/** A big figure without a card of its own, for use inside a panel. */
const Figure = ({value, unit, caption, detail}: FigureProps) => (
  <Stack gap="0" minWidth="0">
    <Text fontFamily="figure" fontSize="2xl" fontWeight="semibold" lineHeight="1.15" truncate={true}>
      {value}
      {undefined !== unit && (
        <Span fontSize="sm" color="fg.muted" fontWeight="normal">
          {' '}
          {unit}
        </Span>
      )}
    </Text>
    <Text fontSize="xs" color="fg.muted">
      {caption}
    </Text>
    {undefined !== detail && (
      <Text fontSize="xs" color="fg.subtle">
        {detail}
      </Text>
    )}
  </Stack>
);

type YearSelectProps = {years: number[]; value: number; onChange: (year: number) => void};

const YearSelect = ({years, value, onChange}: YearSelectProps) => (
  <NativeSelect.Root size="xs" width="auto">
    <NativeSelect.Field aria-label="Year" value={String(value)} onChange={({target}) => onChange(Number(target.value))}>
      {years.map(year => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </NativeSelect.Field>
    <NativeSelect.Indicator />
  </NativeSelect.Root>
);

export {Figure, Panel, Readout, YearSelect};

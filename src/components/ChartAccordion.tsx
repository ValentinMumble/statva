import {Suspense, useState} from 'react';
import {Accordion, Badge, Span, Spinner} from '@chakra-ui/react';
import {ACCORDION_ITEMS, CHART_GROUPS} from './chart-accordion-items';

const ChartFallback = () => <Spinner size="lg" margin={8} />;

/**
 * Charts by group, so the list starts as six lines rather than thirty. Only the chart
 * that is open renders, which is what keeps the heavy ones off the page until asked for.
 */
const ChartAccordion = () => {
  const [openGroups, setOpenGroups] = useState<string[]>([CHART_GROUPS[0]]);
  const [openCharts, setOpenCharts] = useState<string[]>([ACCORDION_ITEMS[0].label]);

  return (
    <Accordion.Root multiple={true} value={openGroups} onValueChange={({value}) => setOpenGroups(value)}>
      {CHART_GROUPS.map(group => {
        const items = ACCORDION_ITEMS.filter(item => group === item.group);

        return (
          <Accordion.Item key={group} value={group}>
            <Accordion.ItemTrigger outline={0}>
              <Span flex={1} fontWeight="medium">
                {group}
              </Span>
              <Badge size="xs" variant="surface">
                {items.length}
              </Badge>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent padding={0}>
              {openGroups.includes(group) && (
                <Accordion.Root multiple={true} value={openCharts} onValueChange={({value}) => setOpenCharts(value)}>
                  {items.map(item => (
                    <Accordion.Item key={item.label} value={item.label}>
                      <Accordion.ItemTrigger outline={0} paddingLeft="12px">
                        <Span flex={1} fontSize="sm">
                          {item.label}
                        </Span>
                        <Accordion.ItemIndicator />
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent padding={0} fontSize=".8em">
                        {openCharts.includes(item.label) && (
                          <Suspense fallback={<ChartFallback />}>{item.component}</Suspense>
                        )}
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              )}
            </Accordion.ItemContent>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
};

export {ChartAccordion};

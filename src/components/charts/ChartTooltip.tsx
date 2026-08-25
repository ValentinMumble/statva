import {ReactNode} from 'react';

type ChartTooltipProps = {
  children: ReactNode;
};

// Shared tooltip surface for the Chakra/recharts charts, so every chart renders
// the same box instead of re-inlining the styles.
const ChartTooltip = ({children}: ChartTooltipProps) => (
  <div
    style={{
      padding: '8px',
      background: 'rgba(0,0,0,0.85)',
      color: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      lineHeight: 1.5,
    }}
  >
    {children}
  </div>
);

export {ChartTooltip};

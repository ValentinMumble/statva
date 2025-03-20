import {Badge, type BadgeProps, Stat as ChakraStat, FormatNumber, IconButton} from '@chakra-ui/react';
import {ToggleTip} from './toggle-tip';
import {forwardRef} from 'react';
import {HiOutlineInformationCircle} from 'react-icons/hi';

interface StatLabelProps extends ChakraStat.LabelProps {
  info?: React.ReactNode;
}

export const StatLabel = forwardRef<HTMLDivElement, StatLabelProps>(function StatLabel(props, ref) {
  const {info, children, ...rest} = props;
  return (
    <ChakraStat.Label {...rest} ref={ref}>
      {children}
      {info && (
        <ToggleTip content={info}>
          <IconButton variant="ghost" aria-label="info" size="2xs">
            <HiOutlineInformationCircle />
          </IconButton>
        </ToggleTip>
      )}
    </ChakraStat.Label>
  );
});

interface StatValueTextProps extends ChakraStat.ValueTextProps {
  value?: number;
  formatOptions?: Intl.NumberFormatOptions;
}

export const StatValueText = forwardRef<HTMLDivElement, StatValueTextProps>(function StatValueText(props, ref) {
  const {value, formatOptions, children, ...rest} = props;
  return (
    <ChakraStat.ValueText {...rest} ref={ref}>
      {children || (value != null && <FormatNumber value={value} {...formatOptions} />)}
    </ChakraStat.ValueText>
  );
});

export const StatTrend = forwardRef<HTMLDivElement, BadgeProps & {up: boolean}>(function StatUpTrend(props, ref) {
  return (
    <Badge colorPalette={props.up ? 'green' : 'red'} gap="0" {...props} ref={ref}>
      {props.up ? <ChakraStat.UpIndicator /> : <ChakraStat.DownIndicator />}
      {props.children}
    </Badge>
  );
});

export const StatRoot = ChakraStat.Root;
export const StatHelpText = ChakraStat.HelpText;
export const StatValueUnit = ChakraStat.ValueUnit;

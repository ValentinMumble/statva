import {range} from '../models';
import {Slider, SliderProps} from '../components/ui';

const BOUNDARIES = [2015, new Date().getFullYear()];
const EXCLUDED_YEARS = [2020, 2021, 2022];

type YearRangeSliderProps = {
  value: number[];
  min?: number;
  onChange: (newValue: number[]) => void;
} & Omit<SliderProps, 'value' | 'onChange'>;

const YearRangeSlider = ({value, onChange, min, ...rest}: YearRangeSliderProps) => {
  value = 0 === value.length ? BOUNDARIES : value;

  return (
    <Slider
      width="full"
      size="sm"
      value={value}
      onValueChangeEnd={({value}) => onChange(value)}
      min={min ?? BOUNDARIES.at(0)}
      max={BOUNDARIES.at(-1)}
      marks={range(BOUNDARIES.at(0), BOUNDARIES.at(-1))
        .filter(year => !EXCLUDED_YEARS.includes(year))
        .map(year => ({label: year, value: year}))}
      {...rest}
    />
  );
};

export {YearRangeSlider};

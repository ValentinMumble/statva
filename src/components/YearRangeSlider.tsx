import {range} from '../models';
import {Slider} from '../components/ui';

const BOUNDARIES = [2015, new Date().getFullYear()];

type YearRangeSliderProps = {
  value: number[];
  onChange: (newValue: number[]) => void;
};

const YearRangeSlider = ({value, onChange}: YearRangeSliderProps) => {
  value = 0 === value.length ? BOUNDARIES : value;

  return (
    <Slider
      margin="5px 15px 30px"
      width="calc(100% - 30px)"
      value={value}
      onValueChange={e => onChange(e.value)}
      min={BOUNDARIES.at(0)}
      max={BOUNDARIES.at(-1)}
      step={1}
      marks={range(BOUNDARIES.at(0), BOUNDARIES.at(-1))}
    />
  );
};

export {YearRangeSlider};

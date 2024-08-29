import {
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  RangeSliderMark,
} from '@chakra-ui/react';
import {range} from '../models';

const BOUNDARIES = [2015, new Date().getFullYear()];

type YearRangeSliderProps = {
  value: number[];
  onChange: (newValue: number[]) => void;
};

const YearRangeSlider = ({value, onChange}: YearRangeSliderProps) => {
  value = 0 === value.length ? BOUNDARIES : value;

  return (
    <RangeSlider
      margin="5px 15px 30px"
      width="calc(100% - 30px)"
      value={value}
      onChange={onChange}
      min={BOUNDARIES.at(0)}
      max={BOUNDARIES.at(-1)}
      step={1}
    >
      <RangeSliderTrack>
        <RangeSliderFilledTrack />
      </RangeSliderTrack>
      <RangeSliderThumb boxSize={5} index={0} />
      <RangeSliderThumb boxSize={5} index={1} />
      {range(BOUNDARIES.at(0), BOUNDARIES.at(-1)).map(year => (
        <RangeSliderMark mt={3} ml={-5} key={year} value={year}>
          {year}
        </RangeSliderMark>
      ))}
    </RangeSlider>
  );
};

export {YearRangeSlider};

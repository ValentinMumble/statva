/**
 * Tyre pressure from Frank Berto's 15% tyre drop: the pressure at which a tyre squashes by
 * 15% of its height under its wheel's load, a balance of speed, comfort and grip. Berto
 * published it as a chart; this is a fit of that chart, P = 600·L/W² + 0.75·W − 25 (psi,
 * with L the load on the wheel in lb and W the measured tyre width in mm), within about
 * 2 psi from 23 to 37 mm and drifting high below 23 mm. Tubeless tyres run a little lower.
 */

const LB_PER_KG = 2.2046226218;
const BAR_PER_PSI = 0.0689476;
// The usual split of rider and bike over the wheels, the rear carrying more.
const FRONT_SHARE = 0.45;
// Tubeless tyres need 8 to 15% less: the low end, to stay on the safe side.
const TUBELESS_FACTOR = 0.92;
// Below this the fit reads 10 to 15 psi high.
const NARROWEST_WIDTH_MM = 23;

type TyreWidths = {front: number; rear: number};
type TyrePressure = {front: number; rear: number; frontPsi: number; rearPsi: number; outOfRange: boolean};

/** The widths a tyre change was logged with: "28", or "30/32" for a narrower front tyre. Null when there is no number. */
const tyreWidths = (logged: string | number | undefined): TyreWidths | null => {
  const [front, rear = front] = (String(logged ?? '').match(/\d+(\.\d+)?/g) ?? []).map(Number);

  return undefined === front ? null : {front, rear};
};

/** Berto's 15% drop pressure, in psi, for one wheel. */
const bertoPsi = (loadKg: number, widthMm: number): number => {
  const width = Math.max(widthMm, NARROWEST_WIDTH_MM);

  return (600 * loadKg * LB_PER_KG) / (width * width) + 0.75 * width - 25;
};

/** Front and rear pressure, in bar (to 0.1) and psi, for the total weight (rider, bike and kit) on tyres of those widths. */
const tyrePressure = (totalKg: number, widths: TyreWidths, tubeless: boolean): TyrePressure => {
  const factor = tubeless ? TUBELESS_FACTOR : 1;
  const frontPsi = bertoPsi(totalKg * FRONT_SHARE, widths.front) * factor;
  const rearPsi = bertoPsi(totalKg * (1 - FRONT_SHARE), widths.rear) * factor;

  return {
    front: Math.round(frontPsi * BAR_PER_PSI * 10) / 10,
    rear: Math.round(rearPsi * BAR_PER_PSI * 10) / 10,
    frontPsi: Math.round(frontPsi),
    rearPsi: Math.round(rearPsi),
    outOfRange: Math.min(widths.front, widths.rear) < NARROWEST_WIDTH_MM,
  };
};

export {tyrePressure, tyreWidths};
export type {TyrePressure, TyreWidths};
